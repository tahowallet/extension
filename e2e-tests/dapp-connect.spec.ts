import { test, expect } from "./utils"

test.describe("dApp Connections", () => {
  test("should display an informational popup for Taho as default on first connection", async ({
    context,
    walletPageHelper,
  }) => {
    await walletPageHelper.onboarding.addReadOnlyAccount("testertesting.eth")

    const dappPage = await context.newPage()
    await dappPage.goto("https://swap.cow.fi/")
    await dappPage
      .locator("#swap-button")
      .getByRole("button", { name: "Connect Wallet" })
      .click()

    // Get page after a specific action (e.g. clicking a link)
    const [popupPage] = await Promise.all([
      context.waitForEvent("page"),
      await dappPage.locator("text=Injected").click(), // Opens a new tab
    ])
    await popupPage.waitForLoadState()

    // Clear the one-time informational popup, if present.
    const connectingPopupTitle = popupPage.locator("h3", {
      hasText: "Connecting with Taho",
    })

    expect(await connectingPopupTitle.count()).toBe(1)
    await expect(connectingPopupTitle).toBeVisible()

    // Clear the popover.
    const popupCloseLocator = popupPage.getByRole("button", {
      name: "Background close",
    })

    await popupCloseLocator.click()
    await popupCloseLocator.waitFor({ state: "detached", timeout: 1000 })

    await popupPage.locator("button", { hasText: "Reject" }).click()

    await dappPage.close()

    const dappPage2 = await context.newPage()
    await dappPage2.goto("https://swap.cow.fi/")
    await dappPage2
      .locator("#swap-button")
      .getByRole("button", { name: "Connect Wallet" })
      .click()

    // Get page after a specific action (e.g. clicking a link)
    const [popupPage2] = await Promise.all([
      context.waitForEvent("page"),
      await dappPage2.locator("text=Injected").click(), // Opens a new tab
    ])
    await popupPage2.waitForLoadState()

    // Check that the popup is no longer displayed.
    const connectingPopupTitle2 = popupPage2.locator("h3", {
      hasText: "Connecting with Taho",
    })
    expect(await connectingPopupTitle2.count()).toBe(0)
  })

  test("should work and add an entry to the connected websites list", async ({
    page,
    context,
    walletPageHelper,
  }) => {
    await walletPageHelper.onboarding.addReadOnlyAccount("testertesting.eth")
    await walletPageHelper.hideDappConnectPopup()

    const dappPage = await context.newPage()
    await dappPage.goto("https://swap.cow.fi/")
    await dappPage
      .locator("#swap-button")
      .getByRole("button", { name: "Connect Wallet" })
      .click()

    // Get page after a specific action (e.g. clicking a link)
    const [popupPage] = await Promise.all([
      context.waitForEvent("page"),
      await dappPage.locator("text=Injected").click(), // Opens a new tab
    ])
    await popupPage.waitForLoadState()

    await popupPage.locator("button", { hasText: "Connect" }).click()

    await walletPageHelper.goToStartPage()

    await page.locator('text="Settings"').click()
    await page.locator("text=Connected websites").click()

    await page.locator('xpath=//li[contains(., "CoW Swap")]//button').click()
  })
})
