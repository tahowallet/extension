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

  async verifyTopWrap(
    regexNetwork: string, // a network in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
    regexAccountLabel: string // an account label in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
  ): Promise<void> {
    // TODO: maybe we could also verify graphical elements (network icon, profile picture, etc)?

    const networkRegEx = new RegExp(`^${regexNetwork}$`)
    await expect(
      this.popup.getByTestId("top_menu_network_switcher").last()
    ).toHaveText(networkRegEx)
    await this.popup
      .getByTestId("top_menu_network_switcher")
      .last()
      .click({ trial: true })

    await this.popup.locator(".connection_button").last().click({ trial: true })

    const accountLabelRegEx = new RegExp(`^${regexAccountLabel}$`)
    await expect(
      this.popup.getByTestId("top_menu_profile_button").last()
    ).toHaveText(accountLabelRegEx)
    await this.popup
      .getByTestId("top_menu_profile_button")
      .last()
      .click({ trial: true })
    // TODO: verify 'Copy address'
  }

  async verifyBottomWrap(): Promise<void> {
    await this.popup
      .locator(".tab_bar_wrap")
      .getByText("Wallet", { exact: true })
      .click({ trial: true })
    await this.popup
      .locator(".tab_bar_wrap")
      .getByText("NFTs", { exact: true })
      .click({ trial: true })
    await this.popup
      .locator(".tab_bar_wrap")
      .getByText("Portfolio", { exact: true })
      .click({ trial: true })
    await this.popup
      .locator(".tab_bar_wrap")
      .getByText("Settings", { exact: true })
      .click({ trial: true })
  }

  /**
   *  The function checks elements of the main page that should always be present.
   */
  async verifyCommonElements(
    regexNetwork: string, // a network in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
    regexAccountLabel: string // an account label in RegEx syntax, with special chars double escaped (e.g. `\\d+`) and without leading `/^` and ending `$/`
  ): Promise<void> {
    await expect(this.popup.getByText("Total account balance")).toBeVisible({
      timeout: 120000,
    }) // we need longer timeout, because it takes longer to load this section
    await expect(this.popup.getByTestId("wallet_balance")).toHaveText(
      /^\$(0|\d+\.\d{2})$/
    )

    await this.verifyTopWrap(regexNetwork, regexAccountLabel)

    await this.popup
      .getByRole("button", { name: "Send", exact: true })
      .click({ trial: true })
    await this.popup
      .getByRole("button", { name: "Swap", exact: true })
      .click({ trial: true })
    await this.popup
      .getByRole("button", { name: "Receive", exact: true })
      .click({ trial: true })
    await this.popup
      .getByTestId("panel_switcher")
      .getByText("NFTs", { exact: true })
      .click({ trial: true })
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

  async verifyDefaultWalletBanner(): Promise<void> {
    await expect(
      this.popup.getByText("Taho is not your default wallet")
    ).toBeVisible()
    await this.popup
      .locator(".default_toggle")
      .getByRole("button")
      .click({ trial: true })
  }
}
