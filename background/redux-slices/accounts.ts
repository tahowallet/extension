import { createSlice } from "@reduxjs/toolkit"
import { createBackgroundAsyncThunk } from "./utils"
import { AccountBalance, AddressOnNetwork, NameOnNetwork } from "../accounts"
import { Network } from "../networks"
import { AnyAsset, AnyAssetAmount, SmartContractFungibleAsset } from "../assets"
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
  Ledger = "ledger",
  Internal = "internal",
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
  account?: AddressOnNetwork
  accountLoading?: string
  hasAccountError?: boolean
  // TODO Adapt to use AccountNetwork, probably via a Map and custom serialization/deserialization.
  accountsData: { [address: string]: AccountData | "loading" }
  combinedData: CombinedAccountData
}

export type CombinedAccountData = {
  totalMainCurrencyValue?: string
  assets: AnyAssetAmount[]
}

// Utility type, wrapped in CompleteAssetAmount<T>.
type InternalCompleteAssetAmount<
  E extends AnyAsset = AnyAsset,
  T extends AnyAssetAmount<E> = AnyAssetAmount<E>
> = T & AssetMainCurrencyAmount & AssetDecimalAmount

/**
 * An asset amount including localized and numeric main currency and decimal
 * equivalents, where applicable.
 */
export type CompleteAssetAmount<T extends AnyAsset = AnyAsset> =
  InternalCompleteAssetAmount<T, AnyAssetAmount<T>>

export type CompleteSmartContractFungibleAssetAmount =
  CompleteAssetAmount<SmartContractFungibleAsset>

export const initialState = {
  accountsData: {},
  combinedData: {
    totalMainCurrencyValue: "",
    assets: [],
  },
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
): AccountData | undefined {
  if (typeof data === "undefined") {
    // data will be unefined when we are trying to get account data
    // for an account not on any of our keyrings. If this is the case
    // we definitely do not want to add that account to the wallet.
    return data
  }
  if (data === "loading") {
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
    loadAccount: (state, { payload: accountToLoad }: { payload: string }) => {
      return state.accountsData[accountToLoad]
        ? state // If the account data already exists, the account is already loaded.
        : {
            ...state,
            accountsData: { ...state.accountsData, [accountToLoad]: "loading" },
          }
    },
    deleteAccount: (
      state,
      { payload: accountToRemove }: { payload: string }
    ) => {
      if (!state.accountsData[accountToRemove]) {
        return state
      }
      // Immutably remove the account passed in
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { [accountToRemove]: _, ...withoutAccountToRemove } =
        state.accountsData
      return {
        ...state,
        accountsData: withoutAccountToRemove,
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
      }: { payload: AddressOnNetwork & { name: DomainName } }
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

      if (baseAccountData) {
        immerState.accountsData[address] = {
          ...baseAccountData,
          ens: { ...baseAccountData.ens, name: addressNetworkName.name },
        }
      }
    },
    updateENSAvatar: (
      immerState,
      {
        payload: addressNetworkAvatar,
      }: { payload: AddressOnNetwork & { avatar: URI } }
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
      if (baseAccountData) {
        immerState.accountsData[address] = {
          ...baseAccountData,
          ens: {
            ...baseAccountData.ens,
            avatarURL: addressNetworkAvatar.avatar,
          },
        }
      }
    },
  },
})

export const {
  loadAccount,
  updateAccountBalance,
  updateENSName,
  updateENSAvatar,
} = accountSlice.actions

export default accountSlice.reducer

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
  async (addressNetwork: AddressOnNetwork, { dispatch, extra: { main } }) => {
    const normalizedAddressNetwork = {
      address: addressNetwork.address.toLowerCase(),
      network: addressNetwork.network,
    }

    dispatch(loadAccount(normalizedAddressNetwork.address))
    await main.addAccount(normalizedAddressNetwork)
  }
)

/**
 * Async thunk whose dispatch promise will return when the ENS domain account
 * has been added.
 */
export const addAccountByName = createBackgroundAsyncThunk(
  "account/addAccountByName",
  async (nameNetwork: NameOnNetwork, { extra: { main } }) => {
    await main.addAccountByName(nameNetwork)
  }
)

export const removeAccount = createBackgroundAsyncThunk(
  "account/removeAccount",
  async (address: HexString, { dispatch, extra: { main } }) => {
    dispatch(accountSlice.actions.deleteAccount(address))
    main.removeAccount(address, { type: "keyring" })
  }
)
