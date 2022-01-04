import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { createBackgroundAsyncThunk } from "./utils"
import { AccountBalance, AddressNetwork, NameNetwork } from "../accounts"
import { AnyEVMBlock, Network } from "../networks"
import { AnyAssetAmount } from "../assets"
import {
  AssetMainCurrencyAmount,
  AssetDecimalAmount,
} from "./utils/asset-utils"
import { DomainName, HexString, URI } from "../types"

/**
 * The set of available UI account types. These may or may not map 1-to-1 to
 * internal account types, depending on how the UI chooses to display data.
 */
export const enum AccountType {
  ReadOnly = "read-only",
  Imported = "imported",
}

const availableDefaultNames = [
  "Phoenix",
  "Matilda",
  "Sirius",
  "Topa",
  "Atos",
  "Sport",
  "Lola",
  "Foz",
]

type AccountData = {
  address: HexString
  network: Network
  accountType: AccountType | undefined
  balances: {
    [assetSymbol: string]: AccountBalance
  }
  ens: {
    name?: DomainName
    avatarURL?: URI
  }
  defaultName: string
  defaultAvatar: string
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

function newAccountData(
  address: HexString,
  network: Network,
  existingAccountsCount: number
): AccountData {
  const defaultNameIndex =
    // Skip potentially-used names at the beginning of the array if relevant,
    // see below.
    (existingAccountsCount % availableDefaultNames.length) +
    Number(
      // Treat the address as a number and mod it to get an index into
      // default names.
      BigInt(address) %
        BigInt(
          availableDefaultNames.length -
            (existingAccountsCount % availableDefaultNames.length)
        )
    )
  const defaultAccountName = availableDefaultNames[defaultNameIndex]

  // Move used default names to the start so they can be skipped above.
  availableDefaultNames.splice(defaultNameIndex, 1)
  availableDefaultNames.unshift(defaultAccountName)

  const defaultAccountAvatar = `./images/avatars/${defaultAccountName.toLowerCase()}@2x.png`

  return {
    address,
    network,
    accountType: undefined,
    balances: {},
    ens: {},
    defaultName: defaultAccountName,
    defaultAvatar: defaultAccountAvatar,
  }
}

function getOrCreateAccountData(
  data: AccountData | "loading" | undefined,
  account: HexString,
  network: Network,
  existingAccountsCount: number
): AccountData {
  if (data === "loading" || !data) {
    return newAccountData(account, network, existingAccountsCount)
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
      if (existingAccountData) {
        if (existingAccountData !== "loading") {
          existingAccountData.balances[updatedAssetSymbol] =
            updatedAccountBalance
        } else {
          immerState.accountsData[updatedAccount] = {
            ...newAccountData(
              updatedAccount,
              updatedAccountBalance.network,
              Object.keys(immerState.accountsData).filter(
                (key) => key !== updatedAccount
              ).length
            ),
            balances: {
              [updatedAssetSymbol]: updatedAccountBalance,
            },
          }
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
        addressNetworkName.network,
        Object.keys(immerState.accountsData).filter((key) => key !== address)
          .length
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
        addressNetworkAvatar.network,
        Object.keys(immerState.accountsData).filter((key) => key !== address)
          .length
      )
      immerState.accountsData[address] = {
        ...baseAccountData,
        ens: { ...baseAccountData.ens, avatarURL: addressNetworkAvatar.avatar },
      }
    },
  },
})

export const {
  loadAccount,
  updateAccountBalance,
  updateENSName,
  updateENSAvatar,
  blockSeen,
} = accountSlice.actions

export default accountSlice.reducer

export type Events = {
  addAccount: AddressNetwork
  addAccountByName: NameNetwork
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

/**
 * Async thunk whose dispatch promise will return when the ENS domain account
 * has been added.
 */
export const addAccountByName = createBackgroundAsyncThunk(
  "account/addAccountByName",
  async (nameNetwork: NameNetwork) => {
    await emitter.emit("addAccountByName", nameNetwork)
  }
)
