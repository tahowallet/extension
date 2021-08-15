// since this is a temp file, disable linting
/* eslint-disable */
import Blocknative, {
  BlocknativeNetworkIds,
} from "../third-party-data/blocknative"
import * as stub from "./stub"

let importWasCalled = !!window.localStorage.temp
const { accountsResult } = stub

const ethermineAccount = "0xea674fdde714fd979de3edf0f56aa9716b898ec8"

type Account = typeof stub.accountsResult

const blocknative = Blocknative.connect(
  "6e6dbfa7-7eac-4e59-8ca2-985bee1ece8f",
  BlocknativeNetworkIds.ethereum.mainnet
)

let handlers: Array<(accounts: Account) => void> = []
function subscribeBlockNative() {
  blocknative.watchBalanceUpdatesFor(
    ethermineAccount,
    (transaction, balanceDelta) => {
      accountsResult.total_balance.amount +=
        Number(balanceDelta / 10n ** 16n) / 100
      accountsResult.activity.push(transaction)

      handlers.forEach((handler) => handler(accountsResult))
    }
  )
}
function unsubscribeBlockNative() {
  blocknative.unwatchBalanceUpdatesFor(ethermineAccount)
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
