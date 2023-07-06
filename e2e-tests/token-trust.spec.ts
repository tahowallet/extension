import { FeatureFlags } from "@tallyho/tally-background/features"
import { skipIfFeatureFlagged, test, expect } from "./utils"
import { account1Name, account2Name } from "./utils/onboarding"

skipIfFeatureFlagged(FeatureFlags.SUPPORT_UNVERIFIED_ASSET)

// This test verifies functionalites of verified/unverified tokens using a
// publicly known Mainnet wallet 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266.
// The wallet at the moment of writing the test owns several trusted and
// untrusted tokens. It may happen that those assets will be moved and we will
// need to update the test to reflect new state. In the future, if the bug
// https://github.com/tahowallet/extension/issues/3437 gets fixed, we may want
// to switch to testing on a forked Mainnet (at fixed block), which would
// increase stability of the test.
test.describe("Token Trust", () => {
  test("User can mark tokens as trusted/untrusted", async ({
    walletPageHelper,
    page: popup,
    assetsHelper,
  }) => {
    await test.step("Import account and add addresses", async () => {
      /**
       * Onboard using walletPageHelper, with testertesting.eth account.
       */
      const recoveryPhrase = process.env.RECOVERY_PHRASE
      if (recoveryPhrase) {
        await walletPageHelper.onboardWithSeedPhrase(recoveryPhrase)
      } else {
        throw new Error("RECOVERY_PHRASE environment variable is not defined.")
      }

      await walletPageHelper.goToStartPage()
      await walletPageHelper.setViewportSize()

      /**
       * Verify we're on Ethereum network. Verify common elements on the main page.
       */
      await walletPageHelper.verifyCommonElements(
        /^Ethereum$/,
        false,
        account2Name
      )
      await walletPageHelper.verifyAnalyticsBanner()

      /**
       * Add addresses to the wallet.
       */
      await walletPageHelper.addAddressToAccount("Import 1")
      await walletPageHelper.addAddressToAccount("Import 1")

      /**
       * Switch to the 3rd address of the `Import 1` wallet.
       */
      await walletPageHelper.switchToAddress("Import 1", 3, account1Name)

      /**
       * Switch to the Polygon network.
       */
      await walletPageHelper.switchNetwork(/^Polygon$/)
      await walletPageHelper.waitForAssetsToLoad(240000)

      /**
       * Verify that `Show unverified assets` is OFF by default.
       */
      await popup
        .getByLabel("Main")
        .getByText("Settings", { exact: true })
        .click()
      await assetsHelper.assertShowUnverifiedAssetsSetting(false)
      await popup
        .getByLabel("Main")
        .getByText("Wallet", { exact: true })
        .click()

      /**
       * Ensure the base asset is visible and is not unverified.
       */
      await assetsHelper.assertVerifiedAssetOnWalletPage(/^MATIC$/, "base")

      /**
       * Ensure there are no fields related to unverified assets in the
       * base asset's details.
       */
      await popup.locator(".asset_list_item").first().click() // We use `.first()` because the base asset should be first on the list
      await assetsHelper.assertAssetDetailsPage(
        /^Polygon$/,
        account1Name,
        /^MATIC$/,
        /^(\d|,)+(\.\d{2,4})*$/,
        "base"
      )
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Ensure the ERC-20 asset is visible and is not unverified.
       */
      await popup
        .locator(".asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^WMATIC$/ }),
        })
        .click({ trial: true })
      await assetsHelper.assertVerifiedAssetOnWalletPage(
        /^WMATIC$/,
        "knownERC20"
      )

      /**
       * Ensure there are no fields related to unverified assets in the
       * ERC-20 asset's details.
       */
      await popup
        .locator(".asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^WMATIC$/ }),
        })
        .click()
      await assetsHelper.assertAssetDetailsPage(
        /^Polygon$/,
        account1Name,
        /^WMATIC$/,
        /^(\d|,)+(\.\d{2,4})*$/,
        "knownERC20",
        "https://polygonscan.com/token/0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
      )
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Ensure there are no unverified assets on the main page.
       */
      await assetsHelper.assertNoUnverifiedAssetsOnWalletPage()

      // In order for the next few tests to make sense the wallet address should
      // have a positive balance of at least one of the listed assets. At the
      // moment of writing the test, the wallet had positive balance for all
      // those assets.
      const untrustedAssets = [
        "BANANA",
        "Claim USDC/WETH at https://USDCpool.cloud",
        "pAAVE",
      ]

      /**
       * Verify there are no unverified assets on the Send screen.
       */
      await popup.getByLabel("Send", { exact: true }).click()
      await popup.getByTestId("selected_asset_button").click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(untrustedAssets)
      await assetsHelper.closeSelectTokenPopup()
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Verify there are no unverified assets on the Swap screen.
       */
      await popup.getByLabel("Swap", { exact: true }).click()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .first()
        .click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(untrustedAssets)
      await assetsHelper.closeSelectTokenPopup()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .nth(1)
        .click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(untrustedAssets)
      await assetsHelper.closeSelectTokenPopup()
    })

    await test.step("Enable `Show unverified assets`", async () => {
      /**
       * Toggle `Show unverified assets` and make sure it's ON
       */
      await popup
        .getByLabel("Main")
        .getByText("Settings", { exact: true })
        .click()
      await assetsHelper.toggleShowUnverifaiedAssetsSetting()
      await assetsHelper.assertShowUnverifiedAssetsSetting(true)
      await popup
        .getByLabel("Main")
        .getByText("Wallet", { exact: true })
        .click()

      /**
       * Ensure the base asset is visible and is not unverified.
       */
      await assetsHelper.assertVerifiedAssetOnWalletPage(/^MATIC$/, "base")

      /**
       * Ensure there are no fields related to unverified assets in the
       * base asset's details.
       */
      await popup.getByTestId("asset_list_item").first().click() // We use `.first()` because the base asset should be first on the list
      await assetsHelper.assertAssetDetailsPage(
        /^Polygon$/,
        account1Name,
        /^MATIC$/,
        /^(\d|,)+(\.\d{2,4)*$/,
        "base"
      )
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Ensure the verified ERC-20 asset is visible and is not unverified.
       */
      await popup
        .getByTestId("asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^WMATIC$/ }),
        })
        .click({ trial: true })
      await assetsHelper.assertVerifiedAssetOnWalletPage(
        /^WMATIC$/,
        "knownERC20"
      )

      /**
       * Ensure there are no fields related to unverified assets in the verified
       * ERC-20 asset's details.
       */
      await popup
        .getByTestId("asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^WMATIC$/ }),
        })
        .click()
      await assetsHelper.assertAssetDetailsPage(
        /^Polygon$/,
        account1Name,
        /^WMATIC$/,
        /^(\d|,)+(\.\d{2,4})*$/,
        "knownERC20",
        "https://polygonscan.com/token/0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
      )
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Ensure there are unverified assets on the main page.
       */
      await assetsHelper.assertUnverifiedAssetsPresentOnWalletPage()

      /**
       * Ensure there are fields related to unverified assets in the unverified
       * ERC-20 asset's details.
       */
      await popup
        .getByRole("button", { name: /^See unverified assets \(\d+\)$/ })
        .click()
      await popup
        .getByTestId("asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^BANANA$/ }),
        })
        .click()
      await assetsHelper.assertAssetDetailsPage(
        /^Polygon$/,
        account1Name,
        /^BANANA$/,
        /^(\d|,)+(\.\d{2,4})*$/,
        "unverified",
        "https://polygonscan.com/token/0x5d47baba0d66083c52009271faf3f50dcc01023c",
        "0x5d47…1023c"
      )
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      // In order for the next few tests to make sense the wallet address should
      // have a positive balance of at least one of the listed assets. At the
      // moment of writing the test, the wallet had positive balance for all those
      // assets.
      const untrustedAssets = [
        "BANANA",
        "Claim USDC/WETH at https://USDCpool.cloud",
        "pAAVE",
      ]

      /**
       * Verify there are no unverified assets on the Send screen.
       */
      await popup.getByLabel("Send", { exact: true }).click()
      await popup.getByTestId("selected_asset_button").click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(untrustedAssets)
      await assetsHelper.closeSelectTokenPopup()
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Verify there are no unverified assets on the Swap screen.
       */
      await popup.getByLabel("Swap", { exact: true }).click()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .first()
        .click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(untrustedAssets)
      await assetsHelper.closeSelectTokenPopup()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .nth(1)
        .click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(untrustedAssets)
      await assetsHelper.closeSelectTokenPopup()
    })

    await test.step("Hide asset", async () => {
      /**
       * Click `Don't show` on unverified ERC-20 asset
       */
      await popup
        .getByLabel("Main")
        .getByText("Wallet", { exact: true })
        .click()

      await popup
        .getByRole("button", { name: /^See unverified assets \(\d+\)$/ })
        .click()
      await popup
        .getByTestId("asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^pAAVE$/ }),
        })
        .click()
      await popup.getByRole("button", { name: "Verify asset" }).first().click()
      await popup
        .getByRole("button", { name: "Don’t show", exact: true })
        .click()

      /**
       * Confirm there is `Asset removed from list` snackbar visible.
       */
      // Sometimes the snackbar is not displayed, the DOM looks like this:
      // <div class="jsx-2495026369 snackbar_container hidden">
      //   <div class="jsx-2495026369 snackbar_wrap">Asset removed from list</div>
      // </div>
      // The below check does not fail in such case.
      // TODO: Check if this can be improved. Or if bug should be raised.
      // TODO: Sometimes below assertion fails because element is not present in
      // DOM. Raise a bug?
      //   await expect(
      //     popup.getByText("Asset removed from list").first()
      //   ).toBeVisible({ timeout: 5000 })

      /**
       * Make sure `Wallet` page is opened and there are unverified assets shown
       */
      await walletPageHelper.verifyCommonElements(
        /^Polygon$/,
        false,
        account1Name
      )
      await walletPageHelper.verifyAnalyticsBanner()
      await assetsHelper.assertVerifiedAssetOnWalletPage(/^MATIC$/, "base")
      await assetsHelper.assertUnverifiedAssetsPresentOnWalletPage()

      /**
       * Make sure the recelntly hidden asset "pAAVE" is no longer shown on the
       * `Wallet` page.
       */
      await expect(
        popup.getByTestId("asset_list_item").filter({
          has: popup.locator("span").filter({ hasText: /^pAAVE$/ }),
        })
      ).not.toBeVisible()

      /**
       * Verify there is no "pAAVE" asset on the Send screen.
       */
      await popup.getByLabel("Send", { exact: true }).click()
      await popup.getByTestId("selected_asset_button").click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(["pAAVE"])
      await assetsHelper.closeSelectTokenPopup()
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Verify there is no "pAAVE" asset on the Swap screen.
       */
      await popup.getByLabel("Swap", { exact: true }).click()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .first()
        .click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(["pAAVE"])
      await assetsHelper.closeSelectTokenPopup()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .nth(1)
        .click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(["pAAVE"])
      await assetsHelper.closeSelectTokenPopup()
    })

    await test.step("Trust asset", async () => {
      /**
       * Click `Add to asset list` on unverified ERC-20 asset
       */
      await popup
        .getByLabel("Main")
        .getByText("Wallet", { exact: true })
        .click()

      await popup
        .getByRole("button", { name: /^See unverified assets \(\d+\)$/ })
        .click()
      await popup
        .getByTestId("asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^BANANA$/ }),
        })
        .click()
      await popup.getByRole("button", { name: "Verify asset" }).first().click()
      await popup
        .getByRole("button", { name: "Add to asset list", exact: true })
        .click()

      /**
       * Confirm there is `Asset added to list` snackbar visible.
       */
      // TODO: Sometimes below assertion fails because element is not present in
      // DOM. Raise a bug?
      //   await expect(popup.getByText("Asset added to list").first()).toBeVisible({
      //     timeout: 5000,
      //   })

      /**
       * Confirm asset's details are opened. Ensure there are fields related to
       * trusted assets in the trusted ERC-20 asset's details.
       */
      await assetsHelper.assertAssetDetailsPage(
        /^Polygon$/,
        account1Name,
        /^BANANA$/,
        /^(\d|,)+(\.\d{2,4})*$/,
        "trusted",
        "https://polygonscan.com/token/0x5d47baba0d66083c52009271faf3f50dcc01023c",
        "0x5d47…1023c"
      )

      /**
       * Go to `Wallet` page and make sure the recently trusted asset is visible
       * among verified assets.
       */
      await popup.getByRole("button", { name: "Back", exact: true }).click()
      await assetsHelper.assertVerifiedAssetOnWalletPage(/^BANANA$/, "trusted")

      /**
       * Verify recently trusted asset is available on the Send screen.
       */
      await popup.getByLabel("Send", { exact: true }).click()
      await popup.getByTestId("selected_asset_button").click()
      await assetsHelper.assertAssetsPresentOnAssetsList(["BANANA"])
      await assetsHelper.closeSelectTokenPopup()
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Verify recently trusted asset is available on the Swap screen.
       */
      await popup.getByLabel("Swap", { exact: true }).click()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .first()
        .click()
      await assetsHelper.assertAssetsPresentOnAssetsList(["BANANA"])
      await assetsHelper.closeSelectTokenPopup()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .nth(1)
        .click()
      await assetsHelper.assertAssetsPresentOnAssetsList(["BANANA"])
      await assetsHelper.closeSelectTokenPopup()
    })

    await test.step("Hide trusted asset", async () => {
      /**
       * Click `Don't show` on trusted ERC-20 asset
       */
      await popup
        .getByLabel("Main")
        .getByText("Wallet", { exact: true })
        .click()

      await popup
        .getByTestId("asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^BANANA$/ }),
        })
        .click()
      await popup.getByRole("button", { name: "Verified by you" }).click()
      await popup
        .getByRole("button", { name: "Don’t show", exact: true })
        .click()

      /**
       * Confirm there is `Asset removed from list` snackbar visible.
       */
      // Sometimes the snackbar is not displayed, the DOM looks like this:
      // <div class="jsx-2495026369 snackbar_container hidden">
      //   <div class="jsx-2495026369 snackbar_wrap">Asset removed from list</div>
      // </div>
      // The below check does not fail in such case.
      // TODO: Check if this can be improved. Or if bug should be raised.
      // TODO: Sometimes below assertion fails because element is not present in
      // DOM. Raise a bug?
      //   await expect(
      //     popup.getByText("Asset removed from list").first()
      //   ).toBeVisible({ timeout: 5000 })

      /**
       * Make sure `Wallet` page is opened and there are unverified assets shown
       */
      await walletPageHelper.verifyCommonElements(
        /^Polygon$/,
        false,
        account1Name
      )
      await walletPageHelper.verifyAnalyticsBanner()
      await assetsHelper.assertVerifiedAssetOnWalletPage(/^MATIC$/, "base")
      await assetsHelper.assertUnverifiedAssetsPresentOnWalletPage()

      /**
       * Make sure the recelntly hidden asset "BANANA" is no longer shown on the
       * `Wallet` page.
       */
      await expect(
        popup.getByTestId("asset_list_item").filter({
          has: popup.locator("span").filter({ hasText: /^BANANA$/ }),
        })
      ).not.toBeVisible()

      /**
       * Verify there is no "BANANA" asset on the Send screen.
       */
      await popup.getByLabel("Send", { exact: true }).click()
      await popup.getByTestId("selected_asset_button").click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(["BANANA"])
      await assetsHelper.closeSelectTokenPopup()
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Verify there is no "BANANA" asset on the Swap screen.
       */
      await popup.getByLabel("Swap", { exact: true }).click()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .first()
        .click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(["BANANA"])
      await assetsHelper.closeSelectTokenPopup()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .nth(1)
        .click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(["BANANA"])
      await assetsHelper.closeSelectTokenPopup()
    })
  })

  // Other tests that can be added in the future:
  // - Hide or trust all unverified assets (make sure there's no `See
  //   unverified assets` section)
  // - Add a custom asset and verify how it's displayed when it comes to
  //   verified/unverified aspects (can be done in a separate tests file for
  //   custom assets tests)
  // - Verify `Show unverified assets` setting applies to all wallets (may
  //   be done in a separate tests file for Settings tests)
  // - Verify that `Asset not verified` banner can be dismissed and that this
  //   gets remembered.
})
