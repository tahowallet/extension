// since this is a temp file, disable linting
/* eslint-disable */
import * as stub from "./stub"
import BlocknativeSdk from "bnc-sdk"
import { EthereumTransactionData } from "bnc-sdk/dist/types/src/interfaces"

let time = 1e3 * 15
let importWasCalled = !!window.localStorage.temp
let number = 1
const { accountsResult } = stub

const ethermineAccount = "0xea674fdde714fd979de3edf0f56aa9716b898ec8"
const blockNative = new BlocknativeSdk({
  dappId: "6e6dbfa7-7eac-4e59-8ca2-985bee1ece8f",
  networkId: 1,
  transactionHandlers: [(event) => console.log(event.transaction)],
})

type Account = typeof accountsResult

// Some remedial typing for BlockNative; see blocknative/sdk#138 .
type EthereumNetBalanceChanges = {
  address: string
  balanceChanges: EthereumAssetBalanceChanges[]
}

type EthereumAssetBalanceChanges = {
  delta: string
  asset: AssetDetails
  breakdown: TransferDetails[]
}

type AssetDetails = {
  type: AssetType
  symbol: string
}

type AssetType = "ether" | "ERC20"

type TransferDetails = {
  counterparty: string
  amount: string
}

let handlers: Array<(accounts: Account) => void> = []
function subscribeBlockNative() {
  blockNative
    .account(ethermineAccount)
    .emitter.on("txConfirmed", (transactionData) => {
      if (
        "contractCall" in transactionData && // not a Bitcoin tx
        transactionData.system == "ethereum" // not a log
      ) {
        // Lock type to transaction data, augment with netBalanceChanges info.
        const transaction = transactionData as EthereumTransactionData & {
          netBalanceChanges: EthereumNetBalanceChanges[]
        }

        transaction.netBalanceChanges
          .filter(({ address }) => address.toLowerCase() == ethermineAccount)
          .forEach(({ balanceChanges }) => {
            balanceChanges
              .filter(({ asset: { type: assetType } }) => assetType == "ether")
              .forEach(({ delta }) => {
                // TODO Adjust this when we start shipping raw BigInts over to UI.
                accountsResult.total_balance.amount +=
                  Number(BigInt(delta) / 10n ** 16n) / 100
              })
          })

        accountsResult.activity.push(transaction)

        handlers.forEach((handler) => handler(accountsResult))
      }
    })
}
function unsubscribeBlockNative() {
  blockNative.account(ethermineAccount).emitter.off("txConfirmed")
  blockNative.unsubscribe(ethermineAccount)
}

export const apiStubs = {
  "/accounts/": {
    GET: async ({ address }) => {
      /*if (!importWasCalled)
        throw new Error("Must create or import a account first")*/
      return accountsResult
    },
    POST: async ({ data }) => {
      importWasCalled = true
      window.localStorage.temp = data
      switch (data) {
        case stub.SEED_PHRASE_MM:
          return stub.MM_ADDRESS
        case stub.SEED_PHRASE:
          return stub.ADDRESS
      }
    },
    unsubscribe: () => {
      handlers = []
      unsubscribeBlockNative()
    },
    subscribe: (handler: (accounts: Account) => void) => {
      handlers.push(handler)

      if (handlers.length === 1) {
        subscribeBlockNative()
      }
    },
  },
}
