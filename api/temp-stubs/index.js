// since this is a temp file, disable linting
/* eslint-disable */
import * as stub from "./stub"

let time = 1e3 * 15
let importWasCalled = !!window.localStorage.temp
let number = 1
const { accountsResult } = stub

export const apiStubs = {
  "/accounts/": {
    GET: async ({ address }) => {
      if (!importWasCalled)
        throw new Error("Must create or import a account first")
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
      window.tally_unsubscribe?.()
    },
    subscribe: (handler) => {
      const id = setInterval(() => {
        const transaction = accountsResult.activity[0]
        transaction.hash = `0x${(++number).toString(16)}`
        const value = (transaction.value = Math.random() * 100)
        accountsResult.total_balance.amount =
          accountsResult.total_balance.amount + value
        accountsResult.activity.push(transaction)
        handler(accountsResult)
      }, time)
      window.tally_unsubscribe = () => clearInterval(id)
      window.changeSubcriptionTimeing = (t) => {
        time = t
        clearInterval(id)
        setInterval(() => {
          transaction = stub.accountsResult.activity[0]
          transaction.hash = `0x${(++number).toString(16)}`
          const value = (transaction.value = Math.random() * 100)
          accountsResult.total_balance.amount =
            accountsResult.total_balance.amount + value
          accountsResult.activity.push(transaction)
          handler(accountsResult)
        }, time)
      }
    },
  },
}
