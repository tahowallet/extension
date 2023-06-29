import { FeatureFlags } from "@tallyho/tally-background/features"
import { skipIfFeatureFlagged, test, expect } from "./utils"

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
    await test.step("Import account", async () => {
      await walletPageHelper.onboarding.addAccountFromSeed({
        phrase: "test test test test test test test test test test test junk",
      })

      await walletPageHelper.goToStartPage()
      await walletPageHelper.setViewportSize()

      /**
       * Verify we're on Ethereum network. Verify common elements on the main page.
       */
      await walletPageHelper.verifyCommonElements(
        /^Ethereum$/,
        /^(Phoenix|Matilda|Sirius|Topa|Atos|Sport|Lola|Foz)$/
      )
      await walletPageHelper.verifyAnalyticsBanner()

      setTimeout(() => {}, 500000) // wait for 5s

      /**
       * Verify that `Show unverified assets` is OFF by default.
       */
      await popup
        .locator(".tab_bar_wrap")
        .getByText("Settings", { exact: true })
        .click()
      await assetsHelper.assertShowUnverifiedAssetsSetting(false)
      await popup
        .locator(".tab_bar_wrap")
        .getByText("Wallet", { exact: true })
        .click()

      /**
       * Ensure the base asset is visible and is not unverified.
       */
      await assetsHelper.assertVerifiedAssetOnWalletPage(/^ETH$/, "base")

      /**
       * Ensure there are no fields related to unverified assets in the
       * base asset's details.
       */
      await popup.locator(".asset_list_item").first().click() // We use `.first()` because the base asset should be first on the list
      await assetsHelper.assertAssetDetailsPage(
        /^Ethereum$/,
        /^(Phoenix|Matilda|Sirius|Topa|Atos|Sport|Lola|Foz)$/,
        /^ETH$/,
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
          has: popup.locator("span").filter({ hasText: /^DAI$/ }),
        })
        .click({ trial: true })
      await assetsHelper.assertVerifiedAssetOnWalletPage(/^DAI$/, "knownERC20")

      /**
       * Ensure there are no fields related to unverified assets in the
       * ERC-20 asset's details.
       */
      await popup
        .locator(".asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^DAI$/ }),
        })
        .click()
      await assetsHelper.assertAssetDetailsPage(
        /^Ethereum$/,
        /^(Phoenix|Matilda|Sirius|Topa|Atos|Sport|Lola|Foz)$/,
        /^DAI$/,
        /^(\d|,)+(\.\d{2,4})*$/,
        "knownERC20",
        "https://etherscan.io/token/0x6b175474e89094c44da98b954eedeac495271d0f"
      )
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Ensure there are no unverified assets on the main page.
       */
      await assetsHelper.assertNoUnverifiedAssetsOnWalletPage()

      // In order for the next few tests to make sense the wallet address should
      // have a positive balance of at least one of the listed assets. At the
      // moment of writing the test, the wallet had positive balance for all those
      // assets.
      const untrustedAssets = [
        "DANK",
        "FOOL",
        "JIZZ",
        "M87",
        "PHIBA",
        "WLUNC",
        "WTF",
      ]

      /**
       * Verify there are no unverified assets on the Send screen.
       */
      await popup
        .getByRole("button", { name: "Send", exact: true })
        .first() // TODO: Investigate why we need it
        .click()
      await popup.getByTestId("selected_asset_button").click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(untrustedAssets)
      await assetsHelper.closeSelectTokenPopup()
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Verify there are no unverified assets on the Swap screen.
       */
      await popup.getByRole("button", { name: "Swap", exact: true }).click()
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
        .locator(".tab_bar_wrap")
        .getByText("Settings", { exact: true })
        .click()
      await assetsHelper.toggleShowUnverifaiedAssetsSetting()
      await assetsHelper.assertShowUnverifiedAssetsSetting(true)
      await popup
        .locator(".tab_bar_wrap")
        .getByText("Wallet", { exact: true })
        .click()

      /**
       * Ensure the base asset is visible and is not unverified.
       */
      await assetsHelper.assertVerifiedAssetOnWalletPage(/^ETH$/, "base")

      /**
       * Ensure there are no fields related to unverified assets in the
       * base asset's details.
       */
      await popup.locator(".asset_list_item").first().click() // We use `.first()` because the base asset should be first on the list
      await assetsHelper.assertAssetDetailsPage(
        /^Ethereum$/,
        /^(Phoenix|Matilda|Sirius|Topa|Atos|Sport|Lola|Foz)$/,
        /^ETH$/,
        /^(\d|,)+(\.\d{2,4)*$/,
        "base"
      )
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Ensure the verified ERC-20 asset is visible and is not unverified.
       */
      await popup
        .locator(".asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^DAI$/ }),
        })
        .click({ trial: true })
      await assetsHelper.assertVerifiedAssetOnWalletPage(/^DAI$/, "knownERC20")

      /**
       * Ensure there are no fields related to unverified assets in the verified
       * ERC-20 asset's details.
       */
      await popup
        .locator(".asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^DAI$/ }),
        })
        .click()
      await assetsHelper.assertAssetDetailsPage(
        /^Ethereum$/,
        /^(Phoenix|Matilda|Sirius|Topa|Atos|Sport|Lola|Foz)$/,
        /^DAI$/,
        /^(\d|,)+(\.\d{2,4})*$/,
        "knownERC20",
        "https://etherscan.io/token/0x6b175474e89094c44da98b954eedeac495271d0f"
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
        .locator(".asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^DANK$/ }),
        })
        .click()
      await assetsHelper.assertAssetDetailsPage(
        /^Ethereum$/,
        /^(Phoenix|Matilda|Sirius|Topa|Atos|Sport|Lola|Foz)$/,
        /^DANK$/,
        /^(\d|,)+(\.\d{2,4})*$/,
        "unverified",
        "https://etherscan.io/token/0x0cb8d0b37c7487b11d57f1f33defa2b1d3cfccfe",
        "0x0cb8…fccfe"
      )
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      // In order for the next few tests to make sense the wallet address should
      // have a positive balance of at least one of the listed assets. At the
      // moment of writing the test, the wallet had positive balance for all those
      // assets.
      const untrustedAssets = [
        "DANK",
        "FOOL",
        "JIZZ",
        "M87",
        "PHIBA",
        "WLUNC",
        "WTF",
      ]

      /**
       * Verify there are no unverified assets on the Send screen.
       */
      await popup.getByRole("button", { name: "Send", exact: true }).click()
      await popup.getByTestId("selected_asset_button").click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(untrustedAssets)
      await assetsHelper.closeSelectTokenPopup()
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Verify there are no unverified assets on the Swap screen.
       */
      await popup.getByRole("button", { name: "Swap", exact: true }).click()
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
        .locator(".tab_bar_wrap")
        .getByText("Wallet", { exact: true })
        .click()

      await popup
        .getByRole("button", { name: /^See unverified assets \(\d+\)$/ })
        .click()
      await popup
        .locator(".asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^DANK$/ }),
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
        /^Ethereum$/,
        /^(Phoenix|Matilda|Sirius|Topa|Atos|Sport|Lola|Foz)$/
      )
      await walletPageHelper.verifyAnalyticsBanner()
      await assetsHelper.assertVerifiedAssetOnWalletPage(/^ETH$/, "base")
      await assetsHelper.assertUnverifiedAssetsPresentOnWalletPage()

      /**
       * Make sure the recelntly hidden asset "DANK" is no longer shown on the
       * `Wallet` page.
       */
      await expect(
        popup.locator(".asset_list_item").filter({
          has: popup.locator("span").filter({ hasText: /^DANK$/ }),
        })
      ).not.toBeVisible()

      /**
       * Verify there is no "DANK" asset on the Send screen.
       */
      await popup.getByRole("button", { name: "Send", exact: true }).click()
      await popup.getByTestId("selected_asset_button").click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(["DANK"])
      await assetsHelper.closeSelectTokenPopup()
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Verify there is no "DANK" asset on the Swap screen.
       */
      await popup.getByRole("button", { name: "Swap", exact: true }).click()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .first()
        .click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(["DANK"])
      await assetsHelper.closeSelectTokenPopup()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .nth(1)
        .click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(["DANK"])
      await assetsHelper.closeSelectTokenPopup()
    })

    await test.step("Trust asset", async () => {
      /**
       * Click `Add to asset list` on unverified ERC-20 asset
       */
      await popup
        .locator(".tab_bar_wrap")
        .getByText("Wallet", { exact: true })
        .click()

      await popup
        .getByRole("button", { name: /^See unverified assets \(\d+\)$/ })
        .click()
      await popup
        .locator(".asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^WLUNC$/ }),
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
        /^Ethereum$/,
        /^(Phoenix|Matilda|Sirius|Topa|Atos|Sport|Lola|Foz)$/,
        /^WLUNC$/,
        /^(\d|,)+(\.\d{2,4})*$/,
        "trusted",
        "https://etherscan.io/token/0xd2877702675e6ceb975b4a1dff9fb7baf4c91ea9",
        "0xd287…91ea9"
      )
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Go to `Wallet` page and make sure the recently trusted asset is visible
       * among verified assets.
       */
      await popup
        .locator(".tab_bar_wrap")
        .getByText("Wallet", { exact: true })
        .click()
      await assetsHelper.assertVerifiedAssetOnWalletPage(/^WLUNC$/, "trusted")

      /**
       * Verify recently trusted asset is available on the Send screen.
       */
      await popup.getByRole("button", { name: "Send", exact: true }).click()
      await popup.getByTestId("selected_asset_button").click()
      await assetsHelper.assertAssetsPresentOnAssetsList(["WLUNC"])
      await assetsHelper.closeSelectTokenPopup()
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Verify recently trusted asset is available on the Swap screen.
       */
      await popup.getByRole("button", { name: "Swap", exact: true }).click()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .first()
        .click()
      await assetsHelper.assertAssetsPresentOnAssetsList(["WLUNC"])
      await assetsHelper.closeSelectTokenPopup()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .nth(1)
        .click()
      await assetsHelper.assertAssetsPresentOnAssetsList(["WLUNC"])
      await assetsHelper.closeSelectTokenPopup()
    })

    await test.step("Hide trusted asset", async () => {
      /**
       * Click `Don't show` on trusted ERC-20 asset
       */
      await popup
        .locator(".tab_bar_wrap")
        .getByText("Wallet", { exact: true })
        .click()

      await popup
        .locator(".asset_list_item")
        .filter({
          has: popup.locator("span").filter({ hasText: /^WLUNC$/ }),
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
        /^Ethereum$/,
        /^(Phoenix|Matilda|Sirius|Topa|Atos|Sport|Lola|Foz)$/
      )
      await walletPageHelper.verifyAnalyticsBanner()
      await assetsHelper.assertVerifiedAssetOnWalletPage(/^ETH$/, "base")
      await assetsHelper.assertUnverifiedAssetsPresentOnWalletPage()

      /**
       * Make sure the recelntly hidden asset "WLUNC" is no longer shown on the
       * `Wallet` page.
       */
      await expect(
        popup.locator(".asset_list_item").filter({
          has: popup.locator("span").filter({ hasText: /^WLUNC$/ }),
        })
      ).not.toBeVisible()

      /**
       * Verify there is no "WLUNC" asset on the Send screen.
       */
      await popup.getByRole("button", { name: "Send", exact: true }).click()
      await popup.getByTestId("selected_asset_button").click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(["WLUNC"])
      await assetsHelper.closeSelectTokenPopup()
      await popup.getByRole("button", { name: "Back", exact: true }).click()

      /**
       * Verify there is no "WLUNC" asset on the Swap screen.
       */
      await popup.getByRole("button", { name: "Swap", exact: true }).click()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .first()
        .click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(["WLUNC"])
      await assetsHelper.closeSelectTokenPopup()
      await popup
        .getByRole("button", { name: "Select token", exact: true })
        .nth(1)
        .click()
      await assetsHelper.assertAssetsNotPresentOnAssetsList(["WLUNC"])
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
