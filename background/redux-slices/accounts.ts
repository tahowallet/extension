import { createSlice } from "@reduxjs/toolkit"
import { createBackgroundAsyncThunk } from "./utils"
import { AccountBalance, AddressOnNetwork, NameOnNetwork } from "../accounts"
import { EVMNetwork, Network } from "../networks"
import { AnyAsset, AnyAssetAmount, SmartContractFungibleAsset } from "../assets"
import {
  AssetMainCurrencyAmount,
  AssetDecimalAmount,
  isBaseAssetForNetwork,
  getFullAssetID,
  FullAssetID,
} from "./utils/asset-utils"
import { DomainName, HexString, URI } from "../types"
import { normalizeEVMAddress } from "../lib/utils"
import { AccountSigner } from "../services/signing"

/**
 * The set of available UI account types. These may or may not map 1-to-1 to
 * internal account types, depending on how the UI chooses to display data.
 */
export const enum AccountType {
  ReadOnly = "read-only",
  PrivateKey = "private-key",
  Imported = "imported",
  Ledger = "ledger",
  Internal = "internal",
}

export const accountTypes = [
  AccountType.Internal,
  AccountType.Imported,
  AccountType.PrivateKey,
  AccountType.Ledger,
  AccountType.ReadOnly,
]

export const DEFAULT_ACCOUNT_NAMES = [
  "Phoenix",
  "Matilda",
  "Sirius",
  "Topa",
  "Atos",
  "Sport",
  "Lola",
  "Foz",
]

const availableDefaultNames = [...DEFAULT_ACCOUNT_NAMES]

/**
 * A slim balance record stored per-asset in each account. The full asset
 * object lives in the assets entity table; the network and address are
 * derivable from the parent keys in accountsData.evm[chainID][address].
 */
export type NormalizedBalance = {
  amount: bigint
  blockHeight?: bigint
  retrievedAt: number
  dataSource: "boar" | "generic-rpc" | "local"
}

export type AccountData = {
  address: HexString
  network: Network
  balances: {
    [assetID: FullAssetID]: NormalizedBalance
  }
  ens: {
    name?: DomainName
    avatarURL?: URI
  }
  defaultName: string
  defaultAvatar: string
}

type AccountsByChainID = {
  [chainID: string]: {
    [address: string]: AccountData | "loading"
  }
}

export type AccountState = {
  account?: AddressOnNetwork
  accountLoading?: string
  hasAccountError?: boolean
  accountsData: {
    evm: AccountsByChainID
  }
}

// Utility type, wrapped in CompleteAssetAmount<T>.
type InternalCompleteAssetAmount<
  E extends AnyAsset = AnyAsset,
  T extends AnyAssetAmount<E> = AnyAssetAmount<E>,
> = T & AssetMainCurrencyAmount & AssetDecimalAmount

/**
 * An asset amount including localized and numeric main currency and decimal
 * equivalents, where applicable.
 */
export type CompleteAssetAmount<T extends AnyAsset = AnyAsset> =
  InternalCompleteAssetAmount<T, AnyAssetAmount<T>>

export type CompleteSmartContractFungibleAssetAmount =
  CompleteAssetAmount<SmartContractFungibleAsset>

export const initialState: AccountState = {
  accountsData: { evm: {} },
}

function normalizeBalance(balance: AccountBalance): NormalizedBalance {
  return {
    amount: balance.assetAmount.amount,
    blockHeight: balance.blockHeight,
    retrievedAt: balance.retrievedAt,
    dataSource: balance.dataSource,
  }
}

function newAccountData(
  address: HexString,
  network: EVMNetwork,
  accountsState: AccountState,
): AccountData {
  const existingAccountsCount = Object.keys(
    accountsState.accountsData.evm[network.chainID],
  ).filter((key) => key !== address).length

  const sameAccountOnDifferentChain = Object.values(
    accountsState.accountsData.evm,
  )
    .flatMap((chain) => Object.values(chain))
    .find(
      (accountData): accountData is AccountData =>
        accountData !== "loading" && accountData.address === address,
    )
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
            (existingAccountsCount % availableDefaultNames.length),
        ),
    )

  let defaultAccountName = sameAccountOnDifferentChain?.defaultName

  if (typeof defaultAccountName === "undefined") {
    defaultAccountName = availableDefaultNames[defaultNameIndex]
    // Move used default names to the start so they can be skipped above.
    availableDefaultNames.splice(defaultNameIndex, 1)
    availableDefaultNames.unshift(defaultAccountName)
  }

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
  accountState: AccountState,
  account: HexString,
  network: EVMNetwork,
): AccountData {
  const accountData = accountState.accountsData.evm[network.chainID][account]

  if (accountData === "loading" || !accountData) {
    return newAccountData(account, network, accountState)
  }
  return accountData
}

const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    loadAccount: (
      immerState,
      { payload: { address, network } }: { payload: AddressOnNetwork },
    ) => {
      const normalizedAddress = normalizeEVMAddress(address)
      if (
        immerState.accountsData.evm[network.chainID]?.[normalizedAddress] !==
        undefined
      ) {
        // If the account data already exists, the account is already loaded.
        return
      }

      immerState.accountsData.evm[network.chainID] ??= {}

      immerState.accountsData.evm[network.chainID] = {
        ...immerState.accountsData.evm[network.chainID],
        [normalizedAddress]: "loading",
      }
    },
    deleteAccount: (
      immerState,
      { payload: address }: { payload: HexString },
    ) => {
      const normalizedAddress = normalizeEVMAddress(address)

      const { evm } = immerState.accountsData

      if (
        // One of the chains
        !Object.keys(evm ?? {}).some((chainID) =>
          // has an address equal to the one we're trying to remove
          Object.keys(evm[chainID]).some(
            (addressOnChain) => addressOnChain === normalizedAddress,
          ),
        )
      ) {
        // If none of the chains we're tracking has a matching address - this is a noop.
        return
      }

      // Delete the account from all chains.
      Object.keys(evm).forEach((chainId) => {
        const { [normalizedAddress]: _, ...withoutEntryToRemove } = evm[chainId]

        immerState.accountsData.evm[chainId] = withoutEntryToRemove
      })
    },
    updateAccountBalance: (
      immerState,
      {
        payload: { balances },
      }: {
        payload: {
          balances: AccountBalance[]
          addressOnNetwork: AddressOnNetwork
        }
      },
    ) => {
      balances.forEach((updatedAccountBalance) => {
        const {
          address,
          network,
          assetAmount: { asset },
        } = updatedAccountBalance
        const assetID = getFullAssetID(asset)

        const normalizedAddress = normalizeEVMAddress(address)
        const existingAccountData =
          immerState.accountsData.evm[network.chainID]?.[normalizedAddress]

        // Don't upsert, only update existing account entries.
        if (existingAccountData === undefined) {
          return
        }

        if (existingAccountData !== "loading") {
          if (
            updatedAccountBalance.assetAmount.amount === 0n &&
            existingAccountData.balances[assetID] === undefined &&
            !isBaseAssetForNetwork(asset, network) // add base asset even if balance is 0
          ) {
            return
          }
          existingAccountData.balances[assetID] = normalizeBalance(
            updatedAccountBalance,
          )
        } else {
          immerState.accountsData.evm[network.chainID][normalizedAddress] = {
            ...newAccountData(address, network, immerState),
            balances: {
              [assetID]: normalizeBalance(updatedAccountBalance),
            },
          }
        }
      })
    },
    updateAccountName: (
      immerState,
      {
        payload: { address, network, name },
      }: { payload: AddressOnNetwork & { name: DomainName } },
    ) => {
      const normalizedAddress = normalizeEVMAddress(address)

      // No entry means this name doesn't correspond to an account we are
      // tracking.
      if (
        immerState.accountsData.evm[network.chainID]?.[normalizedAddress] ===
        undefined
      ) {
        return
      }

      immerState.accountsData.evm[network.chainID] ??= {}

      const baseAccountData = getOrCreateAccountData(
        immerState,
        normalizedAddress,
        network,
      )

      immerState.accountsData.evm[network.chainID][normalizedAddress] = {
        ...baseAccountData,
        ens: { ...baseAccountData.ens, name },
      }
    },
    updateENSAvatar: (
      immerState,
      {
        payload: { address, network, avatar },
      }: {
        payload: AddressOnNetwork & { avatar: URI }
      },
    ) => {
      const normalizedAddress = normalizeEVMAddress(address)

      // No entry means this avatar doesn't correspond to an account we are
      // tracking.
      if (
        immerState.accountsData.evm[network.chainID]?.[normalizedAddress] ===
        undefined
      ) {
        return
      }

      immerState.accountsData.evm[network.chainID] ??= {}

      const baseAccountData = getOrCreateAccountData(
        immerState,
        normalizedAddress,
        network,
      )

      immerState.accountsData.evm[network.chainID][normalizedAddress] = {
        ...baseAccountData,
        ens: { ...baseAccountData.ens, avatarURL: avatar },
      }
    },
    removeAssetReferences: (
      immerState,
      { payload: asset }: { payload: SmartContractFungibleAsset },
    ) => {
      const assetID = getFullAssetID(asset)
      const allAccounts = immerState.accountsData.evm[asset.homeNetwork.chainID]
      Object.keys(allAccounts).forEach((address) => {
        const account = allAccounts[address]
        if (account !== "loading") {
          delete account.balances[assetID]
        }
      })
    },
    removeChainBalances: (
      immerState,
      { payload: chainID }: { payload: string },
    ) => {
      delete immerState.accountsData.evm[chainID]
    },
  },
})

export const {
  deleteAccount,
  loadAccount,
  updateAccountBalance,
  updateAccountName,
  updateENSAvatar,
  removeAssetReferences,
  removeChainBalances,
} = accountSlice.actions

export default accountSlice.reducer

/**
 * Async thunk whose dispatch promise will return a resolved name or undefined
 * if the name cannot be resolved.
 */
export const resolveNameOnNetwork = createBackgroundAsyncThunk(
  "account/resolveNameOnNetwork",
  async (nameOnNetwork: NameOnNetwork, { extra: { main } }) =>
    main.resolveNameOnNetwork(nameOnNetwork),
)

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
      address: normalizeEVMAddress(addressNetwork.address),
      network: addressNetwork.network,
    }

    dispatch(loadAccount(normalizedAddressNetwork))
    await main.addAccount(normalizedAddressNetwork)
  },
)

export const addOrEditAddressName = createBackgroundAsyncThunk(
  "account/addOrEditAddressName",
  async (payload: AddressOnNetwork & { name: string }, { extra: { main } }) => {
    await main.addOrEditAddressName(payload)
  },
)

export const removeAccount = createBackgroundAsyncThunk(
  "account/removeAccount",
  async (
    payload: {
      addressOnNetwork: AddressOnNetwork
      signer: AccountSigner
      lastAddressInAccount: boolean
    },
    { extra: { main } },
  ) => {
    const { addressOnNetwork, signer, lastAddressInAccount } = payload
    const normalizedAddress = normalizeEVMAddress(addressOnNetwork.address)

    await main.removeAccount(normalizedAddress, signer, lastAddressInAccount)
  },
)
