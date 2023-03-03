import { createWallet, test } from "./utils"

test("Remove wallet", async ({ page, extensionId }) => {
  await createWallet(page, extensionId)
  await page.locator(".profile_button").nth(1).click()
  await page.locator(".icon_settings").click()
  await page.locator("text=Remove address").click()
  await page.locator("text=Yes, I want to remove it").click()
})
