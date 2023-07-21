import { Page, expect } from "@playwright/test"
import WalletPageHelper from "./walletPageHelper"

export default class AssetsHelper {
  constructor(
    public readonly popup: Page,
    public readonly walletPageHelper: WalletPageHelper
  ) {}

  /**
   * This function verifies that the provided asset is present (an in case of
   * base assets, displayed as first) on the list of assets on the Wallet page.
   * It verifies that the asset has a balance (and a USD value, when aplicable)
   * displayed and there are options to Send and Swap. It also makes sure the
   * asset is not displayed in the unverified section.
   */
  async assertVerifiedAssetOnWalletPage(
    assetSymbol: RegExp,
    assetType: "base" | "knownERC20" | "trusted"
  ): Promise<void> {
    let asset: ReturnType<typeof this.popup.locator> | undefined
    if (assetType === "base") {
      asset = this.popup.getByTestId("asset_list_item").first() // We use `.first()` because the base asset should be first on the list
    } else {
      asset = this.popup.getByTestId("asset_list_item").filter({
        has: this.popup.locator("span").filter({ hasText: assetSymbol }),
      })
    }
    await this.popup.waitForTimeout(2000) // We need to wait for the background elements to disappear
    await expect(asset.getByText(assetSymbol)).toBeVisible()
    /**
     * Make sure the asset is not listed among unverified assets.
     */
    await expect(
      this.popup
        .getByTestId("hidden_assets_container")
        .filter({ has: asset.getByText(assetSymbol) })
    ).not.toBeVisible()

    await expect(asset.getByText(/^(\d|,)+(\.\d{2,4})*$/)).toBeVisible()
    // TODO: Uncommment once https://github.com/tahowallet/extension/pull/3508
    // is merged.
    // if (assetType === "base" || assetType === "knownERC20") {
    //   await expect(asset.getByText(/^\$(0|\d+\.\d{2})$/)).toBeVisible()
    // }
    await asset.locator(".asset_icon_send").click({ trial: true })
    await asset.locator(".asset_icon_swap").click({ trial: true })
  }

  // This is a more robust version of
  // `transactionsHelper.verifyAssetActivityScreen()`. After merge of PR #3418
  // let's merge both functions into one.
  /**
   * This function verifies elements on the asset details page.
   */
  async assertAssetDetailsPage(
    network: RegExp,
    accountLabel: RegExp,
    assetSymbol: RegExp,
    expectedBalance: RegExp,
    assetType: "base" | "knownERC20" | "unverified" | "trusted",
    tokenLink?: string, // needed only when `assetType` is not `base`
    tokenAddressShortened?: string // needed only when `assetType` is `unverified` or `trusted`
  ): Promise<void> {
    /**
     * Assert the top wrap.
     */
    await this.walletPageHelper.verifyTopWrap(network, accountLabel)

    /**
     * Assert the `Back` button.
     */
    await this.popup
      .getByRole("button", { name: "Back", exact: true })
      .click({ trial: true })

    /**
     * Assert the token name and make sure the balance equals (or gets updated
     * to) the correct value.
     */
    const activityLeftContainer = this.popup.locator(".left").filter({
      has: this.popup.locator("span").filter({ hasText: assetSymbol }),
    })
    await expect(async () => {
      const balance = await activityLeftContainer
        .getByText(/^(\d|,)+(\.\d{2,4})*$/)
        .textContent()
      expect(balance).toMatch(expectedBalance)
    }).toPass({
      timeout: 120000,
    })

    if (assetType === "base" || assetType === "knownERC20") {
      // TODO: Uncommment once https://github.com/tahowallet/extension/pull/3508
      // is merged.
      // await expect(
      //   activityLeftContainer.getByText(/^\$(\d|,)+\.\d{2}$/)
      // ).toBeVisible()
    } else {
      await expect(
        activityLeftContainer.getByText(/^\$(\d|,)+\.\d{2}$/)
      ).not.toBeVisible()
    }

    /**
     * Assert the token link
     */
    const tokenLinkIcon = activityLeftContainer
      .getByRole("link")
      .filter({ has: this.popup.locator(".icon_new_tab") })
    if (assetType !== "base") {
      if (tokenLink !== undefined) {
        await expect(tokenLinkIcon).toHaveAttribute("href", tokenLink)
      } else {
        throw new Error("`tokenLink` not defined.")
      }
      await tokenLinkIcon.click({ trial: true })
    } else {
      await expect(tokenLinkIcon).not.toBeVisible()
    }

    /**
     * Assert elements related to asset verification.
     */
    if (assetType === "unverified") {
      await this.popup
        .getByRole("button", { name: "Asset not verified" })
        .click()
      await this.assertVerifyAssetPopup(
        assetSymbol,
        assetType,
        tokenAddressShortened
      )
      this.closeVerifyAssetPopup()
      await this.popup.getByRole("button", { name: "Verify asset" }).click()
      await this.assertVerifyAssetPopup(
        assetSymbol,
        assetType,
        tokenAddressShortened
      )
      this.closeVerifyAssetPopup()
    } else {
      await expect(this.popup.getByText("Asset not verified")).not.toBeVisible()
      await expect(this.popup.getByText("Verify asset")).not.toBeVisible()
    }

    if (assetType === "trusted") {
      await this.popup.getByRole("button", { name: "Verified by you" }).click()
      await this.assertVerifyAssetPopup(
        assetSymbol,
        assetType,
        tokenAddressShortened
      )
      this.closeVerifyAssetPopup()
    } else {
      await expect(
        this.popup.getByRole("button", { name: "Verified by you" })
      ).not.toBeVisible()
    }

    /**
     * Assert the Send and Swap actions.
     */
    if (assetType !== "unverified") {
      await this.popup
        .getByRole("button", { name: "Send", exact: true })
        .click({ trial: true })
      await this.popup
        .getByRole("button", { name: "Swap", exact: true })
        .click({ trial: true })
    } else {
      await expect(
        this.popup.getByRole("button", { name: "Send", exact: true })
      ).not.toBeVisible()
      await expect(
        this.popup.getByRole("button", { name: "Swap", exact: true })
      ).not.toBeVisible()
    }

    /**
     * Assert the bottom wrap.
     */
    await this.walletPageHelper.verifyBottomWrap()
  }

  /**
   * Function closing the verify asset popup
   */
  async closeVerifyAssetPopup(): Promise<void> {
    const verifyAssetPopup = this.popup
      .getByTestId("slide_up_menu")
      .filter({ hasText: "Asset automatically imported" })
    await verifyAssetPopup.getByLabel("Close menu").click()
  }

  /**
   * Function asserting the Verify Asset popup
   */
  async assertVerifyAssetPopup(
    assetSymbol: RegExp,
    assetType: "unverified" | "trusted",
    tokenAddressShortened: string | undefined
  ): Promise<void> {
    await expect(
      this.popup.getByText("Asset automatically imported")
    ).toBeVisible()

    const verifyAssetPopup = this.popup
      .getByTestId("slide_up_menu")
      .filter({ hasText: "Asset automatically imported" })

    if (assetType === "trusted") {
      await expect(
        verifyAssetPopup.getByText("Asset verified by you")
      ).toBeVisible()
      await expect(
        verifyAssetPopup.getByText("Asset not verified")
      ).not.toBeVisible()
    } else {
      await expect(
        verifyAssetPopup.getByText("Asset not verified")
      ).toBeVisible()
      await expect(
        verifyAssetPopup.getByText("Asset verified by you")
      ).not.toBeVisible()
    }

    await expect(
      verifyAssetPopup.getByText(
        "Be aware of scam and spam assets, only interact with assets you trust."
      )
    ).toBeVisible()

    await expect(
      verifyAssetPopup
        .locator("li")
        .filter({
          hasText: "Symbol",
        })
        .locator(".right")
    ).toHaveText(assetSymbol)

    if (tokenAddressShortened !== undefined) {
      await expect(
        verifyAssetPopup
          .locator("li")
          .filter({
            hasText: "Contract address",
          })
          .locator(".right")
      ).toHaveText(tokenAddressShortened)
    } else {
      throw new Error("`tokenAddressShortened` not defined.")
    }

    await verifyAssetPopup
      .locator("li")
      .filter({
        hasText: "Contract address",
      })
      .locator(".right")
      .click({ trial: true })
    // TODO: Click and verify the scan website address

    await verifyAssetPopup
      .getByRole("button", { name: "Don’t show", exact: true })
      .click({ trial: true })

    if (assetType === "unverified") {
      await verifyAssetPopup
        .getByRole("button", { name: "Add to asset list", exact: true })
        .click({ trial: true })
    } else {
      await expect(
        verifyAssetPopup.getByRole("button", {
          name: "Add to asset list",
          exact: true,
        })
      ).not.toBeVisible()
    }
  }

  async assertNoUnverifiedAssetsOnWalletPage(): Promise<void> {
    await expect(
      this.popup.getByRole("button", { name: "See unverified assets" })
    ).not.toBeVisible()
    await expect(this.popup.getByText("Asset not verified")).not.toBeVisible()
    await expect(
      this.popup.getByRole("button", { name: "Verify asset" })
    ).not.toBeVisible()
    await expect(
      this.popup.getByTestId("hidden_assets_container")
    ).not.toBeVisible()
  }

  async assertUnverifiedAssetsPresentOnWalletPage(): Promise<void> {
    /** Make sure there is a `See unverified assets` button, but no unverified
     * assets are listed before button is clicked.
     */
    await expect(
      this.popup.getByRole("button", {
        name: /^See unverified assets \(\d+\)$/,
      })
    ).toBeVisible()
    await expect(
      this.popup.getByRole("button", {
        name: /^Hide unverified assets \(\d+\)$/,
      })
    ).not.toBeVisible()

    await expect(
      this.popup.getByTestId("hidden_assets_container")
    ).not.toBeVisible()
    // Below assertions fail, as `Verify asset` and `Asset not verified`
    // elements are present in DOM even when unverified assets are collapsed.
    // There's no easy way to assert that those elements are not visible to a
    // human eye.
    // await expect(
    //   this.popup.getByRole("button", { name: "Verify asset" }).first()
    // ).toBeHidden()
    // await expect(this.popup.getByText("Asset not verified")).not.toBeVisible()
    // await expect(
    //   this.popup.getByText(
    //     "Be aware of scam and spam assets, only interact with assets you trust."
    //   )
    // ).not.toBeVisible()

    /** Click the `See unverified assets` button and make sure unverified
     * assets do show up.
     */
    await this.popup
      .getByRole("button", { name: /^See unverified assets \(\d+\)$/ })
      .click()

    await expect(
      this.popup.getByRole("button", {
        name: /^Hide unverified assets \(\d+\)$/,
      })
    ).toBeVisible()
    await expect(
      this.popup.getByRole("button", { name: "See unverified assets" })
    ).not.toBeVisible()

    await expect(
      this.popup.getByTestId("hidden_assets_container")
    ).toBeVisible()
    // Similarly as commented above, below assertions are not perfect. The
    // assertions can pass even when the list of unverified assets is collapsed.
    await expect(this.popup.getByText("Asset not verified")).toBeVisible()
    await expect(
      this.popup.getByText(
        "Be aware of scam and spam assets, only interact with assets you trust."
      )
    ).toBeVisible()
    await expect(
      this.popup.getByRole("button", { name: "Verify asset" }).first()
    ).toBeVisible()

    /**
     * Click `Hide unverified assets` button, make sure unverified assets are
     * not shown.
     */
    await this.popup
      .getByRole("button", {
        name: /^Hide unverified assets \(\d+\)$/,
      })
      .click()
    await expect(
      this.popup.getByRole("button", {
        name: /^See unverified assets \(\d+\)$/,
      })
    ).toBeVisible()
    await expect(
      this.popup.getByRole("button", {
        name: /^Hide unverified assets \(\d+\)$/,
      })
    ).not.toBeVisible()
    await expect(
      this.popup.getByTestId("hidden_assets_container")
    ).not.toBeVisible()
  }

  // TODO: Move it to transactionsHelper once #3418 gets merged to `main`.
  async assertAssetsNotPresentOnAssetsList(
    tokens: Array<unknown>
  ): Promise<void> {
    await expect(this.popup.getByTestId("assets_list")).toHaveCount(1)
    await Promise.all(
      tokens.map(async (token) => {
        await expect(
          this.popup.getByTitle(token as string, { exact: true })
        ).toHaveCount(0)
      })
    )
  }

  // TODO: Move it to transactionsHelper once #3418 gets merged to `main`.
  async assertAssetsPresentOnAssetsList(tokens: Array<unknown>): Promise<void> {
    await expect(this.popup.getByTestId("assets_list")).toHaveCount(1)
    await Promise.all(
      tokens.map(async (token) => {
        await expect(
          this.popup.getByTitle(token as string, { exact: true })
        ).toHaveCount(1)
      })
    )
  }

  // TODO: Move it to transactionsHelper once #3418 gets merged to `main`.
  /**
   * Function closing the Select token popup
   */
  async closeSelectTokenPopup(): Promise<void> {
    const selectTokenPopup = this.popup
      .getByTestId("slide_up_menu")
      .filter({ hasText: "Select token" })
    await selectTokenPopup.getByLabel("Close menu").click()
  }

  // TODO: Move to settingsHelper
  /**
   * Verifies the copy in the setting and tooltip, checks if toggle is in the
   * expected position.
   */
  async assertShowUnverifiedAssetsSetting(enabled: boolean): Promise<void> {
    const showUnverifiedAssetsSetting = this.popup.locator("li").filter({
      hasText: /^Show unverified assets$/,
    })
    await showUnverifiedAssetsSetting
      .getByTestId("toggle")
      .click({ trial: true })
    await expect(
      showUnverifiedAssetsSetting.getByTestId("toggle")
    ).toHaveAttribute("aria-checked", enabled.toString())
    await showUnverifiedAssetsSetting
      .getByTestId("tooltip_wrap")
      .hover({ timeout: 5000 })
    await expect(
      this.popup.getByText(
        `Discover assets that you own but are not on our asset list. Some
          spam/scam assets may show up, so treat them with caution.`
      )
    ).toBeVisible()
    await expect(
      this.popup.getByText(
        `They will show up on the bottom of the asset page until you verify
          them.`
      )
    ).toBeVisible()
  }

  // TODO: Move to settingsHelper once we create dedicated e2e tests for
  // Settings.
  /** Verifies the copy in the setting and tooltip, checks if toggle is in
   * the expected position.
   */
  async toggleShowUnverifaiedAssetsSetting(): Promise<void> {
    const showUnverifiedAssetsSetting = this.popup.locator("li").filter({
      hasText: /^Show unverified assets$/,
    })
    await showUnverifiedAssetsSetting.getByTestId("toggle").click()
  }
}