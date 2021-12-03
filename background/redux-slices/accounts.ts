import { createSlice } from "@reduxjs/toolkit"
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
import {
  AssetMainCurrencyAmount,
  AssetDecimalAmount,
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
}

/**
 * An asset amount including localized and numeric main currency and decimal
 * equivalents, where applicable.
 */
export type CompleteAssetAmount = AnyAssetAmount &
  AssetMainCurrencyAmount &
  AssetDecimalAmount

export const initialState = {
  accountsData: {},
  combinedData: {
    totalMainCurrencyValue: "",
    assets: [],
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
        ens: { ...baseAccountData.ens, avatarURL: addressNetworkAvatar.avatar },
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
    const normalizedAddressNetwork = {
      address: addressNetwork.address.toLowerCase(),
      network: addressNetwork.network,
    }

    dispatch(loadAccount(normalizedAddressNetwork.address))
    await emitter.emit("addAccount", normalizedAddressNetwork)
  }
)
