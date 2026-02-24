import { Page, expect } from "@playwright/test"
import dedent from "dedent-js"
import WalletPageHelper from "./walletPageHelper"

export default class TransactionsHelper {
  constructor(
    public readonly popup: Page,
    public readonly walletPageHelper: WalletPageHelper,
  ) {}

  /**
   * This function verifies elements on the unfilled Send Assets form.
   * Makes sure `Continue` button isn't active.
   */
  async assertUnfilledSendAssetScreen(
    network: RegExp,
    accountLabel: RegExp,
    assetSymbol: string,
    regexAssetBalance: string, // a balance of the asset in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
    baseAsset: boolean,
  ): Promise<void> {
    await expect(
      this.popup.getByRole("heading", { name: "Send Asset", exact: true }),
    ).toBeVisible()

    await this.walletPageHelper.assertTopWrap(network, accountLabel)

    await this.popup
      .getByRole("button", { name: "Back", exact: true })
      .click({ trial: true })

    await expect(this.popup.getByText(/^Asset \/ Amount$/)).toBeVisible()
    await expect(this.popup.getByTestId("selected_asset_button")).toHaveText(
      assetSymbol,
    )

    const assetBalance = await this.popup.locator(".available")
    const balanceRegEx = new RegExp(`^Balance: ${regexAssetBalance}`)
    expect(assetBalance).toHaveText(balanceRegEx)

    if (baseAsset) {
      expect(
        await this.popup.getByRole("button", { name: "Max" }).count(),
      ).toEqual(0)
    } else {
      await expect(
        this.popup.getByRole("button", { name: "Max" }),
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
      this.popup.getByRole("button", { name: "Continue", exact: true }),
    ).toHaveClass(/disabled/)
    await this.popup
      .getByRole("button", { name: "Continue", exact: true })
      .click({ force: true })

    await this.walletPageHelper.assertBottomWrap()
  }

  /**
   * This function verifies elements on the Transfer screen.
   */
  async assertTransferScreen(
    regexNetwork: string, // a network in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
    regexAccountLabel: string, // an account label in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
    sendToAddressFull: string,
    sendToAddressShortened: string,
    regexSpendAmount: string, // a spend amount in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
    regexAssetSymbol: string, // an asset symbol in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
    baseAsset: boolean,
  ): Promise<void> {
    await expect(
      this.popup.getByRole("heading", { name: "Transfer", exact: true }),
    ).toBeVisible()

    const networkRegEx = new RegExp(`^${regexNetwork}$`)
    await expect(
      this.popup.locator(".top_bar_wrap").getByText(networkRegEx),
    ).toBeVisible()
    const accountLabelRegEx = new RegExp(`^${regexAccountLabel}$`)
    await expect(
      this.popup.locator(".top_bar_wrap").getByText(accountLabelRegEx),
    ).toBeVisible()
    // TODO: We could also add verification that checks we can't change the
    // network and the wallet address at this stage. One way to do it would be
    // using the `pixelmatch` library for image comparison before and after the
    // click.

    await expect(this.popup.getByText(/^Send to$/)).toBeVisible()
    await expect(
      await this.popup.getByRole("button", { name: sendToAddressShortened }),
    ).toBeEnabled()
    await this.popup
      .getByRole("button", { name: sendToAddressShortened })
      .click()

    await expect(async () => {
      const clipboardReceipientAddress = await this.popup.evaluate(() =>
        navigator.clipboard.readText(),
      )

      expect(clipboardReceipientAddress.toLowerCase()).toBe(
        sendToAddressFull.toLowerCase(),
      ) // We need `toLowerCase()`, because for non-base assets the capitalization of the address may differ from the entered one.
    }).toPass()

    const spendAmountContainer = this.popup
      .locator(".container")
      .filter({ hasText: "Spend Amount" })
    const spendAmountRegEx = new RegExp(
      `^${regexSpendAmount} ${regexAssetSymbol}$`,
    )
    await expect(spendAmountContainer.getByText(spendAmountRegEx)).toBeVisible()
    await expect(
      spendAmountContainer.getByText(/^\$(\d|,)+(\.\d{1,2})*$/),
    ).toBeVisible()

    await this.popup
      .getByText("Details", { exact: true })
      .click({ trial: true })
    const estimatedFeeContainer = this.popup
      .locator("span")
      .filter({ hasText: "Estimated network fee" })
    // Accept either dollar-denominated fee or gwei-only fallback, as price
    // data may be unavailable in CI/fork environments.
    const dollarFee = estimatedFeeContainer.getByText(/^~\$\d+(\.\d{1,2})*$/)
    const gweiFallback = estimatedFeeContainer.getByText(/^~\d+(\.\d+)? Gwei$/)
    await expect(dollarFee.or(gweiFallback)).toBeVisible()
    await estimatedFeeContainer.getByRole("button").click({ trial: true })
    // TODO: Add network fees verification

    await this.popup.getByText("Raw data", { exact: true }).click()
    await this.popup.getByRole("button", { name: "Copy hex" }).click()

    const rawDataWrap = this.popup
      .locator(".raw_data_wrap")
      .filter({ hasText: "Copy hex" })

    await expect(async () => {
      const clipboardHex = await this.popup.evaluate(() =>
        navigator.clipboard.readText(),
      )
      if (baseAsset) {
        expect(clipboardHex).toBe("")
        await expect(rawDataWrap.locator(".raw_data_text")).toBeEmpty()
      } else {
        expect(clipboardHex).toMatch(/0x[a-f\d]{40,}/)
        await expect(rawDataWrap.getByText(/0x[a-f\d]{40,}/)).toBeVisible()
      }
    }).toPass()

    await this.popup
      .getByRole("button", { name: "Reject" })
      .click({ trial: true })
    await this.popup
      .getByRole("button", { name: "Sign" })
      .click({ trial: true })
  }

  /**
   * This function verifies asset activity item's details.
   */
  async assertActivityItemProperties(
    sendFromAddressFull: string,
    sendFromAddressShortened: string,
    sendToAddressFull: string,
    sendToAddressShortened: string,
    amount: RegExp,
    gas: RegExp,
  ): Promise<void> {
    /**
     * Assert header.
     */
    const assetActivityItemPopup = this.popup
      .getByTestId("slide_up_menu")
      .filter({ hasText: "Block Height" })

    await expect(assetActivityItemPopup.getByText(/^Send$/)).toBeVisible()

    assetActivityItemPopup
      .locator(".header")
      .getByRole("button")
      .click({ trial: true })
    // TODO: Compare values from the scan website and extension.

    /**
     * Assert sender'saddress.
     */
    const senderButton = assetActivityItemPopup
      .getByTestId("tx_participant_wrap")
      .filter({ hasText: "From:" })
      .getByRole("button", { name: sendFromAddressShortened })
    await expect(senderButton).toHaveAttribute(
      "title",
      dedent(`
        Copy to clipboard:
        ${sendFromAddressFull}
      `),
    )
    await senderButton.click()
    await expect(async () => {
      const clipboardSendFromAddress = await this.popup.evaluate(() =>
        navigator.clipboard.readText(),
      )
      expect(clipboardSendFromAddress).toBe(sendFromAddressFull)
    }).toPass()

    /**
     * Assert receipient's address.
     */
    const receipientButton = assetActivityItemPopup
      .getByTestId("tx_participant_wrap")
      .filter({ hasText: "To:" })
      .getByRole("button", { name: sendToAddressShortened })

    await expect(receipientButton).toHaveAttribute(
      "title",
      dedent(`
        Copy to clipboard:
        ${sendToAddressFull}
      `),
    )
    await receipientButton.click()
    await expect(async () => {
      const clipboardSendToAddress = await this.popup.evaluate(() =>
        navigator.clipboard.readText(),
      )
      expect(clipboardSendToAddress).toBe(sendToAddressFull)
    }).toPass()

    /**
     * Assert other transaction properties.
     */
    const blockHeightRow = this.popup.locator("li").filter({
      has: this.popup.locator(".label").filter({ hasText: /^Block Height$/ }),
    })
    await expect(
      blockHeightRow.locator(".right").getByText(/^\d+$/),
    ).toBeVisible()

    const amountRow = this.popup.locator("li").filter({
      has: this.popup.locator(".label").filter({ hasText: /^Amount$/ }),
    })
    await expect(amountRow.locator(".right").getByText(amount)).toBeVisible()

    const maxFeeRow = this.popup.locator("li").filter({
      has: this.popup.locator(".label").filter({ hasText: /^Max Fee\/Gas$/ }),
    })
    await expect(
      maxFeeRow.locator(".right").getByText(/^\d+\.\d{2} Gwei$/),
    ).toBeVisible()

    const gasPriceRow = this.popup.locator("li").filter({
      has: this.popup.locator(".label").filter({ hasText: /^Gas Price$/ }),
    })
    await expect(
      gasPriceRow.locator(".right").getByText(/^\d+\.\d{2} Gwei$/),
    ).toBeVisible()

    const gasRow = this.popup.locator("li").filter({
      has: this.popup.locator(".label").filter({ hasText: /^Gas$/ }),
    })
    await expect(gasRow.locator(".right").getByText(gas)).toBeVisible()

    const nonceRow = this.popup.locator("li").filter({
      has: this.popup.locator(".label").filter({ hasText: /^Nonce$/ }),
    })
    await expect(nonceRow.locator(".right").getByText(/^\d+$/)).toBeVisible()

    const timestampRow = this.popup.locator("li").filter({
      has: this.popup.locator(".label").filter({ hasText: /^Timestamp$/ }),
    })
    await expect(
      timestampRow
        .locator(".right")
        // eslint-disable-next-line no-irregular-whitespace
        .getByText(/^\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2}( AM| PM)*$/),
    ).toBeVisible()
  }

  /**
   * Function closing the asset activity item popup.
   */
  async closeVerifyAssetPopup(): Promise<void> {
    const assetActivityItemPopup = this.popup
      .getByTestId("slide_up_menu")
      .filter({ hasText: "Block Height" })
    await assetActivityItemPopup.getByLabel("Close menu").click()
  }
}
