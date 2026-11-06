import reducer, {
  initialState,
  sparkAccountsUpdated,
  sparkActivityUpdated,
  sparkBalanceUpdated,
} from "../spark"
import { SPARK_REGTEST } from "../../constants/spark"
import type { SparkAccount, SparkBalance } from "../../services/spark/types"

const account: SparkAccount = {
  id: "spark-regtest:keyring-1:0",
  keyringID: "keyring-1",
  accountNumber: 0,
  network: SPARK_REGTEST,
  address:
    "sparkrt1pgssy6vty7krpze82ecm8j39gd35v35aqjjmhftc4culawsavkyh564u2uv8v0",
  identityPublicKey: "02aa",
  addedAt: 1,
}

const balance: SparkBalance = {
  accountID: account.id,
  available: 10n,
  owned: 12n,
  incoming: 0n,
  tokens: [],
  retrievedAt: 2,
}

describe("spark slice", () => {
  it("ignores balances for accounts it doesn't know", () => {
    const state = reducer(initialState, sparkBalanceUpdated(balance))
    expect(state.balances).toEqual({})
  })

  it("stores balances and activity for tracked accounts", () => {
    let state = reducer(initialState, sparkAccountsUpdated([account]))
    state = reducer(state, sparkBalanceUpdated(balance))
    state = reducer(
      state,
      sparkActivityUpdated({ accountID: account.id, items: [] }),
    )
    expect(state.balances[account.id]).toEqual(balance)
    expect(state.activity[account.id]).toEqual([])
  })

  it("drops data for removed accounts", () => {
    let state = reducer(initialState, sparkAccountsUpdated([account]))
    state = reducer(state, sparkBalanceUpdated(balance))
    state = reducer(state, sparkAccountsUpdated([]))
    expect(state.accounts).toEqual({})
    expect(state.balances).toEqual({})
  })
})
