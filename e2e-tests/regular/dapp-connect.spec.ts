import { test } from "../utils"

test("dapp connect", async ({ page, context, walletPageHelper }) => {
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

  await popupPage.locator("button", { hasText: "Connect" }).click()

  await walletPageHelper.goToStartPage()

  await page.locator('text="Settings"').click()
  await page.locator("text=Connected websites").click()

  await page.locator('xpath=//li[contains(., "CoW Swap")]//button').click()
})
