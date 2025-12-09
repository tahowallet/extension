import { BrowserContext, Page, expect } from "@playwright/test"

export default class ConnectPopupHelper {
  get page() {
    if (this.#targetPage === null) {
      throw new Error("Connection popup hasn't loaded yet")
    }
    return this.#targetPage
  }

  #targetPage: Page | null = null

  #pagePromise: Promise<Page>

  constructor(
    private readonly context: BrowserContext,
    extensionId: string,
  ) {
    this.#pagePromise = this.context.waitForEvent("page", (page) =>
      page.url().includes(extensionId),
    )
  }

  async ready() {
    const popup = await this.#pagePromise
    await popup.waitForLoadState()
    this.#targetPage = popup
  }

  /**
   * Hides the dApp Connection "use Taho as default" informational popup so
   * tests can proceed assuming dApp connection will be available without
   * additional interactions.
   */
  async hideDappConnectPopup(): Promise<void> {
    await expect(async () => {
      // Clear the one-time informational popup, if present.
      const connectingPopupTitle = this.page.locator("h3", {
        hasText: "Connecting with Taho",
      })

      expect(await connectingPopupTitle.count()).toBe(1)

      await expect(connectingPopupTitle).toBeVisible()
    }).toPass()

    // Clear the popover.
    const bgLocator = this.page
      .locator(".bg")
      .getByRole("button", { name: "Close" })

    await bgLocator.click()
    await bgLocator.waitFor({ state: "detached", timeout: 1000 })
  }

  async rejectConnection() {
    await this.page.locator("button", { hasText: "Reject" }).click()
  }

  async acceptConnection() {
    await this.page.getByRole("button", { name: "Connect" }).click()
  }

  async closeWindow() {
    await this.page.close()
  }
}
