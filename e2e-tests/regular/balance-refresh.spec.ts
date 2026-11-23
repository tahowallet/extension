import { Page } from "@playwright/test"
import { test, expect } from "../utils"
import FakeChain, {
  ETHEREUM_CHAIN_ID,
  TOKEN_ADDRESSES,
  TOKEN_COUNT,
  symbolOf,
} from "../utils/fake-chain"
import WorkerControl from "../utils/worker-control"

// The wallet's requests from its service worker are only visible to
// Playwright with this set. CI sets it for the whole run.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ??= "1"

/**
 * These tests watch when the wallet sweeps balances across MV3 service worker
 * restarts. Every server is faked, and the fake counts the `balanceOf` calls
 * in each Multicall3 request, which is how a full scan of the token lists
 * (every fixture token) is told apart from a check of tracked tokens only.
 */
const ACCOUNT = "0x9d373acbe8540895fa1752ab463ab31bbab2b38f"
const HELD_TOKEN = TOKEN_ADDRESSES[7]
const HELD_AMOUNT = 5n * 10n ** 18n

const MINUTE_MS = 60_000

/** Alarms can fire late, so waits are generous. */
const ALARM_WAIT_MS = 2.5 * MINUTE_MS

const isFullScan = (tokens: string[]) => tokens.length === TOKEN_COUNT

test.describe("Balance refresh across service worker restarts", () => {
  let chain: FakeChain
  let worker: WorkerControl

  /** Token balance rows for the account on Ethereum. */
  const tokenRows = async () =>
    (await worker.balanceRows()).filter(
      ({ token, chainID }) =>
        token !== undefined && chainID === String(ETHEREUM_CHAIN_ID),
    )

  /** Resolves once no new multicall has arrived for a while. */
  const settle = async () => {
    let seen = -1
    await expect
      .poll(
        async () => {
          const settled = chain.multicalls.length === seen
          seen = chain.multicalls.length
          await new Promise((resolve) => setTimeout(resolve, 3000))
          return settled && seen > 0
        },
        { timeout: 60_000, intervals: [100] },
      )
      .toBe(true)
  }

  test.beforeEach(
    async ({
      context,
      page,
      walletPageHelper,
      extensionId,
      backgroundPage,
    }) => {
      test.setTimeout(6 * MINUTE_MS)

      chain = await FakeChain.install(context)
      chain.setTokenBalance(HELD_TOKEN, HELD_AMOUNT)
      worker = new WorkerControl(context, page, extensionId)

      await walletPageHelper.onboarding.addReadOnlyAccount(ACCOUNT)
      await walletPageHelper.setViewportSize()
      await walletPageHelper.goToStartPage()

      await expect(await backgroundPage.evaluate(() => true)).toBe(true)
      await expect
        .poll(async () =>
          (await tokenRows()).some(({ token }) => token === HELD_TOKEN),
        )
        .toBe(true)
      await settle()
    },
  )

  test.afterEach(() => {
    expect(chain.unhandled).toEqual([])
  })

  test("The initial sweep scans the token list once", async () => {
    const full = chain.multicallsSince(0).filter((m) => isFullScan(m.tokens))

    expect(full).toHaveLength(1)
    expect(full[0].holder).toBe(ACCOUNT)
    expect(await tokenRows()).toMatchObject([
      { token: HELD_TOKEN, amount: HELD_AMOUNT },
    ])
  })

  test("Restarting the worker doesn't scan the token list or reset alarms", async ({
    page,
  }) => {
    const calls = chain.multicalls.length
    const rows = (await worker.balanceRows()).length
    const before = await worker.alarms()
    const names = before.map(({ name }) => name).sort()

    await page.goto("about:blank")

    for (let restart = 0; restart < 3; restart += 1) {
      const startedAt = await worker.startedAt()

      // oxlint-disable-next-line no-await-in-loop
      await worker.stop()
      // oxlint-disable-next-line no-await-in-loop
      await worker.wakeWithMessage(page)
      // oxlint-disable-next-line no-await-in-loop
      await expect.poll(() => worker.startedAt()).not.toBe(startedAt)
      // Time for any start-up sweep to show itself.
      // oxlint-disable-next-line no-await-in-loop
      await page.waitForTimeout(4000)
      // oxlint-disable-next-line no-await-in-loop
      await page.goto("about:blank")
    }

    expect(chain.multicalls.length).toBe(calls)
    expect((await worker.balanceRows()).length).toBe(rows)

    const after = await worker.alarms()

    expect(after.map(({ name }) => name).sort()).toEqual(names)
    for (const alarm of after) {
      const old = before.find(({ name }) => name === alarm.name)
      const periodMs = (alarm.periodInMinutes ?? 0) * MINUTE_MS
      // An alarm that ran in the meantime moved on by whole periods; a
      // re-created one starts again from now.
      const moved = alarm.scheduledTime - (old?.scheduledTime ?? 0)
      expect(moved, alarm.name).toBeGreaterThanOrEqual(0)
      expect(
        Math.abs(moved - Math.round(moved / periodMs) * periodMs),
        alarm.name,
      ).toBeLessThan(2000)
    }
  })

  test("An alarm that wakes a stopped worker is handled", async ({ page }) => {
    const calls = chain.multicalls.length
    await page.goto("about:blank")

    const startedAt = await worker.startedAt()
    const due = await worker.fireAlarmSoon("balanceAllAccounts", {
      stopWorker: true,
    })

    await expect
      .poll(
        () => chain.multicallsSince(calls).some((m) => isFullScan(m.tokens)),
        {
          timeout: 60_000,
        },
      )
      .toBe(true)

    expect(await worker.startedAt()).not.toBe(startedAt)
    expect(
      chain.multicallsSince(calls).filter((m) => isFullScan(m.tokens)),
    ).toHaveLength(1)
    const next = (await worker.alarms()).find(
      ({ name }) => name === "balanceAllAccounts",
    )
    // The alarm ran on its schedule and carried on from there, instead of
    // being re-created when the worker started.
    expect(
      Math.abs((next?.scheduledTime ?? 0) - (due + 60 * MINUTE_MS)),
    ).toBeLessThan(100)
  })

  test("The active account sweep checks tracked tokens only", async ({
    page,
  }) => {
    // The account is active while the popup is open.
    await expect(page.getByTestId("asset_list_item").first()).toBeVisible()
    const calls = chain.multicalls.length

    await expect
      .poll(() => chain.multicallsSince(calls).length, {
        timeout: ALARM_WAIT_MS,
      })
      .toBeGreaterThan(0)

    const [sweep] = chain.multicallsSince(calls)
    expect(sweep.tokens).toEqual([HELD_TOKEN])
    expect(sweep.tokens).toEqual(await worker.trackedTokens())
    expect(sweep.tokens.length).toBeLessThan(TOKEN_COUNT)
  })

  test("A zero balance is recorded once, when it replaces a held one", async ({
    page,
  }) => {
    // The full sweep left one row, not one per token in the list.
    expect(await tokenRows()).toHaveLength(1)
    await expect(assetRow(page, HELD_TOKEN)).toBeVisible()

    chain.setTokenBalance(HELD_TOKEN, 0n)
    const calls = chain.multicalls.length
    await worker.fireAlarmSoon("balanceAllAccounts")

    await expect
      .poll(async () => (await tokenRows()).filter((r) => r.amount === 0n))
      .toHaveLength(1)
    expect(chain.multicallsSince(calls).some((m) => isFullScan(m.tokens))).toBe(
      true,
    )

    // The sweep after that has nothing new to say.
    const rows = await tokenRows()
    await worker.fireAlarmSoon("balanceAllAccounts")
    await expect
      .poll(
        () =>
          chain.multicallsSince(calls).filter((m) => isFullScan(m.tokens))
            .length,
      )
      .toBe(2)
    await settle()
    expect(await tokenRows()).toEqual(rows)

    await page.reload()
    await expect(page.getByTestId("asset_list_item").first()).toBeVisible()
    await expect(assetRow(page, HELD_TOKEN)).toHaveCount(0)
  })

  test("An idle account is refreshed, tracked tokens only, when it wakes up", async ({
    page,
  }) => {
    // Far enough from the next active sweep that it can't be the cause.
    await expect
      .poll(async () => {
        const alarm = (await worker.alarms()).find(
          ({ name }) => name === "balanceActiveAccounts",
        )
        return (alarm?.scheduledTime ?? 0) - Date.now()
      })
      .toBeGreaterThan(40_000)

    await page.goto("about:blank")
    await worker.stop()
    const calls = chain.multicalls.length

    await worker.wakeWithPopup(page)

    await expect
      .poll(() => chain.multicallsSince(calls).length, { timeout: 25_000 })
      .toBeGreaterThan(0)
    expect(chain.multicallsSince(calls).map((m) => m.tokens)).toEqual([
      [HELD_TOKEN],
    ])
  })
})

const assetRow = (page: Page, token: string) =>
  page.getByTestId("asset_list_item").filter({
    has: page.getByTestId("asset_symbol").getByText(symbolOf(token)),
  })
