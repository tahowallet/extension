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
  Network,
  EIP1559Block,
} from "../types"

// Adds user-specific values based on preferences. This is the combination of a
// conversion to the user's preferred currency for viewing, as well as a
// conversion to a decimal amount for assets that are represented by
// fixed-point integers.
type UserValue = {
  userValue: number | "unknown"
  decimalValue: number | "unknown"
  localizedUserValue: string
  localizedDecimalValue: string
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

export type CombinedAccountData = {
  totalUserValue: string
  assets: (AnyAssetAmount & UserValue)[]
  activity: AnyEVMTransaction[]
}

type AccountState = {
  account?: any
  accountLoading?: string
  hasAccountError?: boolean
  // TODO Adapt to use AccountNetwork, probably via a Map and custom serialization/deserialization.
  accountsData: { [account: string]: AccountData | "loading" }
  combinedData: CombinedAccountData
  // TODO the blockHeight key should be changed to something
  // compatible with the idea of multiple networks.
  blocks: { [blockHeight: number]: EIP1559Block }
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
function enrichAssetAmountWithUserAmounts(
  assetAmount: AnyAssetAmount
): AnyAssetAmount & UserValue {
  if (isFungibleAssetAmount(assetAmount)) {
    const {
      amount,
      asset: { decimals },
    } = assetAmount
    // TODO Make this pull from the user's preferred currency and its
    // TODO conversion info.
    const userCurrencyConversion2Decimals = usdConversion2Decimals
    // TODO What actual precision do we want here? Probably more than 2
    // TODO decimals.
    const assetValue2Decimals = amount / 10n ** BigInt(decimals - 2)

    const converted2Decimals =
      assetValue2Decimals * userCurrencyConversion2Decimals

    // Multiplying two 2-decimal precision fixed-points means dividing by
    // 4-decimal precision.
    const userValue = Number(converted2Decimals) / 10000
    const decimalValue = Number(assetValue2Decimals) / 100

    return {
      ...assetAmount,
      userValue,
      decimalValue,
      localizedUserValue: userValue.toLocaleString("default", {
        maximumFractionDigits: 2,
      }),
      localizedDecimalValue: decimalValue.toLocaleString("default", {
        maximumFractionDigits: 2,
      }),
    }
  }
  return {
    ...assetAmount,
    userValue: "unknown",
    decimalValue: "unknown",
    localizedUserValue: "unknown",
    localizedDecimalValue: "unknown",
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

// TODO Much of the combinedData bits should probably be done in a Reselect
// TODO selector.
const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    blockSeen: (immerState, { payload: block }: { payload: EIP1559Block }) => {
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
        .flatMap(
          (ad) =>
            ad !== "loading" &&
            Object.values(ad.balances).map((ab) => ab.assetAmount)
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
      const existingAccounts = [
        immerState.accountsData[transaction.from.toLowerCase()],
        immerState.accountsData[transaction.to.toLowerCase()],
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
          Object.values(current(immerState.accountsData))
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
        immerState.accountsData[transaction.from.toLowerCase()],
        immerState.accountsData[transaction.to.toLowerCase()],
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
          Object.values(current(immerState.accountsData))
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

export const getAccountState = (state) => state.account

export const getFullState = (state) => state

export const selectAccountAndTimestampedActivities = createSelector(
  getFullState,
  (state) => {
    const { account, assets } = state

    // Derive activities with timestamps included
    const activity = account.combinedData.activity.map((activityItem) => {
      const isSent =
        activityItem.from.toLowerCase() ===
        Object.keys(account.accountsData)[0].toLowerCase()

      return {
        ...activityItem,
        timestamp: account?.blocks[activityItem.blockHeight]?.timestamp,
        isSent,
      }
    })

    // Keep a tally of the total user value
    let totalUserValue = 0

    // Derive account "assets"/assetAmount which include USD values using
    // data from the assets slice
    const accountAssets = account.combinedData.assets.map((assetItem) => {
      const rawAsset = assets.find(
        (asset) =>
          asset.symbol === assetItem.asset.symbol && asset.recentPrices.USD
      )

      // Does this break if the token is less than 1 USD? Hah...
      const usdNonDecimalValue =
        rawAsset.recentPrices.USD.amounts[1] > 1
          ? rawAsset.recentPrices.USD.amounts[1]
          : rawAsset.recentPrices.USD.amounts[0]

      const pricePerTokenUSD = parseInt(`${usdNonDecimalValue}`, 10) / 10 ** 10

      const totalBalanceValueUSD =
        pricePerTokenUSD *
        parseInt(`${assetItem.localizedDecimalValue}`.replace(",", ""), 10)

      // Add to total user value
      totalUserValue += totalBalanceValueUSD

      return {
        ...assetItem,
        totalBalanceValueUSD: formatPrice(totalBalanceValueUSD),
        pricePerTokenUSD: formatPrice(pricePerTokenUSD),
      }
    })

    account.combinedData.assets = accountAssets
    account.combinedData.totalUserValue = formatPrice(totalUserValue)

    return {
      combinedData: account.combinedData,
      accountData: account.accountsData,
      activity,
    }
  }
)
