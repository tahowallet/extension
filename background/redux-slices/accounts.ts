import { createSlice, createSelector, current } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { createBackgroundAsyncThunk } from "./utils"
import { AccountBalance, AddressNetwork } from "../accounts"
import {
  AnyEVMTransaction,
  ConfirmedEVMTransaction,
  AnyEVMBlock,
  Network,
} from "../networks"
import { AnyAssetAmount } from "../assets"
import { AssetsState } from "./assets"
import { UIState } from "./ui"
import {
  AssetMainCurrencyAmount,
  AssetDecimalAmount,
  formatCurrencyAmount,
} from "./utils/asset-utils"
import { DomainName, HexString, URI } from "../types"

type AccountData = {
  address: HexString
  network: Network
  balances: {
    [assetSymbol: string]: AccountBalance
  }
  confirmedTransactions: ConfirmedEVMTransaction[]
  unconfirmedTransactions: AnyEVMTransaction[]
  ens: {
    name?: DomainName
    avatarURL?: URI
  }
}

export type AccountState = {
  account?: AddressNetwork
  accountLoading?: string
  hasAccountError?: boolean
  // TODO Adapt to use AccountNetwork, probably via a Map and custom serialization/deserialization.
  accountsData: { [address: string]: AccountData | "loading" }
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

/**
 * An asset amount including localized and numeric main currency and decimal
 * equivalents, where applicable.
 */
export type CompleteAssetAmount = AnyAssetAmount &
  AssetMainCurrencyAmount &
  AssetDecimalAmount

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

function newAccountData(address: HexString, network: Network): AccountData {
  return {
    address,
    network,
    balances: {},
    unconfirmedTransactions: [],
    confirmedTransactions: [],
    ens: {},
  }
}

function getOrCreateAccountData(
  data: AccountData | "loading" | undefined,
  account: HexString,
  network: Network
): AccountData {
  if (data === "loading" || !data) {
    return newAccountData(account, network)
  }
  return data
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
        address: updatedAccount,
        assetAmount: {
          asset: { symbol: updatedAssetSymbol },
        },
      } = updatedAccountBalance
      const existingAccountData = immerState.accountsData[updatedAccount]
      if (existingAccountData && existingAccountData !== "loading") {
        existingAccountData.balances[updatedAssetSymbol] = updatedAccountBalance
      } else {
        immerState.accountsData[updatedAccount] = {
          ...newAccountData(updatedAccount, updatedAccountBalance.network),
          balances: {
            [updatedAssetSymbol]: updatedAccountBalance,
          },
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
    updateENSName: (
      immerState,
      {
        payload: addressNetworkName,
      }: { payload: AddressNetwork & { name: DomainName } }
    ) => {
      // TODO Refactor when accounts are also keyed per network.
      const address = addressNetworkName.address.toLowerCase()
      const baseAccountData = getOrCreateAccountData(
        immerState.accountsData[address],
        address,
        addressNetworkName.network
      )
      immerState.accountsData[address] = {
        ...baseAccountData,
        ens: { ...baseAccountData.ens, name: addressNetworkName.name },
      }
    },
    updateENSAvatar: (
      immerState,
      {
        payload: addressNetworkAvatar,
      }: { payload: AddressNetwork & { avatar: URI } }
    ) => {
      // TODO Refactor when accounts are also keyed per network.
      const address = addressNetworkAvatar.address.toLowerCase()
      const baseAccountData = getOrCreateAccountData(
        immerState.accountsData[address],
        address,
        addressNetworkAvatar.network
      )
      immerState.accountsData[address] = {
        ...baseAccountData,
        ens: { ...baseAccountData.ens, name: addressNetworkAvatar.avatar },
      }
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
  updateENSName,
  updateENSAvatar,
  transactionSeen,
  transactionConfirmed,
  blockSeen,
} = accountSlice.actions

export default accountSlice.reducer

export type Events = {
  addAccount: AddressNetwork
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
export const addAddressNetwork = createBackgroundAsyncThunk(
  "account/addAccount",
  async (addressNetwork: AddressNetwork, { dispatch }) => {
    dispatch(loadAccount(addressNetwork.address))
    await emitter.emit("addAccount", addressNetwork)
  }
)

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

    // Choose the precision we actually want
    const desiredDecimals = 2
    // TODO Read this from settings.
    const mainCurrency = "USD"

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
    let totalMainCurrencyAmount: number | undefined

    // Derive account "assets"/assetAmount which include USD values using
    // data from the assets slice
    const accountAssets = account.combinedData.assets.map<CompleteAssetAmount>(
      (assetItem) => {
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

          // Multiply the amount by the conversion factor (usdNonDecimalValue) as BigInts
          const userValue = usdNonDecimalValue * BigInt(assetItem.amount)

          const dividedOutDecimals =
            userValue /
            10n ** (BigInt(combinedDecimals) - BigInt(desiredDecimals))
          const localizedUserValue =
            Number(dividedOutDecimals) / 10 ** desiredDecimals

          // Add to total user value
          if (localizedUserValue > 0) {
            if (typeof totalMainCurrencyAmount === "undefined") {
              totalMainCurrencyAmount = localizedUserValue
            } else if (typeof totalMainCurrencyAmount === "number") {
              totalMainCurrencyAmount += localizedUserValue
            }
          }

          return {
            ...assetItem,
            decimalAmount:
              Number(
                assetItem.amount /
                  10n ** BigInt(assetItem.asset.decimals - desiredDecimals)
              ) / 100,
            localizedMainCurrencyAmount: formatCurrencyAmount(
              mainCurrency,
              localizedUserValue,
              desiredDecimals
            ),
            localizedPricePerToken: formatCurrencyAmount(
              mainCurrency,
              Number(usdNonDecimalValue) / 10 ** usdDecimals,
              desiredDecimals
            ),
          }
        }
        return {
          ...assetItem,
        }
      }
    )

    const updatedAccountAssets = [...accountAssets].filter((assetItem) => {
      // If hideDust is true the below will filter out tokens that have USD value set
      // Value currently set to 2(usd) can be changed to a dynamic value later
      // This will have to use a different method if we introduce other currencies
      if (ui.settings?.hideDust) {
        const reformat = parseFloat(
          assetItem.localizedMainCurrencyAmount?.replace(/,/g, "") ?? "0"
        )
        return (
          (reformat > USER_VALUE_DUST_THRESHOLD ||
            assetItem.localizedMainCurrencyAmount === "Unknown") &&
          ((typeof assetItem.decimalAmount !== "undefined" &&
            assetItem.decimalAmount > 0) ||
            assetItem.decimalAmount === null)
        )
      }
      return (
        assetItem.asset.symbol === "ETH" ||
        (typeof assetItem.decimalAmount !== "undefined" &&
          (assetItem.decimalAmount > 0 || assetItem.decimalAmount === null))
      )
    })

    return {
      combinedData: {
        assets: updatedAccountAssets,
        totalUserValue: totalMainCurrencyAmount
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
