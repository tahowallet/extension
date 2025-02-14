import { Wallet, utils } from "ethers"
import { test, expect } from "../utils"
import ForkEnvHelper from "../utils/fork-env-helper"

const WALLET_JSON = process.env.FORK_TEST_WALLET_JSON_BODY ?? ""
const WALLET_PASSWORD = process.env.FORK_TEST_WALLET_JSON_PASSWORD ?? ""

test.describe("Transactions @fork", () => {
  const ERC20_ASSET_WALLET = "0x40ec5B33f54e0E8A33A975908C5BA1c14e5BbbDf"
  const DAI_CONTRACT = "0x6b175474e89094c44da98b954eedeac495271d0f"
  const USDC_CONTRACT = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"

  test.beforeAll(async ({ localNodeAlive, context }) => {
    // FIXME: These should be test.skip but there's a bug in playwright causing
    // the beforeAll hook to run before `test.skip`
    test.fixme(
      WALLET_JSON === "" || WALLET_PASSWORD === "",
      "FORK_TEST_WALLET_JSON_BODY and FORK_TEST_WALLET_JSON_PASSWORD must be set",
    )

    test.fixme(!localNodeAlive, "Local node must be up")

    const wallet = Wallet.fromEncryptedJsonSync(WALLET_JSON!, WALLET_PASSWORD!)

    const forkEnv = new ForkEnvHelper(context)
    await forkEnv.setBalance(wallet.address, utils.parseUnits("20", "ether"))

    await forkEnv.impersonateAccount(ERC20_ASSET_WALLET)

    await forkEnv.transferERC20(DAI_CONTRACT, wallet.address, "2.62")
    await forkEnv.transferERC20(USDC_CONTRACT, wallet.address, "2.62", 6)

    await forkEnv.stopImpersonating(ERC20_ASSET_WALLET)
  })

  test("User can send base asset", async ({
    page: popup,
    walletPageHelper,
    transactionsHelper,
    assetsHelper,
  }) => {
    const RECIPIENT_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

    await test.step("Import account", async () => {
      /**
       * Import the `testertesting.eth` account using onboarding with a JSON
       * file.
       */

      await walletPageHelper.onboardWithJSON(
        "custom",
        WALLET_JSON!,
        WALLET_PASSWORD!,
      )

      await walletPageHelper.goToStartPage()

      await walletPageHelper.setViewportSize()

      await walletPageHelper.changeAccountName("TEST_ACCOUNT")

      /**
       * Verify we're on Ethereum network. Verify common elements on the main
       * page.
       */
      await walletPageHelper.assertCommonElements(
        /^Ethereum$/,
        false,
        /TEST_ACCOUNT/i,
      )
      await walletPageHelper.assertAnalyticsBanner()

      /**
       * Verify ETH is visible on the asset list and has the correct balance
       */
      const ethAsset = popup.locator(".asset_list_item").first() // We use `.first()` because the base asset should be first on the list
      await expect(ethAsset.getByText(/^ETH$/)).toBeVisible()
      await expect(ethAsset.getByText(/^20$/)).toBeVisible()

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
        /Ethereum/i,
        /TEST_ACCOUNT/i,
        "ETH",
        "20",
        true,
      )

      /**
       *  Enter amount and recipient. Verify `Continue` isn't active.
       */
      await popup.locator("input.input_amount").fill("0.10")
      await expect(
        popup.locator(".value").getByText(/^\$\d+.*\d{2}$/),
      ).toBeVisible()

      await expect(
        popup.getByRole("button", { name: "Continue", exact: true }),
      ).toHaveClass(/disabled/) // We can't use `toBeDisabled`, as the element doesn't have `disabled` attribute.
      await popup
        .getByRole("button", { name: "Continue", exact: true })
        .click({ force: true })

      await popup.locator("#send_address").fill(RECIPIENT_ADDRESS)

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
        "TEST_ACCOUNT",
        RECIPIENT_ADDRESS,
        "0x7099…c79c8",
        "0.1",
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
        /TEST_ACCOUNT/,
        /^ETH$/,
        /^19.\d+$/,
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
        /TEST_ACCOUNT/i,
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
    const ERC20_RECIPIENT = "0x47745a7252e119431ccf973c0ebd4279638875a6"
    await test.step("Import account", async () => {
      /**
       * Import the `testertesting.eth` account using onboarding with a JSON
       * file.
       */
      await walletPageHelper.onboardWithJSON(
        "custom",
        WALLET_JSON!,
        WALLET_PASSWORD!,
      )
      await walletPageHelper.goToStartPage()
      await walletPageHelper.setViewportSize()

      await walletPageHelper.changeAccountName("TEST_ACCOUNT2")

      /**
       * Verify we're on Ethereum network. Verify common elements on the main
       * page.
       */
      await walletPageHelper.assertCommonElements(
        /^Ethereum$/,
        false,
        /TEST_ACCOUNT2/,
      )
      await walletPageHelper.assertAnalyticsBanner()

      /**
       * Verify DAI is visible on the asset list and has the correct balance
       */
      const daiAsset = popup
        .locator(".asset_list_item")
        .filter({ has: popup.locator("span").filter({ hasText: /^DAI$/ }) })
      // Wait for asset to load
      await expect(daiAsset.getByText(/^2\.62$/)).toBeVisible({
        timeout: 120000,
      })
      // Wait for prices to load
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
        /ethereum/i,
        /TEST_ACCOUNT2/,
        "DAI",
        "2\\.62",
        false,
      )

      /**
       *  Enter amount and receipient. Verify `Continue` isn't active.
       */
      await popup.getByPlaceholder(/^0\.0$/).fill("1.257")
      // await expect(
      //   popup.locator(".value").getByText(/^\$\d+\.\d{2}$/),
      // ).toBeVisible()

      await expect(
        popup.getByRole("button", { name: "Continue", exact: true }),
      ).toHaveClass(/disabled/) // We can't use `toBeDisabled`, as the element doesn't have `disabled` attribute.
      await popup
        .getByRole("button", { name: "Continue", exact: true })
        .click({ force: true })

      await popup.locator("#send_address").fill(ERC20_RECIPIENT)

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
        "TEST_ACCOUNT2",
        ERC20_RECIPIENT,
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
        /TEST_ACCOUNT2/,
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
      await walletPageHelper.onboardWithJSON(
        "custom",
        WALLET_JSON!,
        WALLET_PASSWORD!,
      )
      await walletPageHelper.goToStartPage()
      await walletPageHelper.setViewportSize()

      await walletPageHelper.changeAccountName("TEST_ACCOUNT3")

      /**
       * Verify we're on Ethereum network. Verify common elements on the main
       * page.
       */
      await walletPageHelper.assertCommonElements(
        /^Ethereum$/,
        false,
        /TEST_ACCOUNT3/,
      )
      await walletPageHelper.assertAnalyticsBanner()

      /**
       * Verify DAI is visible on the asset list and has the correct balance
       */
      const usdcAsset = popup
        .locator("div.asset_list_item")
        .filter({ has: popup.locator("span").filter({ hasText: /^USDC$/ }) })
      await expect(usdcAsset.getByText(/^2\.62$/)).toBeVisible({
        timeout: 120000,
      })
      await expect(usdcAsset.getByText(/^\$\d+\.\d{2}$/)).toBeVisible({
        timeout: 120000,
      })
      await usdcAsset.locator(".asset_icon_send").click({ trial: true })
      await usdcAsset.locator(".asset_icon_swap").click({ trial: true })

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
        /Ethereum/i,
        /TEST_ACCOUNT3/i,
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
      const usdcToken = await popup
        .locator(".token_group")
        .filter({ has: popup.locator("div").filter({ hasText: /^USDC$/ }) })
      await expect(usdcToken.getByText(/^USDC$/i)).toBeVisible()
      await expect(usdcToken.getByText(/^2\.62$/)).toBeVisible()
      await expect(usdcToken.locator(".icon")).toBeVisible()
      await usdcToken.locator(".icon").click({ trial: true }) // TODO: click and verify if correct address is opened

      /**
       *  Filter by `dai` and verify that only DAI token is present
       */
      await popup.getByPlaceholder("Search by name or address").fill("usdc")
      await expect(usdcToken.getByText(/^USDC$/i)).toBeVisible()
      await expect(usdcToken.getByText(/^2\.62$/)).toBeVisible()
      await expect(usdcToken.locator(".icon")).toBeVisible()
      await usdcToken.locator(".icon").click({ trial: true })
      await expect(popup.locator(".token_group")).toHaveCount(2) // On a forked environment the asset list shows `DAI` and `UNIDAIETH`.

      /**
       *  Select DAI token
       */
      await usdcToken.click()

      /**
       *  Verify elements on the page after selecting token. Make sure
       * `Continue` isn't active.
       */
      await transactionsHelper.assertUnfilledSendAssetScreen(
        /Ethereum/i,
        /TEST_ACCOUNT3/i,
        "USDC",
        "2\\.62",
        false,
      )

      /**
       *  Enter amount and receipient. Verify `Continue` isn't active.
       */
      await popup.getByPlaceholder(/^0\.0$/).fill("1.34")
      await expect(
        popup.locator(".value").getByText(/^\$\d+\.\d{2}$/),
      ).toBeVisible()

      await expect(
        popup.getByRole("button", { name: "Continue", exact: true }),
      ).toHaveClass(/disabled/) // We can't use `toBeDisabled`, as the element doesn't have `disabled` attribute.
      await popup
        .getByRole("button", { name: "Continue", exact: true })
        .click({ force: true })

      await popup
        .locator("#send_address")
        .fill("0x47745a7252e119431ccf973c0ebd4279638875a6")

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
        "TEST_ACCOUNT3",
        "0x47745a7252e119431ccf973c0ebd4279638875a6",
        "0x4774…875a6",
        "1\\.34",
        "USDC",
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
        /TEST_ACCOUNT3/,
        /^USDC$/i,
        /^1\.28$/,
        "knownERC20",
        `https://etherscan.io/token/${USDC_CONTRACT}`,
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
        /TEST_ACCOUNT3/,
      )
      await walletPageHelper.assertAnalyticsBanner()
    })
  })
})
