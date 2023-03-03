import { BrowserContext } from "@playwright/test"
import { FeatureFlags } from "@tallyho/tally-background/features"
import { skipIfFeatureFlagged, test, expect } from "./utils"

skipIfFeatureFlagged(FeatureFlags.SUPPORT_TABBED_ONBOARDING)

const getOnboardingPage = async (context: BrowserContext) => {
  await expect(async () => {
    const pages = context.pages()
    const onboarding = pages.find((page) => /onboarding/.test(page.url()))

    if (!onboarding) {
      throw new Error("Unable to find onboarding tab")
    }

    expect(onboarding).toHaveURL(/onboarding/)
  }).toPass()

  const onboarding = context.pages().slice(-1)[0]

  return onboarding
}

test.describe("Onboarding", () => {
  test("User can onboard a read-only address", async ({
    context,
    page: popup,
    walletPageHelper,
  }) => {
    const readOnlyAddress = "testertesting.eth"
    const page = await getOnboardingPage(context)

    await page.getByRole("button", { name: "Use existing wallet" }).click()
    await page.getByRole("button", { name: "Read-only address" }).click()
    await page.getByRole("textbox").fill(readOnlyAddress)
    await page.getByRole("button", { name: "Preview Taho" }).click()

    await expect(
      page.getByRole("heading", { name: "Welcome to Taho" })
    ).toBeVisible()

    await popup.bringToFront()
    await walletPageHelper.setViewportSize()
    await walletPageHelper.goToStartPage()

    await expect(async () => {
      await expect(
        popup.getByTestId("top_menu_profile_button").last()
      ).toHaveText(readOnlyAddress)
    }).toPass()

    expect(popup.getByTestId("wallet_balance").innerText()).not.toContain("$0")
  })
})
