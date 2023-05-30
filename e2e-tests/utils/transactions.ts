import { Page, expect } from "@playwright/test"
import WalletPageHelper from "./walletPageHelper"

export default class TransactionsHelper {
  constructor(
    public readonly popup: Page,
    public readonly walletPageHelper: WalletPageHelper
  ) {}

  /**
   * This function verifies elements on the unfilled Send Assets form.
   * Makes sure `Continue` button isn't active.
   */
  async verifyUnfilledSendAssetScreen(
    regexNetwork: string, // a network in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
    regexAccountLabel: string, // an account label in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
    assetSymbol: string,
    regexAssetBalance: string, // a balance of the asset in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
    baseAsset: boolean
  ): Promise<void> {
    await expect(
      this.popup.getByRole("heading", { name: "Send Asset", exact: true })
    ).toBeVisible()

    await this.walletPageHelper.verifyTopWrap(regexNetwork, regexAccountLabel)

    await this.popup
      .getByRole("button", { name: "Back", exact: true })
      .click({ trial: true })

    await expect(this.popup.getByText(/^Asset \/ Amount$/)).toBeVisible()
    await expect(this.popup.getByTestId("selected_asset_button")).toHaveText(
      assetSymbol
    )

    const assetBalance = await this.popup.locator(".available")
    const balanceRegEx = new RegExp(`^Balance: ${regexAssetBalance}$`)
    expect(assetBalance).toHaveText(balanceRegEx)
    if (baseAsset) {
      expect(
        await this.popup.getByRole("button", { name: "Max" }).count()
      ).toEqual(0)
    } else {
      await expect(
        this.popup.getByRole("button", { name: "Max" })
      ).toBeVisible()
      await this.popup
        .getByRole("button", { name: "Max" })
        .click({ trial: true })
    }
    await expect(this.popup.getByPlaceholder(/^0\.0$/)).toBeVisible()
    await expect(this.popup.getByText(/^\$-$/)).toBeVisible()

    await expect(this.popup.getByLabel(/^Send To:$/)).toBeVisible()
    await expect(this.popup.getByPlaceholder(/^0x\.\.\.$/)).toBeVisible()

    await expect(
      this.popup.getByRole("button", { name: "Continue", exact: true })
    ).toHaveClass(/^\S+ button large disabled$/)
    await this.popup
      .getByRole("button", { name: "Continue", exact: true })
      .click({ force: true })

    await this.walletPageHelper.verifyBottomWrap()
  }

  /**
   * This function verifies elements on the Transfer screen.
   */
  async verifyTransferScreen(
    regexNetwork: string, // a network in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
    regexAccountLabel: string, // an account label in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
    sendToAddressFull: string,
    sendToAddressShortened: string,
    regexSpendAmount: string,
    assetSymbol: string,
    baseAsset: boolean
  ): Promise<void> {
    await expect(
      this.popup.getByRole("heading", { name: "Transfer", exact: true })
    ).toBeVisible()

    const networkRegEx = new RegExp(`^${regexNetwork}$`)
    await expect(
      this.popup.locator(".top_bar_wrap").getByText(networkRegEx)
    ).toBeVisible()
    const accountLabelRegEx = new RegExp(`^${regexAccountLabel}$`)
    await expect(
      this.popup.locator(".top_bar_wrap").getByText(accountLabelRegEx)
    ).toBeVisible()
    // TODO: We could also add verification that checks we can't change the
    // network and the wallet address at this stage. One way to do it would be
    // using the `pixelmatch` library for image comparison before and after the
    // click.

    await expect(this.popup.getByText(/^Send to$/)).toBeVisible()
    await expect(
      await this.popup.getByRole("button", { name: sendToAddressShortened })
    ).toBeEnabled()
    await this.popup
      .getByRole("button", { name: sendToAddressShortened })
      .click()
    const clipboardReceipientAddress = await this.popup.evaluate(() =>
      navigator.clipboard.readText()
    )
    expect(clipboardReceipientAddress.toLowerCase()).toBe(
      sendToAddressFull.toLowerCase()
    ) // We need `toLowerCase()`, because for non-base assets the capitalization of the address may differ from the entered one.

    const spendAmountContainer = this.popup
      .locator(".container")
      .filter({ hasText: "Spend Amount" })
    const spendAmountRegEx = new RegExp(`^${regexSpendAmount} ${assetSymbol}$`)
    await expect(spendAmountContainer.getByText(spendAmountRegEx)).toBeVisible()
    await expect(spendAmountContainer.getByText(/^\$\d+\.\d{2}$/)).toBeVisible()

    await this.popup
      .getByText("Details", { exact: true })
      .click({ trial: true })
    const estimatedFeeContainer = this.popup
      .locator("span")
      .filter({ hasText: "Estimated network fee" })
    await expect(
      estimatedFeeContainer.getByText(/^~\$\d+\.\d{2}$/)
    ).toBeVisible()
    await expect(
      estimatedFeeContainer.getByText(/^\(\d+\.\d{2} Gwei\)$/)
    ).toBeVisible()
    await estimatedFeeContainer.getByRole("button").click({ trial: true })
    // TODO: Add network fees this.popup verification

    await this.popup.getByText("Raw data", { exact: true }).click()
    await this.popup.getByRole("button", { name: "Copy hex" }).click()
    const rawDataWrap = this.popup
      .locator(".raw_data_wrap")
      .filter({ hasText: "Copy hex" })
    const clipboardHex = await this.popup.evaluate(() =>
      navigator.clipboard.readText()
    )
    if (baseAsset) {
      expect(clipboardHex).toBe("")
      await expect(rawDataWrap.locator(".raw_data_text")).toBeEmpty()
    } else {
      expect(clipboardHex).toMatch(/0x[a-f\d]{40,}/)
      await expect(rawDataWrap.getByText(/0x[a-f\d]{40,}/)).toBeVisible()
    }

    await this.popup
      .getByRole("button", { name: "Reject" })
      .click({ trial: true })
    await this.popup
      .getByRole("button", { name: "Sign" })
      .click({ trial: true })
  }

  /**
   * This function verifies elements on the asset activity screen.
   */
  async verifyAssetActivityScreen(
    regexNetwork: string, // a network in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
    regexAccountLabel: string, // an account label in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
    assetSymbol: string, // an asset symbol in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`assetSymbol: string // an asset symbol in RegEx syntax, without leading `/^` and ending `$/`
    expectedMaxBalance: number,
    baseAsset: boolean,
    tokenLink?: string
  ): Promise<void> {
    await this.walletPageHelper.verifyTopWrap(regexNetwork, regexAccountLabel)

    await this.popup
      .getByRole("button", { name: "Back", exact: true })
      .click({ trial: true })

    await this.popup
      .getByRole("button", { name: "Send", exact: true })
      .click({ trial: true })
    await this.popup
      .getByRole("button", { name: "Swap", exact: true })
      .click({ trial: true })

    await this.walletPageHelper.verifyBottomWrap()

    /**
     * Verify the token balance gets updated to the right value
     */
    const assetSymbolRegEx = new RegExp(`^${assetSymbol}$`)
    const activityLeftContainer = this.popup.locator(".left").filter({
      has: this.popup.locator("span").filter({ hasText: assetSymbolRegEx }),
    })
    await expect(async () => {
      const balance = await activityLeftContainer
        .getByText(/^\d+\.\d{2,4}$/)
        .textContent()
      const parsedValue = balance !== null ? parseFloat(balance) : NaN
      expect(parsedValue).toBeLessThanOrEqual(expectedMaxBalance)
    }).toPass({
      timeout: 120000,
    })
    await expect(
      activityLeftContainer.getByText(/^\$\d+\.\d{2}$/)
    ).toBeVisible()

    if (baseAsset === false) {
      const tokenLinkIcon = activityLeftContainer
        .getByRole("link")
        .filter({ has: this.popup.locator(".icon_new_tab") })
      if (tokenLink !== undefined) {
        await expect(tokenLinkIcon).toHaveAttribute("href", tokenLink)
      } else {
        throw new Error("`tokenLink` not defined.")
      }
      await tokenLinkIcon.click({ trial: true })
    }
  }
}
