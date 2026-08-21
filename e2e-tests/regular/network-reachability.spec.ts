import { Locator, Page } from "@playwright/test"
import { test, expect } from "../utils"
import WalletPageHelper from "../utils/walletPageHelper"
import FakeRpc from "../utils/fake-rpc"

/**
 * These tests point a network at an RPC endpoint the test owns, then take it
 * away and watch the wallet notice.
 *
 * Avalanche is the network under test because Taho serves no managed endpoint
 * for it — `BOAR_RPC_URLS` covers chains 1, 10, 137, 42161, 11155111 and
 * 31612. On any of those the managed endpoint heads the provider's walk and
 * the walk never runs out, so nothing done to a stored endpoint could make the
 * chain unreachable.
 *
 * Detection deliberately waits out a floor — forty-five seconds without a
 * success — before calling a network unreachable, so the slow test here spends
 * about a minute getting there. `NETWORK_UNREACHABLE_FLOOR_SECONDS` can lower
 * that for a local run; CI tests the extension it publishes, at the floor it
 * ships with.
 */
const NETWORK_LABEL = "Avalanche"
const NETWORK_NAME = /^Avalanche$/
const NETWORK_CHAIN_ID = "43114"

/** A chain the endpoint can claim instead, to be rejected for it. */
const WRONG_CHAIN_ID = "137"

const EDIT_FORM_TITLE = "Edit network RPCs"
const REMOVE_RPC_LABEL = "Remove RPC URL"
const UNREACHABLE_LABEL = "Network connection problem"

const rpcRowsOf = (editForm: Locator): Locator =>
  editForm.locator(".rpc_url_row")

const saveButtonOf = (editForm: Locator): Locator =>
  editForm.getByRole("button", { name: "Save changes" })

const networkRowOf = (popup: Page): Locator =>
  popup
    .locator("li.custom_network_item")
    .filter({ has: popup.locator(".network_name", { hasText: NETWORK_NAME }) })

const goToNetworks = async (
  popup: Page,
  walletPageHelper: WalletPageHelper,
): Promise<void> => {
  await walletPageHelper.navigateTo("Settings")
  await popup
    .getByRole("button", { name: "Manage networks", exact: true })
    .click()
  await expect(
    popup.getByRole("heading", { name: "Manage networks", exact: true }),
  ).toBeVisible()
}

const openEditForm = async (popup: Page): Promise<Locator> => {
  await networkRowOf(popup)
    .getByRole("button", { name: "Edit network" })
    .click()

  const editForm = popup.getByTestId("slide_up_menu").filter({
    has: popup.getByRole("heading", { name: EDIT_FORM_TITLE }),
  })
  await expect(rpcRowsOf(editForm).first()).toBeVisible()

  return editForm
}

/** Leaves the endpoint list holding exactly the given URL. */
const setSoleRpcEndpoint = async (
  editForm: Locator,
  url: string,
): Promise<void> => {
  const rows = rpcRowsOf(editForm)

  if ((await rows.count()) > 1) {
    await rows.last().getByRole("button", { name: REMOVE_RPC_LABEL }).click()
    await setSoleRpcEndpoint(editForm, url)
    return
  }

  await rows.first().getByRole("textbox").fill(url)
}

/** Points the network at the fake endpoint and confirms the save took. */
const pointNetworkAtFakeRpc = async (
  popup: Page,
  url: string,
): Promise<void> => {
  const editForm = await openEditForm(popup)
  await setSoleRpcEndpoint(editForm, url)
  await saveButtonOf(editForm).click()
  await expect(popup.getByText("Network updated")).toBeVisible()
}

test.describe("Network reachability", () => {
  let rpc: FakeRpc

  test.beforeEach(async ({ walletPageHelper }) => {
    rpc = await FakeRpc.start(NETWORK_CHAIN_ID)

    await walletPageHelper.onboarding.addNewWallet()
    await walletPageHelper.goToStartPage()
    await walletPageHelper.setViewportSize()
  })

  test.afterEach(async () => {
    await rpc?.stop()
  })

  test("An endpoint is probed on save and rejected when it serves another chain", async ({
    page: popup,
    walletPageHelper,
  }) => {
    await goToNetworks(popup, walletPageHelper)

    await test.step("An endpoint answering for this chain is accepted", async () => {
      await pointNetworkAtFakeRpc(popup, rpc.url)
    })

    await test.step("An endpoint answering for another chain is not", async () => {
      await rpc.setChainID(WRONG_CHAIN_ID)

      const editForm = await openEditForm(popup)
      // Re-entering the same URL would be a no-op: only endpoints not already
      // stored are probed, so this has to be a URL the chain has not seen.
      await setSoleRpcEndpoint(editForm, `${rpc.url}/#other`)
      await saveButtonOf(editForm).click()

      const saveError = editForm.getByRole("alert")
      await expect(saveError).toContainText(
        `serves chain ID ${WRONG_CHAIN_ID}, not ${NETWORK_CHAIN_ID}`,
      )

      // The form stays open so the offending endpoint can be corrected.
      await expect(
        editForm.getByRole("heading", { name: EDIT_FORM_TITLE }),
      ).toBeVisible()
    })
  })

  test("A network that stops answering is reported, and recovers on its own", async ({
    page: popup,
    walletPageHelper,
  }) => {
    // Onboarding, a save round-trip, and two waits on the detection floor do
    // not fit the default per-test budget.
    test.setTimeout(5 * 60 * 1000)

    await goToNetworks(popup, walletPageHelper)
    await pointNetworkAtFakeRpc(popup, rpc.url)

    await walletPageHelper.goToStartPage()
    await walletPageHelper.switchNetwork(NETWORK_NAME)

    await test.step("Nothing is said while the endpoint answers", async () => {
      await expect(popup.getByLabel(UNREACHABLE_LABEL)).toBeHidden()
    })

    await test.step("A dark endpoint is reported on the wallet view", async () => {
      // Held open rather than refused, so the wallet has to time the request
      // out itself — the slower of the two failures, and the one likelier to
      // catch a missing timeout in our own code.
      await rpc.setMode("hanging")

      await expect(
        popup.getByText(`Taho can't reach ${NETWORK_LABEL}`),
      ).toBeVisible({ timeout: 150_000 })

      // The sigil on the network indicator, which is on screen throughout.
      await expect(popup.getByLabel(UNREACHABLE_LABEL).first()).toBeVisible()

      // A balance we cannot read is not reported as zero.
      const balance = popup.getByTestId("wallet_balance")
      await expect(balance).toContainText("—")
      await expect(balance).not.toContainText("$0")
    })

    await test.step("The network selector marks the offending row", async () => {
      await popup.getByTestId("top_menu_network_switcher").last().click()
      await expect(
        popup
          .locator("li")
          .filter({ hasText: NETWORK_LABEL })
          .getByLabel(UNREACHABLE_LABEL),
      ).toBeVisible()
    })

    await test.step("The send form says why it will not send", async () => {
      // The wallet view's Send shortcut only navigates; the gate is on the
      // form's own submit, and the warning beside it is what accounts for a
      // button that will not do anything.
      await walletPageHelper.goToStartPage()
      await popup.getByRole("button", { name: "Send", exact: true }).click()

      await expect(popup.getByLabel(UNREACHABLE_LABEL).last()).toBeVisible()
    })

    await test.step("It clears once the endpoint answers again", async () => {
      await rpc.setMode("answering")

      await walletPageHelper.goToStartPage()
      await expect(
        popup.getByText(`Taho can't reach ${NETWORK_LABEL}`),
      ).toBeHidden({ timeout: 150_000 })
      await expect(popup.getByLabel(UNREACHABLE_LABEL)).toBeHidden()
    })
  })
})
