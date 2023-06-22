import { test, expect } from "./utils"

test.describe("Transactions", () => {
  test("User can send base asset (on Goerli testnet)", async ({
    page: popup,
    walletPageHelper,
    transactionsHelper,
  }) => {
    await test.step("Import account", async () => {
      test.skip(process.env.USE_MAINNET_FORK === "true")

      /**
       * Onboard using walletPageHelper
       */
      const recoveryPhrase = process.env.RECOVERY_PHRASE
      if (recoveryPhrase) {
        await walletPageHelper.onboardWithSeedPhrase(recoveryPhrase)
      } else {
        throw new Error("RECOVERY_PHRASE environment variable is not defined.")
      }

      /**
       * Verify we're on Ethereum network. Verify common elements on the main page.
       */
      await walletPageHelper.verifyCommonElements(
        /^Ethereum$/,
        false,
        /^testertesting\.eth$/
      )
      await walletPageHelper.verifyAnalyticsBanner()

      /**
       * Enable test networks
       */
      await popup
        .getByLabel("Main")
        .getByText("Settings", { exact: true })
        .click()
      const enableTestNetworksSetting = popup.locator("li").filter({
        hasText: /^Show testnet networks$/,
      })
      await enableTestNetworksSetting.locator(".bulb").click()
      await popup
        .getByLabel("Main")
        .getByText("Wallet", { exact: true })
        .first()
        .click()

      /**
       * Switch to Goerli testnet.
       */
      await popup.getByTestId("top_menu_network_switcher").last().click()
      await popup
        .getByText(/^Goerli$/)
        .last()
        .click()
      await walletPageHelper.verifyCommonElements(
        /^Goerli$/,
        true,
        /^testertesting\.eth$/
      )
      await walletPageHelper.verifyAnalyticsBanner()

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
      await transactionsHelper.verifyUnfilledSendAssetScreen(
        /^Goerli$/,
        /^testertesting\.eth$/,
        "ETH",
        "(\\d|,)+(\\.\\d{0,4})*",
        true
      )

      /**
       *  Enter amount and receipient. Verify `Continue` isn't active.
       */
      await popup.locator("input.input_amount").fill("0.00001")
      await expect(
        popup.locator(".value").getByText(/^\$\d+(\.\d{1,2})*$/)
      ).toBeVisible()

      await expect(
        popup.getByRole("button", { name: "Continue", exact: true })
      ).toHaveClass(/^\S+ button large disabled$/) // We can't use `toBeDisabled`, as the element doesn't have `disabled` attribute.
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
      await transactionsHelper.verifyTransferScreen(
        "Goerli",
        "testertesting\\.eth",
        "0x47745a7252e119431ccf973c0ebd4279638875a6",
        "0x4774…875a6",
        "0",
        "ETH",
        true
      )

      /**
       * Sign.
       */
      await popup.getByRole("button", { name: "Sign" }).click()

      /**
       * Confirm there is "Transaction signed, broadcasting..." snackbar visible
       * and there is no "Transaction failed to broadcast" snackbar visible.
       */
      await expect(
        popup.getByText("Transaction signed, broadcasting...").first()
      ).toBeVisible() // we need to use `.first()` because sometimes Playwright catches 2 elements matching that copy
      await expect(
        popup.getByText("Transaction failed to broadcast.")
      ).toHaveCount(0)
    })

    await test.step(
      "Verify asset activity screen and latest transaction status",
      async () => {
        /**
         * Verify elements on the asset activity screen
         */
        await expect(popup.getByTestId("activity_list")).toHaveCount(1)
        await transactionsHelper.verifyAssetActivityScreen(
          /^Goerli$/,
          /^testertesting\.eth$/,
          /^ETH$/,
          /^(\d|,)+(\.\d{0,4})*$/,
          true
        )

        /**
         * Verify latest transaction.
         */
        setTimeout(() => {}, 10000) // wait for 10s

        const latestSentTx = popup.getByTestId("activity_list_item").first()
        await expect(latestSentTx.getByText("Pending")).toHaveCount(0, {
          timeout: 60000,
        })
        await expect(latestSentTx.getByText(/^Send$/)).toBeVisible()
        await expect(
          latestSentTx.getByText(/^[a-zA-Z]{3} \d{1,2}$/)
        ).toBeVisible()
        await expect(
          popup.getByTestId("activity_list_item_amount").getByText(/^0$/)
        ).toBeVisible()
        await expect(
          popup.getByTestId("activity_list_item_amount").getByText(/^ETH$/)
        ).toBeVisible()
        await expect(latestSentTx.getByText(/^To: 0x4774…875a6$/)).toBeVisible()

        /**
         * Open latest transaction and verify it's deatils
         */
        await latestSentTx.click()

        await transactionsHelper.verifyActivityItemProperties(
          "0x0581470a8b62bd35dbf121a6329d43e7edd20fc7",
          "0x0581…20fc7",
          "0x47745A7252e119431CCF973c0eBD4279638875a6",
          "0x4774…875a6",
          /^0\.00001 ETH$/,
          /^21000$/
        )
      }
    )

    await test.step(
      "Verify activity screen and latest transaction status",
      async () => {
        /**
         * Close and navigate to `Wallet` -> `Activity`
         */
        await transactionsHelper.closeVerifyAssetPopup()
        await popup.getByText("Wallet", { exact: true }).click() // We can't use `getByRole` here, as the button uses the role `link`
        await popup.getByText("Activity", { exact: true }).click() // We can't use `getByRole` here, as the button uses the role `tab`

        /**
         * Verify elements on the activity screen
         */
        await walletPageHelper.verifyCommonElements(
          /^Goerli$/,
          true,
          /^testertesting\.eth$/
        )
        await walletPageHelper.verifyAnalyticsBanner()

        /**
         * Open latest transaction and verify it's deatils
         */
        const latestSentTx = popup.getByTestId("activity_list_item").first()

        await expect(latestSentTx.getByText(/^Send$/)).toBeVisible()
        await expect(
          latestSentTx.getByText(/^[a-zA-Z]{3} \d{1,2}$/)
        ).toBeVisible()
        await expect(
          popup.getByTestId("activity_list_item_amount").getByText(/^0$/)
        ).toBeVisible()
        await expect(
          popup.getByTestId("activity_list_item_amount").getByText(/^ETH$/)
        ).toBeVisible()
        await expect(latestSentTx.getByText(/^To: 0x4774…875a6$/)).toBeVisible()

        await latestSentTx.click()

        await transactionsHelper.verifyActivityItemProperties(
          "0x0581470a8b62bd35dbf121a6329d43e7edd20fc7",
          "0x0581…20fc7",
          "0x47745A7252e119431CCF973c0eBD4279638875a6",
          "0x4774…875a6",
          /^0\.00001 ETH$/,
          /^21000$/
        )
      }
    )
  })
})
