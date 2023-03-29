import { test } from "./utils"

test("Remove wallet", async ({ page, walletPageHelper }) => {
  await walletPageHelper.onboarding.addNewWallet()
  await walletPageHelper.goToStartPage()

  await page.locator(".profile_button").nth(1).click()
  await page.locator(".icon_settings").click()
  await page.locator("text=Remove address").click()
  await page.locator("text=Yes, I want to remove it").click()
})
