import { Page, BrowserContext, expect } from "@playwright/test"
import OnboardingHelper from "./onboarding"

export default class WalletPageHelper {
  readonly url: string

  #onboardingHelper: OnboardingHelper

  get onboarding(): OnboardingHelper {
    return this.#onboardingHelper
  }

  constructor(
    public readonly popup: Page,
    public readonly context: BrowserContext,
    public readonly extensionId: string
  ) {
    this.url = `chrome-extension://${extensionId}/popup.html`
    this.#onboardingHelper = new OnboardingHelper(popup, context)
  }

  async setViewportSize(): Promise<void> {
    return this.popup.setViewportSize({ width: 384, height: 600 })
  }

  async goToStartPage(bringToFront = true): Promise<void> {
    if (bringToFront) {
      await this.popup.bringToFront()
    }
    await this.popup.goto(this.url)
  }

  async navigateTo(tab: string): Promise<void> {
    await this.popup
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: tab })
      .click()
  }

  /**
   * Onboard using walletPageHelper
   */
  async onboardWithSeedPhrase(recoveryPhrase: string): Promise<void> {
    const onboardingPage = await this.onboarding.getOnboardingPage()
    await this.onboarding.addAccountFromSeed({
      phrase: recoveryPhrase,
      onboardingPage,
    })
    await this.setViewportSize()
    await this.goToStartPage()
  }

  async verifyTopWrap(network: RegExp, accountLabel: RegExp): Promise<void> {
    // TODO: maybe we could also verify graphical elements (network icon, profile picture, etc)?

    await expect(
      this.popup.getByTestId("top_menu_network_switcher").last()
    ).toHaveText(network)
    await this.popup
      .getByTestId("top_menu_network_switcher")
      .last()
      .click({ trial: true })

    // There's no `connection_button` in the current code from `main`. TODO:
    // verify if we'll need this or not.
    // await this.popup.locator(".connection_button").last().click({ trial: true })

    await expect(
      this.popup.getByTestId("top_menu_profile_button").last()
    ).toHaveText(accountLabel, { timeout: 240000 })
    await this.popup
      .getByTestId("top_menu_profile_button")
      .last()
      .click({ trial: true })
    // TODO: verify 'Copy address'
  }

  async verifyBottomWrap(): Promise<void> {
    await this.popup
      .getByLabel("Main")
      .getByText("Wallet", { exact: true })
      .click({ trial: true })
    await this.popup
      .getByLabel("Main")
      .getByText("NFTs", { exact: true })
      .click({ trial: true })
    await this.popup
      .getByLabel("Main")
      .getByText("Portfolio", { exact: true })
      .click({ trial: true })
    await this.popup
      .getByLabel("Main")
      .getByText("Settings", { exact: true })
      .click({ trial: true })
  }

  /**
   *  The function checks elements of the main page that should always be present.
   */
  async verifyCommonElements(
    network: RegExp,
    testnet: boolean,
    accountLabel: RegExp
  ): Promise<void> {
    await expect(this.popup.getByText("Total account balance")).toBeVisible({
      timeout: 240000,
    }) // we need longer timeout, because on fork it often takes long to load this section
    await expect(this.popup.getByTestId("wallet_balance")).toHaveText(
      /^\$(\d|,)+(\.\d{1,2})*$/
    )

    await this.verifyTopWrap(network, accountLabel)

    await this.popup
      .getByRole("button", { name: "Send", exact: true })
      .click({ trial: true })
    await this.popup
      .getByRole("button", { name: "Swap", exact: true })
      .click({ trial: true })
    await this.popup
      .getByRole("button", { name: "Receive", exact: true })
      .click({ trial: true })
    if (testnet === false) {
      await this.popup
        .getByTestId("panel_switcher")
        .getByText("NFTs", { exact: true })
        .click({ trial: true })
    }
    await this.popup
      .getByTestId("panel_switcher")
      .getByText("Assets", { exact: true })
      .click({ trial: true })
    await this.popup
      .getByTestId("panel_switcher")
      .getByText("Activity", { exact: true })
      .click({ trial: true })
    await this.verifyBottomWrap()
  }

  async verifyAnalyticsBanner(): Promise<void> {
    const analyticsBanner = this.popup.locator("div").filter({
      has: this.popup.getByRole("heading", {
        name: "Analytics are enabled",
        exact: true,
      }),
    })
    await expect(
      analyticsBanner.getByText(
        "They help us improve the wallet. You can disable anytime",
        { exact: true }
      )
    ).toBeVisible()
    await analyticsBanner
      .getByText("Change settings", { exact: true })
      .click({ trial: true })
  }

  async waitForAssetsToLoad(timeout?: number): Promise<void> {
    await expect(this.popup.getByText("Digging deeper")).toHaveCount(0, {
      timeout: timeout ?? 120000,
    })
    await expect(this.popup.locator(".spinner")).toHaveCount(0, {
      timeout: timeout ?? 120000,
    })
    // await expect(this.popup.locator(".token_icon_fallback")).toHaveCount(0, {
    //   timeout: timeout ?? 120000,
    // }) // TODO: delete?
  }

  async switchNetwork(network: RegExp): Promise<void> {
    await this.popup.getByTestId("top_menu_network_switcher").last().click()
    await this.popup.getByText(network).click()
    await expect(
      this.popup.getByTestId("top_menu_network_switcher").last()
    ).toHaveText(network)
  }

  /**
   * Function adding new address to an already imported account
   */
  async addAddressToAccount(accountLabel: string): Promise<void> {
    await this.popup.getByTestId("top_menu_profile_button").last().click()

    const numberOfAccounts = await this.popup
      .getByTestId("wallet_address_item")
      .count()
    const accountLabelButton = this.popup
      .getByTestId("wallet_title")
      .filter({
        hasText: accountLabel,
      })
      .getByRole("button")
    await this.popup.getByTestId("wallet_title").click({ trial: true }) // TODO: why trial?
    await this.popup
      .getByTestId("wallet_title")
      .filter({
        hasText: accountLabel,
      })
      .click({ trial: true })

    await this.popup
      .getByTestId("wallet_title")
      .filter({
        hasText: accountLabel,
      })
      .getByRole("button")
      .click({ trial: true })
    await accountLabelButton.click()
    await this.popup.getByText(/^Add address$/).click()

    await expect(this.popup.getByTestId("wallet_address_item")).toHaveCount(
      numberOfAccounts + 1
    )
    await expect(
      this.popup.getByTestId("slide_up_menu").locator(".spinner")
    ).toHaveCount(0)

    await this.closeAccountsPopup()
  }

  /**
   * Function switchning to an another account.
   */
  async switchToAddress(
    accountLabel: string,
    addressNo: number, // 1 for the 1st address under the `accountLabel` label, 2 for the 2nd, etc.
    accountName: RegExp // the name displayed in the top menu after account switching
  ): Promise<void> {
    await this.popup.getByTestId("top_menu_profile_button").last().click()
    await this.popup
      .locator("section")
      .filter({
        hasText: accountLabel,
      })
      .getByTestId("wallet_address_item")
      .nth(addressNo - 1)
      .click()
    await expect(
      this.popup.getByTestId("top_menu_profile_button").last()
    ).toHaveText(accountName)
  }

  /**
   * Function closing the Accounts popup.
   */
  async closeAccountsPopup(): Promise<void> {
    const accountsPopup = await this.popup.$(".slide_up_menu:not(.closed)")
    if (accountsPopup) {
      const closeButton = await accountsPopup.$(
        'button[aria-label="Close menu"]'
      )
      if (closeButton) {
        await closeButton.click()
      } else {
        throw new Error("Close button not found")
      }
    } else {
      throw new Error("Accounts popup not found")
    }
  }
}
