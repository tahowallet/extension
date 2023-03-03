import { BrowserContext } from "@playwright/test"
import { FeatureFlags } from "@tallyho/tally-background/features"
// eslint-disable-next-line import/no-extraneous-dependencies
import { Wallet } from "ethers"
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

  test("User can onboard with a existing seed-phrase", async ({
    context,
    page: popup,
    walletPageHelper,
  }) => {
    const wallet = Wallet.createRandom()
    const page = await getOnboardingPage(context)

    await page.getByRole("button", { name: "Use existing wallet" }).click()
    await page.getByRole("button", { name: "Import recovery phrase" }).click()
    await page.locator('input[name="password"]').fill("12345678")
    await page.locator('input[name="confirm_password"]').fill("12345678")
    await page.getByRole("button", { name: "Begin the hunt" }).click()

    await page
      .getByRole("textbox", { name: "Input recovery phrase" })
      .fill(wallet.mnemonic.phrase)

    await page.getByRole("button", { name: "Import account" }).click()
    await expect(
      page.getByRole("heading", { name: "Welcome to Taho" })
    ).toBeVisible()

    await popup.bringToFront()
    await walletPageHelper.setViewportSize()
    await walletPageHelper.goToStartPage()

    await popup.getByTestId("top_menu_profile_button").last().hover()

    await popup.getByRole("button", { name: "Copy address" }).click()

    const address = await popup.evaluate(() => navigator.clipboard.readText())

    expect(address.toLowerCase()).toEqual(wallet.address.toLowerCase())
  })
})
