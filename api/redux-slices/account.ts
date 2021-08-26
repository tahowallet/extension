import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import { ChainService } from "../services/chain"
import {
  AccountBalance,
  AccountNetwork,
  AnyAssetAmount,
  AnyEVMTransaction,
  ConfirmedEVMTransaction,
  FungibleAssetAmount,
  Network,
} from "../types"

type USDValue = {
  usdValue: number | "unknown"
  localizedUsdValue: string
}

type AccountBalanceWithUSD = AccountBalance & {
  assetAmount: AnyAssetAmount & USDValue
}

type AccountData = {
  account: string
  network: Network
  balances: {
    [assetSymbol: string]: AccountBalanceWithUSD
  }
  confirmedTransactions: ConfirmedEVMTransaction[]
  unconfirmedTransactions: AnyEVMTransaction[]
}

type CombinedAccountData = {
  totalUsdValue: string
  assets: (AnyAssetAmount & USDValue)[]
  activity: AnyEVMTransaction[]
}

type AccountState = {
  accountLoading?: string
  hasAccountError?: boolean
  // TODO Adapt to use AccountNetwork, probably via a Map and custom serialization/deserialization.
  accountsData: { [account: string]: AccountData | "loading" }
  combinedData: CombinedAccountData
}

// TODO Plug in price data and deal with non-USD target prices.
const usdConversion2Decimals = BigInt(241144)

// Type assertion to confirm an AnyAssetAmount is a FungibleAssetAmount.
function isFungibleAssetAmount(
  assetAmount: AnyAssetAmount
): assetAmount is FungibleAssetAmount {
  return "decimals" in assetAmount.asset
}

// Fill in USD amounts for an asset.
function enrichAssetAmountWithUSDAmounts(
  assetAmount: AnyAssetAmount
): AnyAssetAmount & USDValue {
  if (isFungibleAssetAmount(assetAmount)) {
    const {
      amount,
      asset: { decimals },
    } = assetAmount
    const converted2Decimals =
      (amount / 10n ** BigInt(decimals - 2)) * usdConversion2Decimals
    const usdValue = Number(converted2Decimals) / 2

    return {
      ...assetAmount,
      usdValue,
      localizedUsdValue: usdValue.toLocaleString("default", {
        maximumFractionDigits: 2,
      }),
    }
  }
  return {
    ...assetAmount,
    usdValue: "unknown",
    localizedUsdValue: "unknown",
  }
}

// Fill in USD amounts for an account balance.
function enrichWithUSDAmounts(
  accountBalance: AccountBalance
): AccountBalanceWithUSD {
  return {
    ...accountBalance,
    assetAmount: enrichAssetAmountWithUSDAmounts(accountBalance.assetAmount),
  }
}

// Comparator for two transactions by block height. Can be used to sort in
// descending order of block height, with unspecified block heights (i.e.,
// unconfirmed transactions) at the front of the list in stable order.
function transactionBlockComparator(
  transactionA: AnyEVMTransaction,
  transactionB: AnyEVMTransaction
) {
  // If both transactions are confirmed, go in descending order of block height.
  if (transactionA.blockHeight !== null && transactionB.blockHeight !== null) {
    return transactionB.blockHeight - transactionA.blockHeight
  }

  // If both are unconfirmed, they are equal.
  if (transactionA.blockHeight === transactionB.blockHeight) {
    return 0
  }

  // If transaction B is unconfirmed, it goes before transaction A.
  if (transactionA.blockHeight !== null) {
    return 1
  }

  // If transaction A is unconfirmed, it goes before transaction B.
  return -1
}

export const initialState = {
  accountsData: {},
  combinedData: {
    totalUsdValue: "",
    assets: [],
    activity: [],
  },
} as AccountState

// TODO Much of the combinedData bits should probably be done in a Reselect
// TODO selector.
const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    loadAccount: (state, { payload: accountToLoad }: { payload: string }) => {
      return state.accountsData[accountToLoad]
        ? state // If the account data already exists, the account is already loaded.
        : {
            ...state,
            accountsData: { ...state.accountsData, [accountToLoad]: "loading" },
          }
    },
    updateAccountBalance: (
      immerState,
      { payload }: { payload: AccountBalance }
    ) => {
      const existing = immerState.accountsData[payload.account]
      if (existing && existing !== "loading") {
        existing.balances[payload.assetAmount.asset.symbol] =
          enrichWithUSDAmounts(payload)
      } else {
        immerState.accountsData[payload.account] = {
          account: payload.account,
          network: payload.network,
          balances: {
            [payload.assetAmount.asset.symbol]: enrichWithUSDAmounts(payload),
          },
          unconfirmedTransactions: [],
          confirmedTransactions: [],
        }
      }

      // A key assumption here is that the balances of two accounts in
      // accountsData are mutually exclusive; that is, that there are no two
      // accounts in accountsData all or part of whose balances are shared with
      // each other.
      const combinedAccountBalances = Object.values(
        immerState.accountsData
      ).flatMap(
        (ad) =>
          ad !== "loading" &&
          Object.values(ad.balances).map((ab) => ab.assetAmount)
      )

      immerState.combinedData.totalUsdValue = combinedAccountBalances
        .reduce(
          (acc, { usdValue }) =>
            usdValue === "unknown" ? acc : acc + usdValue,
          0
        )
        .toLocaleString("default", { maximumFractionDigits: 2 })

      immerState.combinedData.assets = Object.values(
        combinedAccountBalances.reduce<{
          [symbol: string]: AnyAssetAmount & USDValue
        }>((acc, assetAmount) => {
          const assetSymbol = assetAmount.asset.symbol
          acc[assetSymbol] = enrichAssetAmountWithUSDAmounts({
            ...assetAmount,
            amount: (acc[assetSymbol]?.amount || 0n) + assetAmount.amount,
          })

          return acc
        }, {})
      )
    },
    transactionSeen: (
      immerState,
      { payload: transaction }: { payload: AnyEVMTransaction }
    ) => {
      const existingAccounts = [
        immerState.accountsData[transaction.from],
        immerState.accountsData[transaction.to],
      ].filter((a): a is AccountData => a && a !== "loading")

      existingAccounts.forEach((immerExistingAccount) => {
        if (
          immerExistingAccount.confirmedTransactions.find(
            (t) => t.hash === transaction.hash
          )
        ) {
          // TODO Probably this will only happen during a reorg? May make sense
          // TODO for a transaction to move from confirmed to unconfirmed in
          // TODO that scenario, but what if we get info on a transaction
          // TODO that's already been confirmed due to backend sync issues?

          // If there is a confirmed transaction, do not update the unconfirmed
          // transaction list.
          return
        }

        immerExistingAccount.unconfirmedTransactions = [
          transaction,
          ...immerExistingAccount.unconfirmedTransactions.filter(
            (t) => t.hash !== transaction.hash
          ),
        ]
      })

      immerState.combinedData.activity = Array.from(
        // Use a Map to drop any duplicate transaction entries, e.g. a send
        // between two tracked accounts.
        new Map(
          Object.values(immerState.accountsData)
            .flatMap(
              (ad) =>
                ad !== "loading" &&
                ad.unconfirmedTransactions.concat(ad.confirmedTransactions)
            )
            .map((t) => [t.hash, t])
        ).values()
      ).sort(transactionBlockComparator)
    },
    transactionConfirmed: (
      immerState,
      { payload: transaction }: { payload: ConfirmedEVMTransaction }
    ) => {
      const existingAccounts = [
        immerState.accountsData[transaction.from],
        immerState.accountsData[transaction.to],
      ].filter((a): a is AccountData => a && a !== "loading")

      existingAccounts.forEach((immerAccount) => {
        immerAccount.unconfirmedTransactions = [
          ...immerAccount.unconfirmedTransactions.filter(
            (t) => t.hash !== transaction.hash
          ),
        ]
        immerAccount.confirmedTransactions = [
          transaction,
          ...immerAccount.confirmedTransactions.filter(
            (t) => t.hash !== transaction.hash
          ),
        ]
      })

      immerState.combinedData.activity = Array.from(
        // Use a Map to drop any duplicate transaction entries, e.g. a send
        // between two tracked accounts.
        new Map(
          Object.values(immerState.accountsData)
            .flatMap(
              (ad) =>
                ad !== "loading" &&
                ad.unconfirmedTransactions.concat(ad.confirmedTransactions)
            )
            .map((t) => [t.hash, t])
        ).values()
      ).sort(transactionBlockComparator)
    },
  },
})

export const { loadAccount, updateAccountBalance } = accountSlice.actions

let chainService: Promise<ChainService> | undefined

export default function buildAccountSlice(
  externalChainService: Promise<ChainService>
): typeof accountSlice.reducer {
  if (chainService) {
    throw new Error("Account slice can only be initialized once.")
  }

  chainService = externalChainService

  return accountSlice.reducer
}

export const subscribeToChainService = createAsyncThunk(
  "account/chain/subscribe",
  async (_: void, { dispatch }) => {
    const chain = await chainService

    chain.emitter.on("accountBalance", (accountWithBalance) => {
      // The first account balance update will transition the account to loading.
      dispatch(updateAccountBalance(enrichWithUSDAmounts(accountWithBalance)))
    })
    chain.emitter.on("transaction", (transaction) => {
      if (transaction.blockHash) {
        dispatch(accountSlice.actions.transactionConfirmed(transaction))
      } else {
        dispatch(accountSlice.actions.transactionSeen(transaction))
      }
    })

    const alreadySeen = await chain.getAccountsToTrack()
    alreadySeen.forEach((accountNetwork) => {
      // Mark as loading and wire things up.
      dispatch(loadAccount(accountNetwork.account))

      // Force a refresh of the account balance to populate the store.
      chain.getLatestBaseAccountBalance(accountNetwork)
    })
  }
)

export const subscribeToAccountNetwork = createAsyncThunk<
  Promise<void>,
  AccountNetwork,
  { state: { account: AccountState } }
>(
  "account/subscribe",
  async (accountNetwork: AccountNetwork, { dispatch, getState }) => {
    const state = getState()

    if (state.account.accountsData[accountNetwork.account]) {
      return // we already have it, don't do anything
    }

    // Otherwise, mark as loading and wire things up.
    dispatch(loadAccount(accountNetwork.account))

    const chain = await chainService

    chain.addAccountToTrack(accountNetwork)
  }
)
