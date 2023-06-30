import { wait } from "@tallyho/tally-background/lib/utils"
import { test, expect } from "./utils"
import { account1Address, account1Name } from "./utils/onboarding"

test.describe("NFTs", () => {
  test("User can view nft collections, poaps and badges", async ({
    page,
    backgroundPage,
    walletPageHelper,
  }) => {
    await test.step("Shows loading state", async () => {
      let shouldInterceptRequests = true

      // Set a delay so we don't miss loading states
      await backgroundPage.route(/api\.simplehash\.com/i, async (route) => {
        if (!shouldInterceptRequests) {
          route.continue()
          return
        }

        const response = await route.fetch().catch((err) => {
          // Waiting for the response doesn't prevent context disposed errors
          // consistently
          if (
            err instanceof Error &&
            err.message.includes("Request context disposed")
          ) {
            // noop
          } else {
            throw err
          }
        })

        if (response) {
          await wait(800)
          await route.fulfill({ response })
        }
      })

      await walletPageHelper.onboarding.addReadOnlyAccount(account1Address)

      await walletPageHelper.goToStartPage()
      await walletPageHelper.setViewportSize()

      // Switch to Optimism, then to Polygon and then to Arbitrum (to load NFTs
      // on those chains).
      await page.getByTestId("top_menu_network_switcher").last().click()
      await page.getByText(/^Optimism$/).click()
      await page.getByTestId("top_menu_network_switcher").last().click()
      await page.getByText(/^Polygon$/).click()
      await page.getByTestId("top_menu_network_switcher").last().click()
      await page.getByText(/^Arbitrum$/).click()

      await walletPageHelper.navigateTo("NFTs")
    })

    await test.step("Filtering accounts", async () => {
      await page.getByRole("button", { name: "Filter collections" }).click()

      await page
        .getByTestId("nft_account_filters")
        .filter({
          hasText: account1Name,
        })
        .getByRole("checkbox")
        .click()
    })
  })
})
