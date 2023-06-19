import { test, expect } from "./utils"

test.describe("Transactions", () => {
  test("User can send base asset", async ({
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
       * Verify we're on Ethereum network. Verify common elements on the main
       * page.
       */
      await walletPageHelper.verifyCommonElements(
        /^Ethereum$/,
        false,
        /^testertesting\.eth$/
      )
      await walletPageHelper.verifyAnalyticsBanner()

      /**
       * Verify ETH is visible on the asset list and has the correct balance
       */
      const ethAsset = popup.locator(".asset_list_item").first() // We use `.first()` because the base asset should be first on the list
      await expect(ethAsset.getByText(/^ETH$/)).toBeVisible()
      await expect(ethAsset.getByText(/^0\.(1|1021)$/)).toBeVisible()
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
        /^Ethereum$/,
        /^testertesting\.eth$/,
        "ETH",
        "0\\.1021",
        true
      )

      /**
       *  Enter amount and receipient. Verify `Continue` isn't active.
       */
      await popup.locator("input.input_amount").fill("0.01")
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
        "0\\.01",
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
      "Verify asset activity screen and transaction status",
      async () => {
        /**
         * Verify elements on the asset activity screen
         */
        await transactionsHelper.verifyAssetActivityScreen(
          /^Ethereum$/,
          /^testertesting\.eth$/,
          /^ETH$/,
          /^0\.0914$/,
          true
        )
        // This is what we expect currently on forked network. If ve ever fix
        // displaying activity on fork, we should perform following checks
        // instead:
        // Find latest transaction item, check if there is a "Send" status and
        // click on the item.
        // Wait for panel to load.
        // Check if block height is defined.
        // Check if amount is the same as you sent.
        // Check (maybe?) nonce value timestamp and gas (21k).
        // Open scan website from the link in the header. (optional)
        // Compare values from the scan website and extension. (optional)
        await expect(
          popup
            .getByText(
              `Taho will populate your historical activity over time; this may
              take an hour or more for accounts that have been active for a long
              time. For new accounts, new activity will show up here.`
            )
            .first()
        ).toBeVisible()

        /**
         * Navifgate to `Wallet` -> `Activity`
         */
        await popup.getByText("Wallet", { exact: true }).click() // We can't use `getByRole` here, as the button uses the role `link`
        await popup.getByText("Activity", { exact: true }).click() // We can't use `getByRole` here, as the button uses the role `tab`

        /**
         * Verify elements on the activity screen
         */
        // TODO: If we ever fix displaying asset activity on fork, we should
        // repeat the checks of tx details here.
        await expect(
          popup
            .getByText(
              `Taho will populate your historical activity over time; this may
            take an hour or more for accounts that have been active for a long
            time. For new accounts, new activity will show up here.`
            )
            .first()
        ).toBeVisible()

        await walletPageHelper.verifyCommonElements(
          /^Ethereum$/,
          false,
          /^testertesting\.eth$/
        )
        await walletPageHelper.verifyAnalyticsBanner()
      }
    )
  })

  test("User can open ERC-20 transfer from asset list and can reject the transfer", async ({
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
       * Verify we're on Ethereum network. Verify common elements on the main
       * page.
       */
      await walletPageHelper.verifyCommonElements(
        /^Ethereum$/,
        false,
        /^testertesting\.eth$/
      )
      await walletPageHelper.verifyAnalyticsBanner()

      /**
       * Verify KEEP is visible on the asset list and has the correct balance
       */
      const keepAsset = popup
        .locator(".asset_list_item")
        .filter({ has: popup.locator("span").filter({ hasText: /^KEEP$/ }) })
      await expect(keepAsset.getByText(/^65\.88$/)).toBeVisible({
        timeout: 120000,
      })
      await expect(keepAsset.getByText(/^\$\d+\.\d{2}$/)).toBeVisible({
        timeout: 120000,
      })
      await keepAsset.locator(".asset_icon_send").click({ trial: true })
      await keepAsset.locator(".asset_icon_swap").click({ trial: true })

      /**
       * Click on the Send button (from asset list)
       */
      await keepAsset.locator(".asset_icon_send").click()
    })

    await test.step("Setup transaction", async () => {
      /**
       * Check if "Send asset" has opened on Ethereum network, with KEEP asset
       * already selected. Verify elements on the page. Make sure `Continue`
       * isn't active.
       */
      await transactionsHelper.verifyUnfilledSendAssetScreen(
        /^Ethereum$/,
        /^testertesting\.eth$/,
        "KEEP",
        "65\\.88",
        false
      )

      /**
       *  Enter amount and receipient. Verify `Continue` isn't active.
       */
      await popup.getByPlaceholder(/^0\.0$/).fill("1.257")
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

    await test.step("Reject signing the transaction", async () => {
      /**
       * Check if "Transfer" has opened and verify elements on the page.
       */
      await transactionsHelper.verifyTransferScreen(
        "Ethereum",
        "testertesting\\.eth",
        "0x47745a7252e119431ccf973c0ebd4279638875a6",
        "0x4774…875a6",
        "1\\.25",
        "KEEP",
        false
      )

      /**
       * Sign.
       */
      await popup.getByRole("button", { name: "Reject" }).click()

      /**
       * Confirm there is no "Transaction signed, broadcasting..." or
       * "Transaction failed to broadcast" snackbar visible.
       */
      await expect(
        popup.getByText("Transaction signed, broadcasting...")
      ).toHaveCount(0)
      await expect(
        popup.getByText("Transaction failed to broadcast.")
      ).toHaveCount(0)
    })

    await test.step("Verify asset activity screen", async () => {
      /**
       * Verify elements on the asset activity screen
       */
      await transactionsHelper.verifyAssetActivityScreen(
        /^Ethereum$/,
        /^testertesting\.eth$/,
        /^KEEP$/,
        /^65\.88$/,
        false,
        "https://etherscan.io/token/0x85eee30c52b0b379b046fb0f85f4f3dc3009afec"
      )
      // This is what we expect currently on a forked network.
      await expect(
        popup
          .getByText(
            `Taho will populate your historical activity over time; this may
          take an hour or more for accounts that have been active for a long
          time. For new accounts, new activity will show up here.`
          )
          .first()
      ).toBeVisible()
    })
  })

  test("User can send ERC-20 from header", async ({
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
       * Verify we're on Ethereum network. Verify common elements on the main
       * page.
       */
      await walletPageHelper.verifyCommonElements(
        /^Ethereum$/,
        false,
        /^testertesting\.eth$/
      )
      await walletPageHelper.verifyAnalyticsBanner()

      /**
       * Verify KEEP is visible on the asset list and has the correct balance
       */
      const keepAsset = popup
        .locator("div.asset_list_item")
        .filter({ has: popup.locator("span").filter({ hasText: /^KEEP$/ }) })
      await expect(keepAsset.getByText(/^65\.88$/)).toBeVisible({
        timeout: 120000,
      })
      await expect(keepAsset.getByText(/^\$\d+\.\d{2}$/)).toBeVisible({
        timeout: 120000,
      })
      await keepAsset.locator(".asset_icon_send").click({ trial: true })
      await keepAsset.locator(".asset_icon_swap").click({ trial: true })

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
        /^Ethereum$/,
        /^testertesting\.eth$/,
        "ETH",
        "\\d+\\.\\d{4}",
        true
      )

      /**
       *  Click on the tokens selector and pick ERC-20 token (KEEP)
       */
      await popup.getByTestId("selected_asset_button").click()
      await expect(popup.getByText(/^Select token$/)).toBeVisible()

      /**
       *  Verify base token (ETH) is present on the list
       */
      const ethToken = await popup
        .locator(".token_group")
        .filter({ has: popup.locator("div").filter({ hasText: /^ETH$/ }) })
      await expect(ethToken.getByText(/^Ether$/)).toBeVisible()
      await expect(ethToken.getByText(/^\d+\.\d{4}$/)).toBeVisible()
      await expect(ethToken.locator(".icon")).toHaveCount(0)

      /**
       *  Verify ERC-20 token (KEEP) is present on the list
       */
      const keepToken = await popup
        .locator(".token_group")
        .filter({ has: popup.locator("div").filter({ hasText: /^KEEP$/ }) })
      await expect(keepToken.getByText(/^Keep Network$/)).toBeVisible()
      await expect(keepToken.getByText(/^65\.88$/)).toBeVisible()
      await expect(keepToken.locator(".icon")).toBeVisible()
      await keepToken.locator(".icon").click({ trial: true }) // TODO: click and verify if correct address is opened

      /**
       *  Filter by `keep` and verify that only KEEP token is present
       */
      await popup.getByPlaceholder("Search by name or address").fill("keep")
      await expect(keepToken.getByText(/^Keep Network$/)).toBeVisible()
      await expect(keepToken.getByText(/^65\.88$/)).toBeVisible()
      await expect(keepToken.locator(".icon")).toBeVisible()
      await keepToken.locator(".icon").click({ trial: true })
      await expect(popup.locator(".token_group")).toHaveCount(1)

      /**
       *  Select KEEP token
       */
      await keepToken.click()

      /**
       *  Verify elements on the page after selecting token. Make sure
       * `Continue` isn't active.
       */
      await transactionsHelper.verifyUnfilledSendAssetScreen(
        /^Ethereum$/,
        /^testertesting\.eth$/,
        "KEEP",
        "65\\.88",
        false
      )

      /**
       *  Enter amount and receipient. Verify `Continue` isn't active.
       */
      await popup.getByPlaceholder(/^0\.0$/).fill("12.3456")
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
        "12\\.34",
        "KEEP",
        false
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
      "Verify asset activity screen and transaction status",
      async () => {
        /**
         * Verify elements on the asset activity screen
         */
        await transactionsHelper.verifyAssetActivityScreen(
          /^Ethereum$/,
          /^testertesting\.eth$/,
          /^KEEP$/,
          /^53\.54$/,
          false,
          "https://etherscan.io/token/0x85eee30c52b0b379b046fb0f85f4f3dc3009afec"
        )
        // This is what we expect currently on forked network. If ve ever fix
        // displaying activity on fork, we should perform following checks
        // instead:
        // Find latest transaction item, check if there is a "Send" status and
        // click on the item.
        // Wait for panel to load.
        // Check if block height is defined.
        // Check if amount is the same as you sent.
        // Check (maybe?) nonce value timestamp and gas (21k).
        // Open scan website from the link in the header. (optional)
        // Compare values from the scan website and extension. (optional)
        await expect(
          popup
            .getByText(
              `Taho will populate your historical activity over time; this may
            take an hour or more for accounts that have been active for a long
            time. For new accounts, new activity will show up here.`
            )
            .first()
        ).toBeVisible()

        /**
         * Navifgate to `Wallet` -> `Activity`
         */
        await popup.getByText("Wallet", { exact: true }).click() // We can't use `getByRole` here, as the button uses the role `link`
        await popup.getByText("Activity", { exact: true }).click() // We can't use `getByRole` here, as the button uses the role `tab`

        /**
         * Verify elements on the activity screen
         */
        // TODO: If we ever fix displaying asset activity on fork, we should
        // repeat the checks of tx details here.
        await expect(
          popup
            .getByText(
              `Taho will populate your historical activity over time; this may
              take an hour or more for accounts that have been active for a long
              time. For new accounts, new activity will show up here.`
            )
            .first()
        ).toBeVisible()

        await walletPageHelper.verifyCommonElements(
          /^Ethereum$/,
          false,
          /^testertesting\.eth$/
        )
        await walletPageHelper.verifyAnalyticsBanner()
      }
    )
  })
})
