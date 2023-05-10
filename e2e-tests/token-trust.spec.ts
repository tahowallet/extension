import { FeatureFlags } from "@tallyho/tally-background/features"
import { skipIfFeatureFlagged, test, expect } from "./utils"

skipIfFeatureFlagged(FeatureFlags.SUPPORT_ASSET_TRUST)

test.describe("Token Trust", () => {
  test("User can mark tokens as trusted/untrusted", async ({
    walletPageHelper,
    page,
  }) => {
    await walletPageHelper.onboarding.addAccountFromSeed({
      phrase: "test test test test test test test test test test test junk",
    })

    await walletPageHelper.goToStartPage()
    await walletPageHelper.setViewportSize()

    // Base asset should not display trust actions
    await page.getByRole("link", { name: "ETH" }).first().click()

    await expect(
      page.getByRole("button", { name: "Asset not verified" })
    ).not.toBeVisible()

    await expect(
      page.getByRole("button", { name: "Hide asset" })
    ).not.toBeVisible()

    await expect(
      page.getByRole("button", { name: "Show asset" })
    ).not.toBeVisible()

    await expect(page.getByRole("button", { name: "Send" })).toBeEnabled()
    await expect(page.getByRole("button", { name: "Swap" })).toBeEnabled()

    await page.getByRole("button", { name: "Back" }).click()

    // Token list asset has baseline trust level but
    // can be marked as untrusted
    const tokenListAsset = page.getByRole("link", { name: "DAI" }).first()

    await tokenListAsset.click()

    await expect(
      page.getByRole("button", { name: "Asset not verified" })
    ).not.toBeVisible()

    await expect(page.getByRole("button", { name: "Hide asset" })).toBeVisible()

    await expect(
      page.getByRole("button", { name: "Send" }).first()
    ).toBeEnabled()
    await expect(
      page.getByRole("button", { name: "Swap" }).first()
    ).toBeEnabled()

    await page.getByRole("button", { name: "Hide asset" }).click()

    await expect(page.getByRole("button", { name: "Show asset" })).toBeVisible()

    await page.getByRole("button", { name: "Back" }).click()

    // await page.pause()
    await expect(page.getByRole("link", { name: "DAI" })).toBeHidden()

    const showHiddenAssetsBtn = page.getByRole("button", {
      name: "Show hidden assets",
      exact: false,
    })

    await showHiddenAssetsBtn.scrollIntoViewIfNeeded()

    await showHiddenAssetsBtn.click()

    await expect(tokenListAsset).toBeVisible()

    await tokenListAsset.click()

    await expect(
      page.getByRole("button", { name: "Send" }).first()
    ).toBeDisabled()
    await expect(
      page.getByRole("button", { name: "Swap" }).first()
    ).toBeDisabled()

    await page.getByRole("button", { name: "Show asset" }).click()
    await page.getByRole("button", { name: "Back" }).click()

    // Toggle hidden assets off
    const hideHiddenAssetsBtn = page.getByRole("button", {
      name: "Hide hidden assets",
      exact: false,
    })
    await hideHiddenAssetsBtn.scrollIntoViewIfNeeded()
    await hideHiddenAssetsBtn.click()

    await expect(tokenListAsset).toBeVisible()

    // Unverified asset can be trusted

    await showHiddenAssetsBtn.scrollIntoViewIfNeeded()
    await showHiddenAssetsBtn.click()

    const unverifiedAsset = page.getByRole("link", { name: "DANK" }).first()

    // Unverified Warning displays
    await expect(
      unverifiedAsset.getByRole("button", { name: "Asset isn't trusted" })
    ).toBeVisible()

    await unverifiedAsset.click()

    await expect(
      page.getByRole("button", { name: "Asset not verified" })
    ).toBeVisible()

    // Swap/Send actions are disabled
    await expect(
      page.getByRole("button", { name: "Send" }).first()
    ).toBeDisabled()
    await expect(
      page.getByRole("button", { name: "Swap" }).first()
    ).toBeDisabled()

    await page.getByRole("button", { name: "Asset not verified" }).click()

    await page
      .getByTestId("slide_up_menu")
      .getByRole("button", { name: "Trust asset" })
      .click()

    // Actions are enabled
    await expect(
      page.getByRole("button", { name: "Send" }).first()
    ).toBeEnabled()
    await expect(
      page.getByRole("button", { name: "Swap" }).first()
    ).toBeEnabled()

    // Asset can be marked as untrusted again
    await expect(page.getByRole("button", { name: "Hide asset" })).toBeVisible()

    await page.getByRole("button", { name: "Hide asset" }).click()

    // asset does not turn unverified after untrusting
    await expect(
      page.getByRole("button", { name: "Asset not verified" })
    ).not.toBeVisible()

    // Can be marked as trusted again
    await expect(page.getByRole("button", { name: "Show asset" })).toBeVisible()
  })
})
