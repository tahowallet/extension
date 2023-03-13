/* eslint-disable no-empty-pattern */
import { test as base, chromium, Page } from "@playwright/test"
import { FeatureFlagType, isEnabled } from "@tallyho/tally-background/features"
import path from "path"

// Re-exporting so we don't mix imports
export { expect } from "@playwright/test"

export class WalletPageHelper {
  readonly url: string

  constructor(public readonly page: Page, public readonly extensionId: string) {
    this.url = `chrome-extension://${extensionId}/popup.html`
  }

  async goToStartPage(): Promise<void> {
    await this.page.goto(this.url)
  }

  async navigateTo(tab: string): Promise<void> {
    await this.page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: tab })
      .click()
  }

  async onboardReadOnlyAddress(address: string): Promise<void> {
    await base.step("Onboard w/ReadOnly address", async () => {
      await this.goToStartPage()
      await this.page.getByRole("button", { name: "Continue" }).click()
      await this.page.getByRole("button", { name: "Continue" }).click()
      await this.page
        .getByRole("button", {
          name: "Read-only address",
        })
        .click()
      await this.page.getByRole("textbox").fill(address)
      await this.page.getByRole("button", { name: "Explore Taho" }).click()
    })
  }
}

type WalletTestFixtures = {
  extensionId: string
  walletPageHelper: WalletPageHelper
  backgroundPage: Page
}

/**
 * Extended instance of playwright's `test` with our fixtures
 */
export const test = base.extend<WalletTestFixtures>({
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
  backgroundPage: async ({ context }, use) => {
    // for manifest v2:
    let [background] = context.backgroundPages()
    if (!background) background = await context.waitForEvent("backgroundpage")

    await background.route(/app\.posthog\.com/i, async (route) =>
      route.fulfill({ json: { status: 1 } })
    )

    await background.waitForResponse(/api\.coingecko\.com/i)

    // // for manifest v3:
    // let [background] = context.serviceWorkers();
    // if (!background)
    //   background = await context.waitForEvent("serviceworker");
    await use(background)
  },
  extensionId: async ({ backgroundPage }, use) => {
    const extensionId = backgroundPage.url().split("/")[2]
    await use(extensionId)
  },
  walletPageHelper: async ({ page, extensionId }, use) => {
    const walletOnboarding = new WalletPageHelper(page, extensionId)
    await use(walletOnboarding)
  },
})

export async function createWallet(
  page: Page,
  extensionId: string
): Promise<void> {
  await page.goto(`chrome-extension://${extensionId}/popup.html`)

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

export const skipIfFeatureFlagged = (featureFlag: FeatureFlagType): void =>
  test.skip(
    !isEnabled(featureFlag, false),
    `Feature Flag: ${featureFlag} has not been turned on for this run`
  )
