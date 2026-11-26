import {
  BrowserContext,
  CDPSession,
  Page,
  Worker,
  expect,
} from "@playwright/test"

type AlarmInfo = {
  name: string
  periodInMinutes?: number
  scheduledTime: number
}

/** A balance row as stored in the `tally/indexing` database. */
export type BalanceRow = {
  address: string
  chainID: string
  /** Absent for the network's base asset. */
  token?: string
  amount: bigint
}

/**
 * Stops, wakes and inspects the extension's MV3 service worker.
 *
 * `ServiceWorker.stopAllWorkers` leaves an extension's worker running, so it
 * is stopped by version ID instead.
 */
export default class WorkerControl {
  constructor(
    private readonly context: BrowserContext,
    /** A page to open CDP sessions through. */
    private readonly page: Page,
    private readonly extensionId: string,
  ) {}

  /** The worker that is running now, once there is one. */
  async current(): Promise<Worker> {
    let found: Worker | undefined

    await expect
      .poll(async () => {
        const candidates = [...this.context.serviceWorkers()].reverse()
        for (const worker of candidates) {
          // oxlint-disable-next-line no-await-in-loop
          const alive = await worker.evaluate(() => true).catch(() => false)
          if (alive) {
            found = worker
            return true
          }
        }
        return false
      })
      .toBe(true)

    return found as Worker
  }

  /** When the running worker started, which differs for every wake. */
  async startedAt(): Promise<number> {
    return (await this.current()).evaluate(() => performance.timeOrigin)
  }

  /** Stops the worker and returns once Chrome reports it stopped. */
  async stop(): Promise<void> {
    const cdp = await this.context.newCDPSession(this.page)

    try {
      const versionID = new Promise<string>((resolve) => {
        cdp.on("ServiceWorker.workerVersionUpdated", ({ versions }) => {
          const ours = versions.find(({ scriptURL }) =>
            scriptURL.includes(this.extensionId),
          )
          if (ours?.runningStatus === "running") resolve(ours.versionId)
        })
      })
      const stopped = this.#nextStopped(cdp)

      await cdp.send("ServiceWorker.enable")
      await cdp.send("ServiceWorker.stopWorker", { versionId: await versionID })
      await stopped
    } finally {
      await cdp.detach().catch(() => {})
    }
  }

  #nextStopped(cdp: CDPSession): Promise<void> {
    return new Promise((resolve) => {
      cdp.on("ServiceWorker.workerVersionUpdated", ({ versions }) => {
        if (
          versions.some(
            ({ scriptURL, runningStatus }) =>
              scriptURL.includes(this.extensionId) &&
              runningStatus === "stopped",
          )
        ) {
          resolve()
        }
      })
    })
  }

  /**
   * Opens the popup in `page`, which wakes a stopped worker, and returns the
   * new worker once it answers.
   */
  async wakeWithPopup(page: Page): Promise<Worker> {
    await page.goto(`chrome-extension://${this.extensionId}/popup.html`)
    return this.current()
  }

  /**
   * Wakes the worker with a message from a page that isn't the popup, so the
   * wallet doesn't see the account in use.
   */
  async wakeWithMessage(page: Page): Promise<Worker> {
    await page.goto(`chrome-extension://${this.extensionId}/manifest.json`)
    await page.evaluate(() => chrome.runtime.sendMessage({}).catch(() => {}))
    return this.current()
  }

  async alarms(): Promise<AlarmInfo[]> {
    const worker = await this.current()
    return worker.evaluate(() => chrome.alarms.getAll())
  }

  /**
   * Moves an alarm's next run to a few seconds from now, keeping its period.
   * With `stopWorker`, the worker is stopped before the alarm is due, so the
   * alarm is what wakes it.
   */
  async fireAlarmSoon(
    name: string,
    { stopWorker = false, delayMs = 5000 } = {},
  ): Promise<number> {
    const worker = await this.current()

    const when = await worker.evaluate(
      async ([alarmName, delay]) => {
        const existing = await chrome.alarms.get(alarmName)
        const due = Date.now() + (delay as number)
        await chrome.alarms.create(alarmName, {
          when: due,
          periodInMinutes: existing?.periodInMinutes,
        })
        return due
      },
      [name, delayMs] as const,
    )

    if (stopWorker) {
      await this.stop()
    }

    return when
  }

  async balanceRows(): Promise<BalanceRow[]> {
    const worker = await this.current()
    const rows = await worker.evaluate(
      () =>
        new Promise<
          {
            address: string
            chainID: string
            token?: string
            amount: string
          }[]
        >((resolve, reject) => {
          const open = indexedDB.open("tally/indexing")
          open.onerror = () => reject(open.error)
          open.onsuccess = () => {
            const all = open.result
              .transaction("balances")
              .objectStore("balances")
              .getAll()
            all.onerror = () => reject(all.error)
            all.onsuccess = () => {
              open.result.close()
              resolve(
                all.result.map((row) => ({
                  address: row.address,
                  chainID: row.network.chainID,
                  token: row.assetAmount.asset.contractAddress,
                  amount: String(row.assetAmount.amount),
                })),
              )
            }
          }
        }),
    )

    return rows.map((row) => ({ ...row, amount: BigInt(row.amount) }))
  }

  /** Contract addresses of the tokens whose balances are checked often. */
  async trackedTokens(): Promise<string[]> {
    const worker = await this.current()
    return worker.evaluate(
      () =>
        new Promise<string[]>((resolve, reject) => {
          const open = indexedDB.open("tally/indexing")
          open.onerror = () => reject(open.error)
          open.onsuccess = () => {
            const all = open.result
              .transaction("assetsToTrack")
              .objectStore("assetsToTrack")
              .getAll()
            all.onerror = () => reject(all.error)
            all.onsuccess = () => {
              open.result.close()
              resolve(
                all.result.map((row) => row.contractAddress.toLowerCase()),
              )
            }
          }
        }),
    )
  }
}
