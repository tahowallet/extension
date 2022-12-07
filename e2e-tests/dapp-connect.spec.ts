import { tallyHoTest } from "./utils"

tallyHoTest("dapp connect", async ({ page, context, extensionId }) => {
  const passwd = "VoXaXa!239"
  const recoveryPhrase =
    "tilt ski leave code make fantasy rifle learn wash quiz youth inside promote garlic cat album tell pass between hub brush evolve staff imitate"

  await page.goto(`chrome-extension://${extensionId}/popup.html`)
  await page.locator("text=Continue").click()
  await page.locator("text=Continue").click()
  await page.locator("text=Import recovery phrase").click()

  await page.locator("input").first().type(passwd)
  await page.locator("input").last().type(passwd)

  await page.locator("text=Begin the hunt").click()

  await page.locator("textarea").type(recoveryPhrase)

  await page.locator("button", { hasText: "Import account" }).click()

  const dappPage = await context.newPage()
  await dappPage.goto("https://cowswap.app/")
  await dappPage.locator("text=Connect").click()

  // Get page after a specific action (e.g. clicking a link)
  const [popupPage] = await Promise.all([
    context.waitForEvent("page"),
    await dappPage.locator("text=Metamask").click(), // Opens a new tab
  ])
  await popupPage.waitForLoadState()

  await popupPage.locator("button", { hasText: "Connect" }).click()

  await page.bringToFront()
  await page.locator('text="Settings"').click()
  await page.locator("text=Connected websites").click()

  // The timeouts are here only to pause and show that we are connected/disconnected and can be removed
  await page.waitForTimeout(2000)
  await page.locator('xpath=//li[contains(., "CowSwap")]//button').click()
  await page.waitForTimeout(2000)

  /*
  console.log('Extention page video: ' + await page.video().path());
  console.log('Popup page video: ' + await popupPage.video().path());
  console.log('Dapp page video: ' + await dappPage.video().path());
  */
})
