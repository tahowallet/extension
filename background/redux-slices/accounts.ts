import { createSlice, createSelector, current } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { createBackgroundAsyncThunk } from "./utils"
import {
  AccountBalance,
  AccountNetwork,
  AnyAssetAmount,
  AnyEVMTransaction,
  ConfirmedEVMTransaction,
  FungibleAssetAmount,
  AnyEVMBlock,
  Network,
} from "../types"
import { AssetsState } from "./assets"
import { UIState } from "./ui"

// Adds user-specific values based on preferences. This is the combination of a
// conversion to the user's preferred currency for viewing, as well as a
// conversion to a decimal amount for assets that are represented by
// fixed-point integers.
type UserValue = {
  userValue: number | "unknown"
  decimalValue: number | "unknown"
  localizedUserValue?: string
  localizedDecimalValue?: string
  localizedPricePerToken?: string
}

type AccountBalanceWithUserValue = AccountBalance & {
  assetAmount: AnyAssetAmount & UserValue
}

type AccountData = {
  account: string
  network: Network
  balances: {
    [assetSymbol: string]: AccountBalanceWithUserValue
  }
  confirmedTransactions: ConfirmedEVMTransaction[]
  unconfirmedTransactions: AnyEVMTransaction[]
}

export type AccountState = {
  account?: any
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
  totalUserValue?: string
  assets: (AnyAssetAmount & UserValue)[]
  activity: AnyEVMTransaction[]
}

const USER_VALUE_DUST_THRESHOLD = 2

// Type assertion to confirm an AnyAssetAmount is a FungibleAssetAmount.
function isFungibleAssetAmount(
  assetAmount: AnyAssetAmount
): assetAmount is FungibleAssetAmount {
  return "decimals" in assetAmount.asset
}

// Fill in USD amounts for an asset.
function enrichAssetAmountWithUserAmounts(
  assetAmount: AnyAssetAmount
): AnyAssetAmount & UserValue {
  if (isFungibleAssetAmount(assetAmount)) {
    const {
      amount,
      asset: { decimals },
    } = assetAmount

    // TODO What actual precision do we want here? Probably more than 2
    // TODO decimals.
    const assetValue2Decimals = amount / 10n ** BigInt(decimals - 2)

    // Multiplying two 2-decimal precision fixed-points means dividing by
    // 4-decimal precision.
    const decimalValue = Number(assetValue2Decimals) / 100

    return {
      ...assetAmount,
      userValue: "unknown",
      decimalValue,
      localizedDecimalValue: decimalValue.toLocaleString("default", {
        maximumFractionDigits: 2,
      }),
    }
  }
  return {
    ...assetAmount,
    userValue: "unknown",
    decimalValue: "unknown",
  }
}

// Fill in USD amounts for an account balance.
function enrichWithUserAmounts(
  accountBalance: AccountBalance
): AccountBalanceWithUserValue {
  return {
    ...accountBalance,
    assetAmount: enrichAssetAmountWithUserAmounts(accountBalance.assetAmount),
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
    totalUserValue: "",
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
        existingAccountData.balances[updatedAssetSymbol] =
          enrichWithUserAmounts(updatedAccountBalance)
      } else {
        immerState.accountsData[updatedAccount] = {
          account: updatedAccount,
          network: updatedAccountBalance.network,
          balances: {
            [updatedAssetSymbol]: enrichWithUserAmounts(updatedAccountBalance),
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

      immerState.combinedData.totalUserValue = combinedAccountBalances
        .reduce(
          (acc, { userValue }) =>
            userValue === "unknown" ? acc : acc + userValue,
          0
        )
        .toLocaleString("default", { maximumFractionDigits: 2 })
      immerState.combinedData.assets = Object.values(
        combinedAccountBalances.reduce<{
          [symbol: string]: AnyAssetAmount & UserValue
        }>((acc, combinedAssetAmount) => {
          const assetSymbol = combinedAssetAmount.asset.symbol
          acc[assetSymbol] = enrichAssetAmountWithUserAmounts({
            ...combinedAssetAmount,
            amount:
              (acc[assetSymbol]?.amount || 0n) + combinedAssetAmount.amount,
          })
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

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  })
    .format(price)
    .split("$")[1]
}

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
    const { account, assets, ui } = state

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

    // Keep a tally of the total user value
    let totalUserValue: number | undefined

    // Derive account "assets"/assetAmount which include USD values using
    // data from the assets slice
    const accountAssets = account.combinedData.assets
      .filter((assetItem) => {
        return assetItem.localizedDecimalValue !== "∞"
      })
      .map((assetItem) => {
        const rawAsset = assets.find(
          (asset) =>
            asset.symbol === assetItem.asset.symbol && asset.recentPrices.USD
        )

        // TODO Better determine which side is USD---possibly using
        // TODO USD.pair[0|1].symbol and a known constant?
        const possibleUsdAmount = rawAsset?.recentPrices?.USD?.amounts?.[1]
        const usdIndex =
          possibleUsdAmount !== undefined && possibleUsdAmount > 1 ? 1 : 0
        const usdAsset = rawAsset?.recentPrices?.USD?.pair[usdIndex]

        if (
          rawAsset &&
          usdAsset &&
          "decimals" in usdAsset &&
          "decimals" in assetItem.asset
        ) {
          const usdNonDecimalValue = rawAsset.recentPrices.USD.amounts[usdIndex]

          const usdDecimals = usdAsset.decimals
          const combinedDecimals = assetItem.asset.decimals + usdDecimals

          // Choose the precision we actually want
          const desiredDecimals = 2

          // Multiply the amount by the conversion factor (usdNonDecimalValue) as BigInts
          const userValue = usdNonDecimalValue * BigInt(assetItem.amount)

          const dividedOutDecimals =
            userValue /
            10n ** (BigInt(combinedDecimals) - BigInt(desiredDecimals))
          const localizedUserValue =
            Number(dividedOutDecimals) / 10 ** desiredDecimals

          // Add to total user value
          if (localizedUserValue > 0) {
            if (typeof totalUserValue === "undefined") {
              totalUserValue = localizedUserValue
            } else if (typeof totalUserValue === "number") {
              totalUserValue += localizedUserValue
            }
          }

          return {
            ...assetItem,
            localizedUserValue: formatPrice(localizedUserValue),
            localizedPricePerToken: formatPrice(
              Number(usdNonDecimalValue) / 10 ** usdDecimals
            ),
          }
        }
        return {
          ...assetItem,
        }
      })

    const updatedAccountAssets = [...accountAssets].filter((assetItem) => {
      // If hideDust is true the below will filter out tokens that have USD value set
      // Value currently set to 2(usd) can be changed to a dynamic value later
      // This will have to use a different method if we introduce other currencies
      if (ui.settings?.hideDust) {
        const reformat = parseFloat(
          assetItem.localizedUserValue?.replace(/,/g, "") ?? "0"
        )
        return (
          (reformat > USER_VALUE_DUST_THRESHOLD ||
            assetItem.localizedUserValue === "Unknown") &&
          (assetItem.decimalValue > 0 || assetItem.decimalValue === null)
        )
      }
      return assetItem.decimalValue > 0 || assetItem.decimalValue === null
    })

    return {
      combinedData: {
        assets: updatedAccountAssets,
        totalUserValue: totalUserValue
          ? formatPrice(totalUserValue)
          : undefined,
        activity: account.combinedData.activity,
      },
      accountData: account.accountsData,
      activity,
    }
  }
)
