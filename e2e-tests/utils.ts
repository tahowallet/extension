/* eslint-disable no-empty-pattern */
import { test as base, chromium, Page } from "@playwright/test"
import { FeatureFlagType, isEnabled } from "@tallyho/tally-background/features"
import path from "path"
import WalletPageHelper from "./utils/walletPageHelper"

// Re-exporting so we don't mix imports
export { expect } from "@playwright/test"

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
      permissions: ["clipboard-read", "clipboard-write"],
    })
    await use(context)
    await context.close()
  },
  backgroundPage: async ({ context }, use) => {
    // for manifest v2:
    let [background] = context.backgroundPages()
    if (!background) background = await context.waitForEvent("backgroundpage")

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
  walletPageHelper: async ({ page, context, extensionId }, use) => {
    const helper = new WalletPageHelper(page, context, extensionId)
    await use(helper)
  },
})

export const skipIfFeatureFlagged = (featureFlag: FeatureFlagType): void =>
  test.skip(
    !isEnabled(featureFlag, false),
    `Feature Flag: ${featureFlag} has not been turned on for this run`
  )
