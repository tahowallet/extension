import { Locator, Page } from "@playwright/test"
import { test, expect } from "../utils"
import WalletPageHelper from "../utils/walletPageHelper"

/**
 * These tests exercise the RPC endpoint editing flow for built-in networks
 * under Settings -> Manage networks.
 *
 * Saving hits the real network: the background probes every http(s) endpoint
 * with an `eth_chainId` POST before storing it. Rather than mock those probes,
 * these tests reuse endpoints the extension already ships as defaults, so the
 * probe is exercised end to end and the URLs are no less reliable than the ones
 * the wallet leans on for everything else. `context.route` interception of
 * service worker traffic does work here (see the posthog route in
 * `e2e-tests/utils.ts`), but only with
 * `PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1` set; mocking would
 * therefore silently stop testing the probe whenever that variable is missing.
 */
const ETHEREUM_RPC_URL = "https://eth.drpc.org"

/** A live Polygon endpoint, used to trigger a chain ID mismatch. */
const POLYGON_RPC_URL = "https://polygon.drpc.org"

const EDIT_FORM_TITLE = "Edit network RPCs"

/**
 * Origin of the Taho-managed (Boar) endpoint for Ethereum, from
 * BOAR_RPC_URL_ETHEREUM. Only the origin is rendered: the full URL embeds an
 * access key.
 */
const ETHEREUM_MANAGED_ORIGIN = "https://ethereum-mainnet.boar.network"
const MANAGED_TAG = "Taho"

/** Ethereum's block explorer, resolved from the UI's blockExplorer map. */
const ETHEREUM_BLOCK_EXPLORER = "https://etherscan.io"

/** A replacement explorer, used to prove built-in explorer edits persist. */
const ETHEREUM_CUSTOM_EXPLORER = "https://eth.blockscout.com"

/** An Alchemy-shaped endpoint, which should auto-check the Alchemy toggle. */
const ALCHEMY_RPC_URL = "https://eth-mainnet.g.alchemy.com/v2/demo"

/**
 * A second shipped-default Ethereum endpoint, used where a test needs a valid
 * URL that does not duplicate the first row's.
 */
const SECONDARY_ETHEREUM_RPC_URL = "https://1rpc.io/eth"

/** The Alchemy explainer, which only appears inside a tooltip on hover. */
const ALCHEMY_HINT_TEXT = "Check Alchemy APIs when an endpoint supports"
const REMOVE_RPC_LABEL = "Remove RPC URL"
const INVALID_RPC_URL_ERROR = "Must be a valid http(s) or ws(s) URL"
const DUPLICATE_RPC_URL_ERROR = "This endpoint is already listed"

/** The user-editable endpoint rows, which exclude Taho-managed ones. */
const rpcRowsOf = (editForm: Locator): Locator =>
  editForm.locator(".rpc_url_row")

/** The read-only rows for endpoints Taho provides for the chain. */
const managedRowsOf = (editForm: Locator): Locator =>
  editForm.locator(".managed_endpoint_row")

/** The panel header, which stays put while the form body scrolls. */
const panelHeaderOf = (editForm: Locator): Locator =>
  editForm.getByRole("heading", { name: EDIT_FORM_TITLE })

const saveButtonOf = (editForm: Locator): Locator =>
  editForm.getByRole("button", { name: "Save changes" })

const staticRowOf = (editForm: Locator, label: string): Locator =>
  editForm.locator(".static_row").filter({ hasText: label })

/** Scopes to the row for the network with the given name in the unified list. */
const networkRowOf = (popup: Page, networkName: RegExp): Locator =>
  popup
    .locator("li.custom_network_item")
    .filter({ has: popup.locator(".network_name", { hasText: networkName }) })

/**
 * Onboards a fresh wallet and lands on the Settings -> Manage networks page,
 * which lists built-in and custom networks together.
 */
const goToNetworks = async (
  popup: Page,
  walletPageHelper: WalletPageHelper,
): Promise<void> => {
  await walletPageHelper.onboarding.addNewWallet()
  await walletPageHelper.goToStartPage()
  await walletPageHelper.setViewportSize()

  await walletPageHelper.navigateTo("Settings")
  await popup
    .getByRole("button", { name: "Manage networks", exact: true })
    .click()

  await expect(
    popup.getByRole("heading", { name: "Manage networks", exact: true }),
  ).toBeVisible()
  // The single list sits directly under the page header now.
  await expect(
    popup.getByRole("heading", { name: "Manage chains" }),
  ).toBeHidden()
}

/**
 * Opens the RPC edit form for the built-in network with the given name and
 * resolves to a locator scoped to the slide-up hosting it.
 */
const openBuiltInNetworkEditForm = async (
  popup: Page,
  networkName: RegExp,
): Promise<Locator> => {
  await networkRowOf(popup, networkName)
    .getByRole("button", { name: "Edit network" })
    .click()

  const editForm = popup.getByTestId("slide_up_menu").filter({
    has: popup.getByRole("heading", { name: EDIT_FORM_TITLE }),
  })

  // The endpoint list is fetched from the background, so rows only show up once
  // that resolves.
  await expect(rpcRowsOf(editForm).first()).toBeVisible()

  return editForm
}

/**
 * Removes trailing RPC rows until a single one is left. Always targets the last
 * row so it does not depend on row indices, which shift as rows go away.
 */
const reduceToSingleRpcRow = async (editForm: Locator): Promise<void> => {
  const rpcRows = rpcRowsOf(editForm)

  if ((await rpcRows.count()) <= 1) {
    return
  }

  await rpcRows.last().getByRole("button", { name: REMOVE_RPC_LABEL }).click()
  await reduceToSingleRpcRow(editForm)
}

test.describe("Network RPC settings", () => {
  test("User can replace a built-in network's RPC endpoints and the change persists", async ({
    page: popup,
    walletPageHelper,
  }) => {
    await test.step("Open the networks list", async () => {
      await goToNetworks(popup, walletPageHelper)

      const ethereumRow = networkRowOf(popup, /^Ethereum$/)
      const polygonRow = networkRowOf(popup, /^Polygon$/)

      await expect(ethereumRow).toBeVisible()
      await expect(polygonRow).toBeVisible()

      // Built-in networks share the list with custom ones and are told apart
      // by their tag.
      await expect(ethereumRow.locator(".network_tag")).toHaveText("Built-in")
      await expect(polygonRow.locator(".network_tag")).toHaveText("Built-in")

      // Built-in networks are not removable, so they only offer editing.
      await expect(
        ethereumRow.getByRole("button", { name: "Edit network" }),
      ).toBeVisible()
      await expect(ethereumRow.locator(".actions button")).toHaveCount(1)
    })

    const editForm =
      await test.step("Open Ethereum's RPC edit form", async () => {
        const form = await openBuiltInNetworkEditForm(popup, /^Ethereum$/)

        await expect(
          form.getByRole("heading", { name: EDIT_FORM_TITLE }),
        ).toBeVisible()

        // A built-in network's metadata is bundled with the extension, so it
        // renders as static rows rather than inputs.
        await expect(staticRowOf(form, "Chain ID")).toContainText("1")
        await expect(staticRowOf(form, "Family")).toContainText("EVM")
        await expect(staticRowOf(form, "Network name")).toContainText(
          "Ethereum",
        )
        await expect(staticRowOf(form, "Currency symbol")).toContainText("ETH")
        await expect(staticRowOf(form, "Currency decimals")).toContainText("18")
        await expect(form.locator("#custom_network_name")).toHaveCount(0)
        await expect(
          form.locator("#custom_network_currency_symbol"),
        ).toHaveCount(0)

        // The block explorer is the one built-in field that is editable, so it
        // is an input prefilled from the seeded default, not a static row.
        await expect(staticRowOf(form, "Block explorer URL")).toHaveCount(0)
        const explorerInput = form.locator("#custom_network_block_explorer_url")
        await expect(explorerInput).toBeEditable()
        await expect(explorerInput).toHaveValue(ETHEREUM_BLOCK_EXPLORER)

        return form
      })

    await test.step("Taho-managed endpoints show read-only", async () => {
      const managedRow = managedRowsOf(editForm).filter({
        hasText: ETHEREUM_MANAGED_ORIGIN,
      })

      await expect(managedRow).toBeVisible()
      // Only the origin is rendered, never the key-bearing path.
      await expect(managedRow).toContainText(ETHEREUM_MANAGED_ORIGIN)
      await expect(managedRow.locator(".network_tag")).toHaveText(MANAGED_TAG)

      // Nothing about a managed row is editable or removable.
      await expect(managedRow.getByRole("textbox")).toHaveCount(0)
      await expect(managedRow.locator("input")).toHaveCount(0)
      await expect(managedRow.getByRole("button")).toHaveCount(0)

      // Managed rows are not part of the editable list.
      await expect(managedRowsOf(editForm).locator(".rpc_url_row")).toHaveCount(
        0,
      )

      // Taho's endpoint is the first choice, so it heads the list.
      await expect(
        editForm.locator(".managed_endpoint_row, .rpc_url_row").first(),
      ).toHaveClass(/managed_endpoint_row/)
    })

    await test.step("The Alchemy explainer is a tooltip, not a static line", async () => {
      await expect(editForm.getByText(ALCHEMY_HINT_TEXT)).toHaveCount(0)

      // It shows up on hovering the info icon beside the row's checkbox.
      await rpcRowsOf(editForm)
        .first()
        .locator('[data-testid="tooltip_wrap"]')
        .hover()

      await expect(editForm.getByText(ALCHEMY_HINT_TEXT)).toBeVisible()
    })

    await test.step("The panel header survives scrolling the form body", async () => {
      await expect(panelHeaderOf(editForm)).toBeVisible()

      // The form body scrolls, not the slide-up, so the header stays put.
      const scrolled = await editForm
        .locator(".edit_network")
        .evaluate((body) => {
          body.scrollTo(0, body.scrollHeight)
          return body.scrollTop > 0
        })

      expect(scrolled).toBe(true)
      await expect(panelHeaderOf(editForm)).toBeVisible()
      await expect(
        editForm.getByRole("button", { name: "Close menu" }),
      ).toBeVisible()
    })

    await test.step("Replace the endpoint list with a single endpoint", async () => {
      expect(await rpcRowsOf(editForm).count()).toBeGreaterThan(1)
      await reduceToSingleRpcRow(editForm)
      await expect(rpcRowsOf(editForm)).toHaveCount(1)

      await editForm
        .getByLabel("RPC URL 1", { exact: true })
        .fill(ETHEREUM_RPC_URL)

      // The checkbox input itself is visually hidden; its label toggles it.
      await rpcRowsOf(editForm)
        .first()
        .getByText("Alchemy APIs", { exact: true })
        .click()
      await expect(
        rpcRowsOf(editForm).first().locator('input[type="checkbox"]'),
      ).toBeChecked()

      await editForm
        .locator("#custom_network_block_explorer_url")
        .fill(ETHEREUM_CUSTOM_EXPLORER)
    })

    await test.step("Save and confirm the update", async () => {
      await saveButtonOf(editForm).click()

      await walletPageHelper.assertSnackBar("Network updated")
      await expect(
        popup.getByRole("heading", { name: EDIT_FORM_TITLE }),
      ).toBeHidden()
    })

    await test.step("Reopen the form and confirm the change persisted", async () => {
      const reopenedForm = await openBuiltInNetworkEditForm(popup, /^Ethereum$/)

      await expect(rpcRowsOf(reopenedForm)).toHaveCount(1)
      await expect(
        reopenedForm.getByLabel("RPC URL 1", { exact: true }),
      ).toHaveValue(ETHEREUM_RPC_URL)
      await expect(
        rpcRowsOf(reopenedForm).first().locator('input[type="checkbox"]'),
      ).toBeChecked()

      await expect(
        reopenedForm.locator("#custom_network_block_explorer_url"),
      ).toHaveValue(ETHEREUM_CUSTOM_EXPLORER)
    })
  })

  test("Saving an endpoint that reports the wrong chain ID is rejected", async ({
    page: popup,
    walletPageHelper,
  }) => {
    await goToNetworks(popup, walletPageHelper)

    const editForm = await openBuiltInNetworkEditForm(popup, /^Ethereum$/)

    await test.step("Add a Polygon endpoint to the Ethereum list", async () => {
      // Every endpoint in the list is probed, so the shipped defaults are
      // pared back to a single known-good one first. Otherwise a default that
      // happens to be down would fail the save ahead of the Polygon endpoint
      // and mask the chain ID mismatch this test is after.
      await reduceToSingleRpcRow(editForm)
      await editForm
        .getByLabel("RPC URL 1", { exact: true })
        .fill(ETHEREUM_RPC_URL)

      await editForm.getByRole("button", { name: "Add RPC" }).click()
      await expect(rpcRowsOf(editForm)).toHaveCount(2)

      await rpcRowsOf(editForm)
        .last()
        .getByRole("textbox")
        .fill(POLYGON_RPC_URL)
    })

    await test.step("Save and confirm the mismatch is reported", async () => {
      await saveButtonOf(editForm).click()

      // Copy comes from the locale file now that the background reports a
      // discriminant and the URLs rather than an English sentence; see
      // `settings.customNetworksSettings.editModal.errors.endpointChainMismatch`.
      const saveError = editForm.getByRole("alert")
      await expect(saveError).toContainText(POLYGON_RPC_URL)
      await expect(saveError).toContainText("serves chain ID 137, not 1")

      // The form stays open so the offending endpoint can be corrected.
      await expect(
        editForm.getByRole("heading", { name: EDIT_FORM_TITLE }),
      ).toBeVisible()
      await expect(popup.getByText("Network updated")).toBeHidden()
    })

    await test.step("Drop the offending endpoint and close the form", async () => {
      await rpcRowsOf(editForm)
        .last()
        .getByRole("button", { name: REMOVE_RPC_LABEL })
        .click()

      await editForm.getByRole("button", { name: "Close menu" }).click()
      await expect(
        popup.getByRole("heading", { name: EDIT_FORM_TITLE }),
      ).toBeHidden()
    })
  })

  test("RPC endpoint rows can be added, removed and validated", async ({
    page: popup,
    walletPageHelper,
  }) => {
    await goToNetworks(popup, walletPageHelper)

    const editForm = await openBuiltInNetworkEditForm(popup, /^Ethereum$/)

    await test.step("The last remaining row cannot be removed", async () => {
      await reduceToSingleRpcRow(editForm)

      await expect(
        rpcRowsOf(editForm)
          .first()
          .getByRole("button", { name: REMOVE_RPC_LABEL }),
      ).toBeDisabled()
    })

    await test.step("Add RPC appends an empty, editable row", async () => {
      await editForm.getByRole("button", { name: "Add RPC" }).click()
      await expect(rpcRowsOf(editForm)).toHaveCount(2)

      const addedRowInput = editForm.getByLabel("RPC URL 2", { exact: true })
      await expect(addedRowInput).toHaveValue("")
      await expect(addedRowInput).toBeEditable()

      // An empty endpoint is not saveable, and the extra row makes the first
      // row removable again.
      await expect(saveButtonOf(editForm)).toHaveClass(/disabled/)
      await expect(
        rpcRowsOf(editForm)
          .first()
          .getByRole("button", { name: REMOVE_RPC_LABEL }),
      ).toBeEnabled()
    })

    await test.step("An unparseable URL is flagged and blocks saving", async () => {
      await editForm
        .getByLabel("RPC URL 2", { exact: true })
        .fill("definitely not a url")

      await expect(editForm.getByText(INVALID_RPC_URL_ERROR)).toBeVisible()
      await expect(saveButtonOf(editForm)).toHaveClass(/disabled/)

      // Correcting the URL clears the error and re-enables saving. The
      // replacement must differ from row 1's URL, or the duplicate check
      // below would keep the form blocked.
      await editForm
        .getByLabel("RPC URL 2", { exact: true })
        .fill(SECONDARY_ETHEREUM_RPC_URL)

      await expect(editForm.getByText(INVALID_RPC_URL_ERROR)).toBeHidden()
      await expect(saveButtonOf(editForm)).not.toHaveClass(/disabled/)
    })

    await test.step("A duplicate URL is flagged and blocks saving", async () => {
      // Row 1 already holds this URL.
      await editForm
        .getByLabel("RPC URL 2", { exact: true })
        .fill(ETHEREUM_RPC_URL)

      await expect(editForm.getByText(DUPLICATE_RPC_URL_ERROR)).toBeVisible()
      await expect(saveButtonOf(editForm)).toHaveClass(/disabled/)

      // Differentiating the URL clears the error and re-enables saving.
      await editForm
        .getByLabel("RPC URL 2", { exact: true })
        .fill(SECONDARY_ETHEREUM_RPC_URL)

      await expect(editForm.getByText(DUPLICATE_RPC_URL_ERROR)).toBeHidden()
      await expect(saveButtonOf(editForm)).not.toHaveClass(/disabled/)
    })

    await test.step("An Alchemy URL checks the Alchemy toggle by itself", async () => {
      const alchemyRow = rpcRowsOf(editForm).nth(1)
      const alchemyCheckbox = alchemyRow.locator('input[type="checkbox"]')

      await expect(alchemyCheckbox).not.toBeChecked()

      await editForm
        .getByLabel("RPC URL 2", { exact: true })
        .fill(ALCHEMY_RPC_URL)

      await expect(alchemyCheckbox).toBeChecked()
    })

    await test.step("A manual uncheck survives further edits to the URL", async () => {
      const alchemyRow = rpcRowsOf(editForm).nth(1)
      const alchemyCheckbox = alchemyRow.locator('input[type="checkbox"]')

      await alchemyRow.getByText("Alchemy APIs", { exact: true }).click()
      await expect(alchemyCheckbox).not.toBeChecked()

      // Still an Alchemy URL, so there is no transition to re-check on.
      await editForm
        .getByLabel("RPC URL 2", { exact: true })
        .fill(`${ALCHEMY_RPC_URL}2`)

      await expect(alchemyCheckbox).not.toBeChecked()
    })
  })
})
