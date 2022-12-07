import { test as base, BrowserContext, chromium, Page } from "@playwright/test"
import path from "path"

export const tallyHoTest = base.extend<{
  context: BrowserContext
  extensionId: string
}>({
  /* eslint-disable-next-line no-empty-pattern */
  context: async ({}, use) => {
    const pathToExtension = path.resolve(__dirname, "../dist/chrome")
    const context = await chromium.launchPersistentContext("", {
      // set to some path in order to store browser session data
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    })
    await use(context)
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    // for manifest v2:
    let [background] = context.backgroundPages()
    if (!background) background = await context.waitForEvent("backgroundpage")

    /*
      // for manifest v3:
      let [background] = context.serviceWorkers();
      if (!background)
        background = await context.waitForEvent("serviceworker");
      */

    const extensionId = background.url().split("/")[2]
    await use(extensionId)
  },
})

export async function createWallet(
  page: Page,
  extensionId: string
): Promise<void> {
  await page.goto(`chrome-extension://${extensionId}/popup.html`)
  // await expect(page.locator("body")).toHaveText("my-extension popup");

  const passwd = "VoXaXa!239"

  await page.locator("text=Continue").click()
  await page.locator("text=Continue").click()

  await page.locator("text=Create new wallet").click()

  await page.locator("input").first().type(passwd)
  await page.locator("input").last().type(passwd)

  await page.locator("text=Begin the hunt").click()

  await page.locator("text=Reveal my secret recovery phrase").click()

  function extractWords(wordsHtml: string) {
    return wordsHtml
      .replace(/<[^>]*>?/gm, " ")
      .trim()
      .split(" ")
  }

  const wordsDivs = await page.locator("div.column.words")
  let words = extractWords(await wordsDivs.nth(0).innerHTML())
  words = words.concat(extractWords(await wordsDivs.nth(1).innerHTML()))

  /*
    const words = await page.$$eval('.column.words', word_divs => {
        return word_divs.map(div => div.innerHTML.replace(/<[^>]*>?/gm, ' ')
                        .trim()
                        .split(' '))
                        .flat();
        });
*/

  // console.log(words)
  await page.locator("text=I wrote it down").click()

  const wordContainers = await page.locator(".word_index")
  const count = await wordContainers.count()

  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < count; i += 1) {
    const el = wordContainers.nth(i)
    const idx = parseInt((await el.allInnerTexts())[0], 10) - 1
    const word = words[idx]
    // console.log(idx, word)

    // 1. gas, gasp... need exact text match
    // 2. a word can repeat multiple times - always return the first match
    await page.locator(`button.small :text("${word}")`).nth(0).click()
  }
  /* eslint-enable no-await-in-loop */
  await page.locator("text=Verify recovery phrase").click()
  await page.locator("text=Take me to my wallet").click()
}
