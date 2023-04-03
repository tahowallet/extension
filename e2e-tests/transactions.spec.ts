import { test } from "./utils"

test.describe.skip("Transactions", () => {
  /**
   * Let's test sending base assets first, it can be done on any chain or fork
   * but if we won't be able to start with blockchain fork then probably we
   * should pick some cheap L2 or Goerli just to save on gas.
   */
  test("User can send base asset", () => {
    /**
        Onboard using walletPageHelper, add any account with sufficient base asset balance
        Change network to the desired one (L2 or testnet)
        Check if we are on the correct network and if base asset has correct balance (more than 0?)
     */

    test.step("Setup transaction", async () => {
      /**
        On Wallet page - click on the Send button (from header)
        Check if "Send asset" has opened with base asset already selected
        Check expected balance
        Check that there is no "max" button (?)
        Type base asset amount
        Paste an address (can be the second address from this HD wallet) to "Send to" input
        Click Continue
        */
    })

    test.step("Send transaction", async () => {
      /**
        Wait for Transfer page to load
        Check "Send to" address, "Spend Amount" in base asset and if there is a $ value
        Check Estimated network fee value
        Click sign
        Confirm there is "Transaction signed, broadcasting..." snackbar visible
        Throw if there is "Transaction failed to broadcast." snackbar visible
        */
    })

    test.step("Confirm transaction status", async () => {
      /**
        Navigate to Wallet > Activity tab
        Find latest transaction item, check if there is a "Send" status and click on the item
        Wait for panel to load
        Check if block height is defined
        Check if amount is the same as you sent
        Check (maybe?) nonce value timestamp and gas (21k)
    
        Optional:
        Open scan website from the link in the header
        Compare values from the scan website and extension
        */
    })
  })

  test("User can send ERC-20", () => {
    /**
        Onboard using walletPageHelper, the same as for base assets
     */

    test.step("Setup transaction", async () => {
      /**
        On Wallet page - click on the Send button (from header)
        Click on the tokens selector and pick any ERC-20 token
        Check expected balance
        Check that there is a "max" button
        Type amount
        Paste an address (can be the second address from this HD wallet) to "Send to" input
        Click Continue
        */
    })

    test.step("Send transaction", async () => {
      /**
          Wait for Transfer page to load
          Check "Send to" address, "Spend Amount" value in your selected token's currency and if there is a $ value
          Check Estimated network fee value
          Check Raw Data tab - it shouldn't be empty
          Click sign
          Confirm there is "Transaction signed, broadcasting..." snackbar visible
          Throw if there is "Transaction failed to broadcast." snackbar visible
          */
    })

    test.step("Confirm transaction status", async () => {
      /**
          Navigate to Wallet > Activity tab
          Find latest transaction item, check if there is a "Send" status and click on the item
          Wait for panel to load
          Check if block height is defined
          Check if amount in base asset is 0
          Check if there is last table row with your assets name
          Check (maybe?) nonce value, timestamp and gas (more than 21k)
      
          Optional:
          Open scan website from the link in the header
          Compare values from the scan website and extension
          */
    })
  })
})
