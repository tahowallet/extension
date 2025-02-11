import { test, expect } from "../utils"
import { account2 } from "../utils/onboarding"

test.describe("Transactions @fork", () => {
  test("User can send base asset", async ({
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
       * Verify we're on Ethereum network. Verify common elements on the main
       * page.
       */
      await walletPageHelper.assertCommonElements(
        /^Ethereum$/,
        false,
        account2.name,
      )
      await walletPageHelper.assertAnalyticsBanner()

      /**
       * Verify ETH is visible on the asset list and has the correct balance
       */
      const ethAsset = popup.locator(".asset_list_item").first() // We use `.first()` because the base asset should be first on the list
      await expect(ethAsset.getByText(/^ETH$/)).toBeVisible()
      await expect(ethAsset.getByText(/^0\.0386$/)).toBeVisible()
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
      await transactionsHelper.assertUnfilledSendAssetScreen(
        /^Ethereum$/,
        account2.name,
        "ETH",
        "0\\.0386",
        true,
      )

      /**
       *  Enter amount and receipient. Verify `Continue` isn't active.
       */
      await popup.locator("input.input_amount").fill("0.01")
      await expect(
        popup.locator(".value").getByText(/^\$\d+\.\d{2}$/),
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
        "Ethereum",
        "testertesting\\.eth",
        "0x47745a7252e119431ccf973c0ebd4279638875a6",
        "0x4774…875a6",
        "0\\.01",
        "ETH",
        true,
      )

      /**
       * Sign.
       */
      await popup.getByRole("button", { name: "Sign" }).click()

      /**
       * Confirm there is "Transaction signed, broadcasting..." snackbar visible
       * and there is no "Transaction failed to broadcast" snackbar visible.
       */
      await expect
        .soft(popup.getByText("Transaction signed, broadcasting...").first())
        .toBeVisible() // we need to use `.first()` because sometimes Playwright catches 2 elements matching that copy
      await expect(
        popup.getByText("Transaction failed to broadcast."),
      ).toHaveCount(0)
    })

    await test.step("Verify asset activity screen and transaction status", async () => {
      /**
       * Verify elements on the asset activity screen
       */
      await assetsHelper.assertAssetDetailsPage(
        /^Ethereum$/,
        account2.name,
        /^ETH$/,
        /^0\.0284$/,
        "base",
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
              time. For new accounts, new activity will show up here.`,
          )
          .first(),
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
            time. For new accounts, new activity will show up here.`,
          )
          .first(),
      ).toBeVisible()

      await walletPageHelper.assertCommonElements(
        /^Ethereum$/,
        false,
        account2.name,
      )
      await walletPageHelper.assertAnalyticsBanner()
    })
  })

  test("User can open ERC-20 transfer from asset list and can reject the transfer", async ({
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
       * Verify we're on Ethereum network. Verify common elements on the main
       * page.
       */
      await walletPageHelper.assertCommonElements(
        /^Ethereum$/,
        false,
        account2.name,
      )
      await walletPageHelper.assertAnalyticsBanner()

      /**
       * Verify DAI is visible on the asset list and has the correct balance
       */
      const daiAsset = popup
        .locator(".asset_list_item")
        .filter({ has: popup.locator("span").filter({ hasText: /^DAI$/ }) })
      await expect(daiAsset.getByText(/^2\.62$/)).toBeVisible({
        timeout: 120000,
      })
      await expect(daiAsset.getByText(/^\$\d+\.\d{2}$/)).toBeVisible({
        timeout: 120000,
      })
      await daiAsset.locator(".asset_icon_send").click({ trial: true })
      await daiAsset.locator(".asset_icon_swap").click({ trial: true })

      /**
       * Click on the Send button (from asset list)
       */
      await daiAsset.locator(".asset_icon_send").click()
    })

    await test.step("Setup transaction", async () => {
      /**
       * Check if "Send asset" has opened on Ethereum network, with DAI asset
       * already selected. Verify elements on the page. Make sure `Continue`
       * isn't active.
       */
      await transactionsHelper.assertUnfilledSendAssetScreen(
        /^Ethereum$/,
        account2.name,
        "DAI",
        "2\\.62",
        false,
      )

      /**
       *  Enter amount and receipient. Verify `Continue` isn't active.
       */
      await popup.getByPlaceholder(/^0\.0$/).fill("1.257")
      await expect(
        popup.locator(".value").getByText(/^\$\d+\.\d{2}$/),
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

    await test.step("Reject signing the transaction", async () => {
      /**
       * Check if "Transfer" has opened and verify elements on the page.
       */
      await transactionsHelper.assertTransferScreen(
        "Ethereum",
        "testertesting\\.eth",
        "0x47745a7252e119431ccf973c0ebd4279638875a6",
        "0x4774…875a6",
        "1\\.25",
        "DAI",
        false,
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
        popup.getByText("Transaction signed, broadcasting..."),
      ).toHaveCount(0)
      await expect(
        popup.getByText("Transaction failed to broadcast."),
      ).toHaveCount(0)
    })

    await test.step("Verify asset activity screen", async () => {
      /**
       * Verify elements on the asset activity screen
       */
      await assetsHelper.assertAssetDetailsPage(
        /^Ethereum$/,
        account2.name,
        /^DAI$/,
        /^2\.62$/,
        "knownERC20",
        "https://etherscan.io/token/0x6b175474e89094c44da98b954eedeac495271d0f",
      )
      // This is what we expect currently on a forked network.
      await expect(
        popup
          .getByText(
            `Taho will populate your historical activity over time; this may
          take an hour or more for accounts that have been active for a long
          time. For new accounts, new activity will show up here.`,
          )
          .first(),
      ).toBeVisible()
    })
  })

  test("User can send ERC-20 from header", async ({
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
       * Verify we're on Ethereum network. Verify common elements on the main
       * page.
       */
      await walletPageHelper.assertCommonElements(
        /^Ethereum$/,
        false,
        account2.name,
      )
      await walletPageHelper.assertAnalyticsBanner()

      /**
       * Verify DAI is visible on the asset list and has the correct balance
       */
      const daiAsset = popup
        .locator("div.asset_list_item")
        .filter({ has: popup.locator("span").filter({ hasText: /^DAI$/ }) })
      await expect(daiAsset.getByText(/^2\.62$/)).toBeVisible({
        timeout: 120000,
      })
      await expect(daiAsset.getByText(/^\$\d+\.\d{2}$/)).toBeVisible({
        timeout: 120000,
      })
      await daiAsset.locator(".asset_icon_send").click({ trial: true })
      await daiAsset.locator(".asset_icon_swap").click({ trial: true })

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
        /^Ethereum$/,
        account2.name,
        "ETH",
        "\\d+\\.\\d{4}",
        true,
      )

      /**
       *  Click on the tokens selector and pick ERC-20 token (DAI)
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
       *  Verify ERC-20 token (DAI) is present on the list
       */
      const daiToken = await popup
        .locator(".token_group")
        .filter({ has: popup.locator("div").filter({ hasText: /^DAI$/ }) })
      await expect(daiToken.getByText(/^Dai$/)).toBeVisible()
      await expect(daiToken.getByText(/^2\.62$/)).toBeVisible()
      await expect(daiToken.locator(".icon")).toBeVisible()
      await daiToken.locator(".icon").click({ trial: true }) // TODO: click and verify if correct address is opened

      /**
       *  Filter by `dai` and verify that only DAI token is present
       */
      await popup.getByPlaceholder("Search by name or address").fill("dai")
      await expect(daiToken.getByText(/^Dai$/)).toBeVisible()
      await expect(daiToken.getByText(/^2\.62$/)).toBeVisible()
      await expect(daiToken.locator(".icon")).toBeVisible()
      await daiToken.locator(".icon").click({ trial: true })
      await expect(popup.locator(".token_group")).toHaveCount(2) // On a forked environment the asset list shows `DAI` and `UNIDAIETH`.

      /**
       *  Select DAI token
       */
      await daiToken.click()

      /**
       *  Verify elements on the page after selecting token. Make sure
       * `Continue` isn't active.
       */
      await transactionsHelper.assertUnfilledSendAssetScreen(
        /^Ethereum$/,
        account2.name,
        "DAI",
        "2\\.62",
        false,
      )

      /**
       *  Enter amount and receipient. Verify `Continue` isn't active.
       */
      await popup.getByPlaceholder(/^0\.0$/).fill("1.3456")
      await expect(
        popup.locator(".value").getByText(/^\$\d+\.\d{2}$/),
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
        "Ethereum",
        "testertesting\\.eth",
        "0x47745a7252e119431ccf973c0ebd4279638875a6",
        "0x4774…875a6",
        "1\\.34",
        "DAI",
        false,
      )

      /**
       * Sign.
       */
      await popup.getByRole("button", { name: "Sign" }).click()

      /**
       * Confirm there is "Transaction signed, broadcasting..." snackbar visible
       * and there is no "Transaction failed to broadcast" snackbar visible.
       */
      await expect
        .soft(popup.getByText("Transaction signed, broadcasting...").first())
        .toBeVisible() // we need to use `.first()` because sometimes Playwright catches 2 elements matching that copy
      await expect(
        popup.getByText("Transaction failed to broadcast."),
      ).toHaveCount(0)
    })

    await test.step("Verify asset activity screen and transaction status", async () => {
      /**
       * Verify elements on the asset activity screen
       */
      await assetsHelper.assertAssetDetailsPage(
        /^Ethereum$/,
        account2.name,
        /^DAI$/,
        /^1\.28$/,
        "knownERC20",
        "https://etherscan.io/token/0x6b175474e89094c44da98b954eedeac495271d0f",
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
            time. For new accounts, new activity will show up here.`,
          )
          .first(),
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
              time. For new accounts, new activity will show up here.`,
          )
          .first(),
      ).toBeVisible()

      await walletPageHelper.assertCommonElements(
        /^Ethereum$/,
        false,
        account2.name,
      )
      await walletPageHelper.assertAnalyticsBanner()
    })
  })
})
