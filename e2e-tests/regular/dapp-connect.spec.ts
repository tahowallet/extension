import { test, expect } from "../utils"

test.describe("dApp Connections", () => {
  test("should display an informational popup for Taho as default on first connection", async ({
    context,
    walletPageHelper,
  }) => {
    await walletPageHelper.onboarding.addReadOnlyAccount("testertesting.eth")

    const dappPage = await context.newPage()
    await dappPage.goto("https://swap.cow.fi/")
    await dappPage
      .getByRole("button", { name: "Connect Wallet" })
      .first()
      .click()

    const popupPage = walletPageHelper.getConnectPopup()
    // Get page after a specific action (e.g. clicking a link)
    await dappPage.locator("text=Injected").click() // Opens a new tab

    await popupPage.ready()

    await popupPage.hideDappConnectPopup()

    await popupPage.rejectConnection()

    await dappPage.close()

    const dappPage2 = await context.newPage()
    await dappPage2.goto("https://swap.cow.fi/")
    await dappPage2
      .getByRole("button", { name: "Connect Wallet" })
      .first()
      .click()

    const popup2 = walletPageHelper.getConnectPopup()

    await dappPage2.locator("text=Injected").click() // Opens a new tab
    // Get page after a specific action (e.g. clicking a link)

    await popup2.ready()

    // Check that the popup is no longer displayed.
    const connectingPopupTitle2 = popup2.page.locator("h3", {
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

    const dappPage = await context.newPage()
    await dappPage.goto("https://swap.cow.fi/")

    const popup = walletPageHelper.getConnectPopup()

    await dappPage
      .getByRole("button", { name: "Connect Wallet" })
      .first()
      .click()

    // Get page after a specific action (e.g. clicking a link)
    await dappPage.locator("text=Injected").click() // Opens a new tab

    await popup.ready()
    await popup.hideDappConnectPopup()
    await popup.acceptConnection()

    await walletPageHelper.goToStartPage()

    await page.locator('text="Settings"').click()
    await page.locator("text=Connected websites").click()

    await page.locator('xpath=//li[contains(., "CoW Swap")]//button').click()
  })
})
