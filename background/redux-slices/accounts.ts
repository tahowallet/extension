import { createSlice, createSelector, current } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { createBackgroundAsyncThunk } from "./utils"
import { AccountBalance, AccountNetwork } from "../accounts"
import {
  AnyEVMTransaction,
  ConfirmedEVMTransaction,
  AnyEVMBlock,
  Network,
} from "../networks"
import { AnyAssetAmount } from "../assets"
import { AssetsState, selectAssetPricePoint } from "./assets"
import { selectHideDust, selectMainCurrency, UIState } from "./ui"
import {
  AssetDecimalAmount,
  AssetMainCurrencyAmount,
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
  formatCurrencyAmount,
} from "./helpers"

type AccountData = {
  account: string
  network: Network
  balances: {
    [assetSymbol: string]: AccountBalance
  }
  confirmedTransactions: ConfirmedEVMTransaction[]
  unconfirmedTransactions: AnyEVMTransaction[]
}

export type AccountState = {
  account?: { address: string }
  accountLoading?: string
  hasAccountError?: boolean
  // TODO Adapt to use AccountNetwork, probably via a Map and custom serialization/deserialization.
  accountsData: { [account: string]: AccountData | "loading" }
  combinedData: CombinedAccountData
  // TODO the blockHeight key should be changed to something
  // compatible with the idea of multiple networks.
  blocks: { [blockHeight: number]: AnyEVMBlock }
}

export type CombinedAccountData = {
  totalMainCurrencyValue?: string
  assets: AnyAssetAmount[]
  activity: AnyEVMTransaction[]
}

const USER_VALUE_DUST_THRESHOLD = 2

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
    totalMainCurrencyValue: "",
    assets: [],
    activity: [],
  },
  blocks: {},
} as AccountState

// Looks up existing account data in the given AccountState, dealing with
// undefined addresses and filtering out data that is still loading.
function lookUpExistingAccountData(
  state: AccountState,
  ...addresses: (string | undefined)[]
): AccountData[] {
  return addresses
    .map((a) => {
      if (typeof a !== "undefined") {
        return state.accountsData[a]
      }
      return undefined
    })
    .filter(
      (a): a is AccountData => typeof a !== "undefined" && a !== "loading"
    )
}

// TODO Much of the combinedData bits should probably be done in a Reselect
// TODO selector.
const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    blockSeen: (immerState, { payload: block }: { payload: AnyEVMBlock }) => {
      immerState.blocks[block.blockHeight] = block
    },
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
      { payload: updatedAccountBalance }: { payload: AccountBalance }
    ) => {
      const {
        account: updatedAccount,
        assetAmount: {
          asset: { symbol: updatedAssetSymbol },
        },
      } = updatedAccountBalance
      const existingAccountData = immerState.accountsData[updatedAccount]
      if (existingAccountData && existingAccountData !== "loading") {
        existingAccountData.balances[updatedAssetSymbol] = updatedAccountBalance
      } else {
        immerState.accountsData[updatedAccount] = {
          account: updatedAccount,
          network: updatedAccountBalance.network,
          balances: {
            [updatedAssetSymbol]: updatedAccountBalance,
          },
          unconfirmedTransactions: [],
          confirmedTransactions: [],
        }
      }

      // A key assumption here is that the balances of two accounts in
      // accountsData are mutually exclusive; that is, that there are no two
      // accounts in accountsData all or part of whose balances are shared with
      // each other.
      const combinedAccountBalances = Object.values(immerState.accountsData)
        .flatMap((ad) =>
          ad === "loading"
            ? []
            : Object.values(ad.balances).map((ab) => ab.assetAmount)
        )
        .filter((b) => b)

      immerState.combinedData.assets = Object.values(
        combinedAccountBalances.reduce<{
          [symbol: string]: AnyAssetAmount
        }>((acc, combinedAssetAmount) => {
          const assetSymbol = combinedAssetAmount.asset.symbol
          acc[assetSymbol] = {
            ...combinedAssetAmount,
            amount:
              (acc[assetSymbol]?.amount || 0n) + combinedAssetAmount.amount,
          }
          return acc
        }, {})
      )
    },
    transactionSeen: (
      immerState,
      { payload: transaction }: { payload: AnyEVMTransaction }
    ) => {
      const existingAccounts = lookUpExistingAccountData(
        immerState,
        transaction.from.toLowerCase(),
        transaction.to?.toLowerCase()
      )

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
          Object.values(current(immerState.accountsData))
            .flatMap((ad) =>
              ad === "loading"
                ? []
                : ad.unconfirmedTransactions.concat(ad.confirmedTransactions)
            )
            .map((t) => [t.hash, t])
        ).values()
      ).sort(transactionBlockComparator)
    },
    transactionConfirmed: (
      immerState,
      { payload: transaction }: { payload: ConfirmedEVMTransaction }
    ) => {
      const existingAccounts = lookUpExistingAccountData(
        immerState,
        transaction.from.toLowerCase(),
        transaction.to?.toLowerCase()
      )

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
          Object.values(current(immerState.accountsData))
            .flatMap((ad) =>
              ad === "loading"
                ? []
                : ad.unconfirmedTransactions.concat(ad.confirmedTransactions)
            )
            .map((t) => [t.hash, t])
        ).values()
      ).sort(transactionBlockComparator)
    },
  },
})

export const {
  loadAccount,
  updateAccountBalance,
  transactionSeen,
  transactionConfirmed,
  blockSeen,
} = accountSlice.actions

export default accountSlice.reducer

export type Events = {
  addAccount: AccountNetwork
}

export const emitter = new Emittery<Events>()

/**
 * Async thunk whose dispatch promise will return when the account has been
 * added.
 *
 * Actual account data will flow into the redux store through other channels;
 * the promise returned from this action's dispatch will be fulfilled by a void
 * value.
 */

export const addAccountNetwork = createBackgroundAsyncThunk(
  "account/addAccount",
  async (accountNetwork: AccountNetwork, { dispatch }) => {
    dispatch(loadAccount(accountNetwork.account))
    await emitter.emit("addAccount", accountNetwork)
  }
)

/**
 * An asset amount including localized and numeric main currency and decimal
 * equivalents, where applicable.
 */
export type CompleteAssetAmount = AnyAssetAmount &
  AssetMainCurrencyAmount &
  AssetDecimalAmount

export const getAccountState = (state: {
  account: AccountState
}): AccountState => state.account

// FIXME This should probably live somewhere else.
export const getFullState = (state: {
  account: AccountState
  assets: AssetsState
  ui: UIState
}): { account: AccountState; assets: AssetsState; ui: UIState } => state

export const selectAccountAndTimestampedActivities = createSelector(
  getFullState,
  (state) => {
    const { account, ui } = state

    const hideDust = selectHideDust({ ui })
    const mainCurrency = selectMainCurrency({ ui })
    // TODO What actual precision do we want here? Probably more than 2
    // TODO decimals? Maybe it's configurable?
    const desiredDecimals = 2

    // Derive activities with timestamps included
    const activity = account.combinedData.activity.map((activityItem) => {
      const isSent =
        activityItem.from.toLowerCase() ===
        Object.keys(account.accountsData)[0].toLowerCase()

      return {
        ...activityItem,
        ...(activityItem.blockHeight && {
          timestamp: account?.blocks[activityItem.blockHeight]?.timestamp,
        }),
        isSent,
      }
    })

    // Keep a tally of the total user value; undefined if no main currency data
    // is available.
    let totalMainCurrencyAmount: number | undefined

    // Derive account "assets"/assetAmount which include USD values using
    // data from the assets slice
    const accountAssets = account.combinedData.assets
      .map<CompleteAssetAmount>((assetItem) => {
        const assetPricePoint = selectAssetPricePoint(
          state.assets,
          assetItem.asset.symbol,
          mainCurrency
        )

        if (assetPricePoint) {
          const enrichedAssetAmount = enrichAssetAmountWithDecimalValues(
            enrichAssetAmountWithMainCurrencyValues(
              assetItem,
              assetPricePoint,
              desiredDecimals
            ),
            desiredDecimals
          )

          if (typeof enrichedAssetAmount.mainCurrencyAmount !== "undefined") {
            totalMainCurrencyAmount ??= 0 // initialize if needed
            totalMainCurrencyAmount += enrichedAssetAmount.mainCurrencyAmount
          }

          return enrichedAssetAmount
        }

        return enrichAssetAmountWithDecimalValues(assetItem, desiredDecimals)
      })
      .filter((assetItem) => {
        const isNotDust =
          typeof assetItem.mainCurrencyAmount === "undefined"
            ? true
            : assetItem.mainCurrencyAmount > USER_VALUE_DUST_THRESHOLD
        const isPresent = assetItem.decimalAmount > 0
        // FIXME Remove infinite amount filtering.
        const isNotInfinite = assetItem.localizedDecimalAmount !== "∞"

        // Hide dust, missing amounts, or infinite amounts.
        return (hideDust ? isNotDust && isPresent : isPresent) && isNotInfinite
      })

    return {
      combinedData: {
        assets: accountAssets,
        totalMainCurrencyValue: totalMainCurrencyAmount
          ? formatCurrencyAmount(
              mainCurrency,
              totalMainCurrencyAmount,
              desiredDecimals
            )
          : undefined,
        activity: account.combinedData.activity,
      },
      accountData: account.accountsData,
      activity,
    }
  }
)
