import { test, expect } from "./utils"

test.describe("Transactions", () => {
  test("User can send base asset (on Goerli testnet)", async ({
    page: popup,
    walletPageHelper,
    transactionsHelper,
  }) => {
    await test.step("Import account", async () => {
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
        /^Goerli$/,
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
        hasText: /^Enable test networks$/,
      })
      await enableTestNetworksSetting.locator(".bulb").click()
      await popup
        .getByLabel("Main")
        .getByText("Wallet", { exact: true })
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
        /^testertesting\.eth$/
      )
      await walletPageHelper.verifyAnalyticsBanner()

      /**
       * Verify ETH is visible on the asset list.
       */
      const ethAsset = popup.locator("div.asset_list_item").first() // We use `.first()` because the base asset should be first on the list
      await expect(ethAsset.getByText(/^ETH$/)).toBeVisible()
      await expect(ethAsset.getByText(/^\d+\.\d{4}$/)).toBeVisible()
      await expect(ethAsset.getByText(/^\$(0|\d+\.\d{2})$/)).toBeVisible()
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
        "\\d+\\.\\d{4}",
        true
      )

      /**
       *  Enter amount and receipient. Verify `Continue` isn't active.
       */
      await popup.locator("input.input_amount").fill("0.00001")
      await expect(
        popup.locator(".value").getByText(/^\$\d+\.\d{2}$/)
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
        "Ethereum",
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
        await transactionsHelper.verifyAssetActivityScreen(
          /^Goerli$/,
          /^testertesting\.eth$/,
          /^ETH$/,
          /^\d+\.\d{2,4}$/,
          true
        )

        /**
         * Verify latest transaction.
         */
        setTimeout(() => {}, 10000) // wait for 10s
        const latestSentTx = popup
          .locator("li")
          .filter({
            hasText: /^Send$/,
          })
          .first()
        await expect(latestSentTx).toHaveText(/^0x4774\.\.\.875a6$/)
        await expect(latestSentTx.getByText(/^0 ETH$/)).toBeVisible()
        await expect(
          latestSentTx.getByText(/^[a-zA-Z]{3} \d{1,2}$/)
        ).toBeVisible()

        /**
         * Open latest transaction and verify it's deatils
         */
        await latestSentTx.click()

        popup.getByText(/^Etherscan$/).click({ trial: true })
        // TODO: Compare values from the scan website and extension.

        await expect(
          popup
            .locator("li")
            .filter({
              hasText: /^Block Height$/,
            })
            .locator(".right")
        ).toHaveText(/^\d+$/)
        await expect(
          popup
            .locator("li")
            .filter({
              hasText: /^Amount$/,
            })
            .locator(".right")
        ).toHaveText(/^0\.00001 ETH$/)
        await expect(
          popup
            .locator("li")
            .filter({
              hasText: /^Max Fee\/Gas$/,
            })
            .locator(".right")
        ).toHaveText(/^\d+\.\d{2} Gwei$/)
        await expect(
          popup
            .locator("li")
            .filter({
              hasText: /^Gas Price$/,
            })
            .locator(".right")
        ).toHaveText(/^\d+\.\d{2} Gwei$/)
        await expect(
          popup
            .locator("li")
            .filter({
              hasText: /^Gas$/,
            })
            .locator(".right")
        ).toHaveText(/^21000$/)
        await expect(
          popup
            .locator("li")
            .filter({
              hasText: /^Nonce$/,
            })
            .locator(".right")
        ).toHaveText(/^\d+$/)
        await expect(
          popup
            .locator("li")
            .filter({
              hasText: /^Timestamp$/,
            })
            .locator(".right")
        ).toHaveText(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/)
      }
    )

    await test.step(
      "Verify activity screen and latest transaction status",
      async () => {
        /**
         * Close and navigate to `Wallet` -> `Activity`
         */
        await popup.getByLabel("Close menu").click()
        await popup.getByText("Wallet", { exact: true }).click() // We can't use `getByRole` here, as the button uses the role `link`
        await popup.getByText("Activity", { exact: true }).click() // We can't use `getByRole` here, as the button uses the role `tab`

        /**
         * Verify elements on the activity screen
         */
        await walletPageHelper.verifyCommonElements(
          /^Goerli$/,
          /^testertesting\.eth$/
        )
        await walletPageHelper.verifyAnalyticsBanner()

        /**
         * Open latest transaction and verify it's deatils
         */
        const latestSentTx = popup
          .locator("li")
          .filter({
            hasText: /^Send$/,
          })
          .first()
        await expect(latestSentTx).toHaveText(/^0x4774\.\.\.875a6$/)
        await expect(latestSentTx.getByText(/^0 ETH$/)).toBeVisible()
        await expect(
          latestSentTx.getByText(/^[a-zA-Z]{3} \d{1,2}$/)
        ).toBeVisible()
        await latestSentTx.click()

        popup.getByText(/^Etherscan$/).click({ trial: true })
        // TODO: Compare values from the scan website and extension.

        await expect(
          popup
            .locator("li")
            .filter({
              hasText: /^Block Height$/,
            })
            .locator(".right")
        ).toHaveText(/^\d+$/)
        await expect(
          popup
            .locator("li")
            .filter({
              hasText: /^Amount$/,
            })
            .locator(".right")
        ).toHaveText(/^0\.00001 ETH$/)
        await expect(
          popup
            .locator("li")
            .filter({
              hasText: /^Max Fee\/Gas$/,
            })
            .locator(".right")
        ).toHaveText(/^\d+\.\d{2} Gwei$/)
        await expect(
          popup
            .locator("li")
            .filter({
              hasText: /^Gas Price$/,
            })
            .locator(".right")
        ).toHaveText(/^\d+\.\d{2} Gwei$/)
        await expect(
          popup
            .locator("li")
            .filter({
              hasText: /^Gas$/,
            })
            .locator(".right")
        ).toHaveText(/^21000$/)
        await expect(
          popup
            .locator("li")
            .filter({
              hasText: /^Nonce$/,
            })
            .locator(".right")
        ).toHaveText(/^\d+$/)
        await expect(
          popup
            .locator("li")
            .filter({
              hasText: /^Timestamp$/,
            })
            .locator(".right")
        ).toHaveText(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/)
      }
    )
  })
})
