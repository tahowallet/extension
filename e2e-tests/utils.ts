/* eslint-disable no-empty-pattern */
import { test as base, chromium, Page, Request, Worker } from "@playwright/test"
import path from "path"
import WalletPageHelper from "./utils/walletPageHelper"
import AssetsHelper from "./utils/assets"
import TransactionsHelper from "./utils/transactions"

// Re-exporting so we don't mix imports
export { expect } from "@playwright/test"

type WalletTestFixtures = {
  extensionId: string
  walletPageHelper: WalletPageHelper
  assetsHelper: AssetsHelper
  transactionsHelper: TransactionsHelper
  backgroundPage: Worker
  isExtensionRequest: (request: Request) => boolean
  waitForExtensionPage: () => Promise<Page>
  localNodeAlive: boolean
}

/**
 * Extended instance of playwright's `test` with our fixtures
 */
export const test = base.extend<WalletTestFixtures>({
  localNodeAlive: async ({ request }, use) => {
    const alive = await request.get("http://127.0.0.1:8545").catch(() => false)

    await use(!!alive)
  },

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
  backgroundPage: async ({ context, isExtensionRequest }, use) => {
    let [background] = context.serviceWorkers()
    if (!background) background = await context.waitForEvent("serviceworker")

    // Intercept all posthog requests from extension sources
    await context.route(/app\.posthog\.com/i, async (route, request) => {
      if (isExtensionRequest(request)) {
        route.fulfill({ json: { status: 1 } })
      }
    })

    await use(background)
  },
  extensionId: async ({ backgroundPage }, use) => {
    const extensionId = backgroundPage.url().split("/")[2]
    await use(extensionId)
  },
  waitForExtensionPage: async ({ context, extensionId }, use) => {
    await use(async () =>
      context.waitForEvent("page", (page) => page.url().includes(extensionId)),
    )
  },
  isExtensionRequest: async ({}, use) => {
    const hasExtensionOrigin = (url: string) =>
      /^chrome-extension:\/\//.test(url)

    await use((request) => {
      const worker = request.serviceWorker()
      const isWorkerRequest = worker && hasExtensionOrigin(worker.url())

      return isWorkerRequest || hasExtensionOrigin(request.frame().url())
    })
  },
  walletPageHelper: async ({ page, context, extensionId }, use) => {
    const helper = new WalletPageHelper(page, context, extensionId)
    await use(helper)
  },
  assetsHelper: async ({ page, walletPageHelper, context }, use) => {
    const helper = new AssetsHelper(page, walletPageHelper, context)
    await use(helper)
  },
  transactionsHelper: async ({ page, walletPageHelper }, use) => {
    const helper = new TransactionsHelper(page, walletPageHelper)
    await use(helper)
  },
})
