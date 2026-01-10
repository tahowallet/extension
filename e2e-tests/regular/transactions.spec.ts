import { test, expect } from "../utils"
import { account2 } from "../utils/onboarding"

test.describe("Transactions", () => {
  test("User can send base asset (on Sepolia testnet) @testnet", async ({
    page: popup,
    walletPageHelper,
    transactionsHelper,
    assetsHelper,
  }) => {
    await test.step("Import account", async () => {
      /**
       * Import the `testertesting.eth` account using onboarding with a JSON
       * file.
       */
      await walletPageHelper.onboardWithJSON(account2)
      await walletPageHelper.goToStartPage()
      await walletPageHelper.setViewportSize()

      /**
       * Verify we're on Ethereum network. Verify common elements on the main page.
       */
      await walletPageHelper.assertCommonElements(
        /^Ethereum$/,
        false,
        account2.name,
      )
      await walletPageHelper.assertAnalyticsBanner()

      /**
       * Switch to Sepolia testnet.
       */
      await popup.getByTestId("top_menu_network_switcher").last().click()
      await popup
        .getByText(/^Ethereum Sepolia$/)
        .last()
        .click()
      await walletPageHelper.assertCommonElements(
        /^Ethereum Sepolia$/,
        true,
        account2.name,
      )
      await walletPageHelper.assertAnalyticsBanner()

      /**
       * Verify ETH is visible on the asset list.
       */
      const ethAsset = popup.locator("div.asset_list_item").first() // We use `.first()` because the base asset should be first on the list
      await expect(ethAsset.getByText(/^ETH$/)).toBeVisible()
      await expect(ethAsset.getByText(/^(\d|,)+(\.\d{0,4})*$/)).toBeVisible()
      await expect(ethAsset.getByText(/^\$(\d|,)+(\.\d{1,2})*$/)).toBeVisible()
      await ethAsset.locator(".asset_icon_send").click({ trial: true })
      await ethAsset.locator(".asset_icon_swap").click({ trial: true })

      /**
       * Click on the Send button (from header)
       */
      await popup.getByRole("button", { name: "Send", exact: true }).click()
    })

    await test.step("Setup transaction", async () => {
      /**
       * Check if "Send asset" has opened on Ethereum network, with base asset
       * already selected. Verify elements on the page. Make sure `Continue`
       * isn't active.
       */
      await transactionsHelper.assertUnfilledSendAssetScreen(
        /^Ethereum Sepolia$/,
        account2.name,
        "ETH",
        "(\\d|,)+(\\.\\d{0,4})*",
        true,
      )

      /**
       *  Enter amount and receipient. Verify `Continue` isn't active.
       */
      await popup.locator("input.input_amount").fill("0.00001")
      await expect(
        popup.locator(".value").getByText(/^\$\d+(\.\d{1,2})*$/),
      ).toBeVisible()

      await expect(
        popup.getByRole("button", { name: "Continue", exact: true }),
      ).toHaveClass(/disabled/) // We can't use `toBeDisabled`, as the element doesn't have `disabled` attribute.
      await popup
        .getByRole("button", { name: "Continue", exact: true })
        .click({ force: true })

      const receipientAddress = "0x47745a7252e119431ccf973c0ebd4279638875a6"
      await popup.locator("#send_address").fill(receipientAddress)

      /**
       *  Click `Continue`.
       */
      await popup.getByRole("button", { name: "Continue", exact: true }).click()
    })

    await test.step("Send transaction", async () => {
      /**
       * Check if "Transfer" has opened and verify elements on the page.
       */
      await transactionsHelper.assertTransferScreen(
        "Ethereum Sepolia",
        "testertesting\\.eth",
        "0x47745a7252e119431ccf973c0ebd4279638875a6",
        "0x4774…875a6",
        "0",
        "ETH",
        true,
      )

      // Wait for any shown snackbars to disappear
      await expect(() =>
        expect(popup.getByTestId("snackbar")).not.toBeVisible(),
      ).toPass()

      /**
       * Sign.
       */
      await popup.getByRole("button", { name: "Sign" }).click()

      /**
       * Confirm there is "Transaction signed, broadcasting..." snackbar visible
       * and there is no "Transaction failed to broadcast" snackbar visible.
       */
      await walletPageHelper.assertSnackBar(
        "Transaction signed, broadcasting...",
      )
    })

    await test.step("Verify asset activity screen and latest transaction status", async () => {
      /**
       * Verify elements on the asset activity screen
       */
      await expect(popup.getByTestId("activity_list")).toHaveCount(1)
      await assetsHelper.assertAssetDetailsPage(
        /^Ethereum Sepolia$/,
        account2.name,
        /^ETH$/,
        /^(\d|,)+(\.\d{0,4})*$/,
        "base",
      )

      /**
       * Verify latest transaction.
       */
      const latestSentTx = popup.getByTestId("activity_list_item").first()
      await expect(latestSentTx.getByText("Pending")).toHaveCount(0, {
        timeout: 60000,
      })
      await expect(latestSentTx.getByText(/^Send$/)).toBeVisible()
      await expect(
        latestSentTx.getByText(/^[a-zA-Z]{3} \d{1,2}$/),
      ).toBeVisible()
      await expect(
        latestSentTx.getByTestId("activity_list_item_amount").getByText(/^0$/),
      ).toBeVisible()
      await expect(
        latestSentTx
          .getByTestId("activity_list_item_amount")
          .getByText(/^ETH$/),
      ).toBeVisible()
      await expect(latestSentTx.getByText(/^To: 0x4774…875a6$/)).toBeVisible()

      /**
       * Open latest transaction and verify it's details
       */
      await latestSentTx.click()

      await transactionsHelper.assertActivityItemProperties(
        account2.address,
        "0x6e80…bb017",
        "0x47745A7252e119431CCF973c0eBD4279638875a6",
        "0x4774…875a6",
        /^0\.00001 ETH$/,
        /^21000$/,
      )
    })

    await test.step("Verify activity screen and latest transaction status", async () => {
      /**
       * Close and navigate to `Wallet` -> `Activity`
       */
      await transactionsHelper.closeVerifyAssetPopup()
      await popup.getByText("Wallet", { exact: true }).click() // We can't use `getByRole` here, as the button uses the role `link`
      await popup.getByText("Activity", { exact: true }).click() // We can't use `getByRole` here, as the button uses the role `tab`

      /**
       * Verify elements on the activity screen
       */
      await walletPageHelper.assertCommonElements(
        /^Ethereum Sepolia$/,
        true,
        account2.name,
      )
      await walletPageHelper.assertAnalyticsBanner()

      /**
       * Open latest transaction and verify it's details
       */
      const latestSentTx = popup.getByTestId("activity_list_item").first()

      await expect(latestSentTx.getByText(/^Send$/)).toBeVisible()
      await expect(
        latestSentTx.getByText(/^[a-zA-Z]{3} \d{1,2}$/),
      ).toBeVisible()
      await expect(
        latestSentTx.getByTestId("activity_list_item_amount").getByText(/^0$/),
      ).toBeVisible()
      await expect(
        latestSentTx
          .getByTestId("activity_list_item_amount")
          .getByText(/^ETH$/),
      ).toBeVisible()
      await expect(latestSentTx.getByText(/^To: 0x4774…875a6$/)).toBeVisible()

      await latestSentTx.click()

      await transactionsHelper.assertActivityItemProperties(
        account2.address,
        "0x6e80…bb017",
        "0x47745A7252e119431CCF973c0eBD4279638875a6",
        "0x4774…875a6",
        /^0\.00001 ETH$/,
        /^21000$/,
      )
    })
  })
})
