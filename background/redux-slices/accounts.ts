import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { createBackgroundAsyncThunk } from "./utils"
import { AccountBalance, AddressNetwork, NameNetwork } from "../accounts"
import { EVMNetwork } from "../networks"
import { AnyAssetAmount } from "../assets"
import { DomainName, HexString, URI } from "../types"
import { normalizeAddressNetwork, sameEVMAddress } from "../lib/utils"
import { ETHEREUM } from "../constants/networks"
import {
  AssetMainCurrencyAmount,
  AssetDecimalAmount,
} from "./utils/asset-utils"

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

export type AccountData = {
  address: HexString
  network: EVMNetwork
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
  // Key account data by address and chainID. This only works for cooperating
  // EVM-based chains, and should be refactored with the addition of Solana
  // or Bitcoin
  accountsData: {
    [address: HexString]: {
      [chainID: string]: AccountData | "loading"
    }
  }
  // TODO This should all be in a selector
  combinedData: CombinedAccountData
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
} as AccountState

/*
 * Get data for a new address / network pair, including the default name and
 * avatar.
 *
 * Note that name and avatar will be unique per address, rather than per
 * address and network.
 */
function newAccountData(
  address: HexString,
  network: EVMNetwork,
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
  network: EVMNetwork,
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
    newKeyringAddress: (
      immerState,
      { payload: address }: { payload: HexString }
    ) => {
      // TODO In an ideal world, this would look up the currently selected
      // account's network, set this address + that network as loading, and
      // fire off whatever needs to happen for an account to be tracked.
      // Instead, we assume a new address starts on Ethereum
      if (immerState.accountsData[address]) {
        if (immerState.accountsData[address][ETHEREUM.chainID]) {
          return immerState
        }
        immerState.accountsData[address] = {}
      }
      immerState.accountsData[address][ETHEREUM.chainID] = "loading"
      return immerState
    },
    loadAccount: (
      immerState,
      { payload: accountToLoad }: { payload: AddressNetwork }
    ) => {
      const { address, network } = normalizeAddressNetwork(accountToLoad)

      if (immerState.accountsData[address]) {
        if (immerState.accountsData[address][network.chainID]) {
          return immerState
        }
      } else {
        immerState.accountsData[address] = {}
      }
      immerState.accountsData[address][network.chainID] = "loading"
      return immerState
    },
    updateAccountBalance: (
      immerState,
      { payload: updatedAccountBalance }: { payload: AccountBalance }
    ) => {
      const {
        address,
        network,
        assetAmount: {
          asset: { symbol: updatedAssetSymbol },
        },
      } = normalizeAddressNetwork(
        updatedAccountBalance as AddressNetwork
      ) as AccountBalance

      // If this is a tracked account, update state. Otherwise, ignore the
      // balance update.
      if (immerState.accountsData[address]) {
        if (immerState.accountsData[address][network.chainID] !== "loading") {
          ;(
            immerState.accountsData[address][network.chainID] as AccountData
          ).balances[updatedAssetSymbol] = updatedAccountBalance
        } else {
          immerState.accountsData[address][network.chainID] = {
            ...newAccountData(
              address,
              network,
              Object.keys(immerState.accountsData).filter(
                (key) => !sameEVMAddress(key, address)
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
      const accounts = Object.values(immerState.accountsData).flatMap((d) =>
        Object.values(d)
      )
      const combinedAccountBalances = accounts
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
      const { address, network } = normalizeAddressNetwork(addressNetworkName)

      if (!immerState.accountsData[address]) {
        immerState.accountsData[address] = {}
      }

      const baseAccountData = getOrCreateAccountData(
        immerState.accountsData[address][network.chainID],
        address,
        network,
        Object.keys(immerState.accountsData).filter((key) => key !== address)
          .length
      )
      immerState.accountsData[address][network.chainID] = {
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
      const { address, network } = normalizeAddressNetwork(addressNetworkAvatar)

      if (!immerState.accountsData[address]) {
        immerState.accountsData[address] = {}
      }

      const baseAccountData = getOrCreateAccountData(
        immerState.accountsData[address][network.chainID],
        address,
        network,
        Object.keys(immerState.accountsData).filter((key) => key !== address)
          .length
      )
      immerState.accountsData[address][network.chainID] = {
        ...baseAccountData,
        ens: { ...baseAccountData.ens, avatarURL: addressNetworkAvatar.avatar },
      }
    },
  },
})

export const {
  newKeyringAddress,
  loadAccount,
  updateAccountBalance,
  updateENSName,
  updateENSAvatar,
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
    const normalizedAddressNetwork = normalizeAddressNetwork(addressNetwork)

    dispatch(loadAccount(normalizedAddressNetwork))
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
