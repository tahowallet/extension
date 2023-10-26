import { createSelector } from "@reduxjs/toolkit"
import { selectHideDust, selectShowUnverifiedAssets } from "../ui"
import { RootState } from ".."
import {
  AccountType,
  DEFAULT_ACCOUNT_NAMES,
  CompleteAssetAmount,
} from "../accounts"
import { AssetsState } from "../assets"
import {
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
  formatCurrencyAmount,
  heuristicDesiredDecimalsForUnitPrice,
  isNetworkBaseAsset,
  isSameAsset,
  isTrustedAsset,
} from "../utils/asset-utils"
import {
  AnyAsset,
  AnyAssetAmount,
  assetAmountToDesiredDecimals,
  convertAssetAmountViaPricePoint,
} from "../../assets"
import {
  selectCurrentAccount,
  selectCurrentNetwork,
  selectMainCurrencySymbol,
} from "./uiSelectors"
import {
  normalizeEVMAddress,
  sameEVMAddress,
  truncateAddress,
} from "../../lib/utils"
import { selectAccountSignersByAddress } from "./signingSelectors"
import {
  selectKeyringsByAddresses,
  selectSourcesByAddress,
} from "./internalSignerSelectors"
import { AccountBalance, AddressOnNetwork } from "../../accounts"
import { EVMNetwork, sameNetwork } from "../../networks"
import { NETWORK_BY_CHAIN_ID, TEST_NETWORK_BY_CHAIN_ID } from "../../constants"
import { DOGGO } from "../../constants/assets"
import { FeatureFlags, isEnabled } from "../../features"
import { AccountSigner, SignerType } from "../../services/signing"
import { SignerImportSource } from "../../services/internal-signer"
import { assertUnreachable } from "../../lib/utils/type-guards"
import { PricesState, selectAssetPricePoint } from "../prices"
import { TESTNET_TAHO } from "../../services/island"

// TODO What actual precision do we want here? Probably more than 2
// TODO decimals? Maybe it's configurable?
const desiredDecimals = {
  default: 2,
  greater: 6,
}

// List of assets by symbol that should be displayed with more decimal places
const EXCEPTION_ASSETS_BY_SYMBOL = ["BTC", "sBTC", "WBTC", "tBTC"].map(
  (symbol) => symbol.toUpperCase(),
)

// TODO Make this a setting.
export const userValueDustThreshold = 2

const shouldForciblyDisplayAsset = (
  assetAmount: CompleteAssetAmount<AnyAsset>,
) => {
  const isIslandRelated =
    (!isEnabled(FeatureFlags.HIDE_TOKEN_FEATURES) &&
      assetAmount.asset.symbol === DOGGO.symbol) ||
    isSameAsset(assetAmount.asset, TESTNET_TAHO)

  return isIslandRelated || isNetworkBaseAsset(assetAmount.asset)
}

export function determineAssetDisplayAndVerify(
  assetAmount: CompleteAssetAmount<AnyAsset>,
  {
    hideDust,
    showUnverifiedAssets,
  }: { hideDust: boolean; showUnverifiedAssets: boolean },
): { displayAsset: boolean; trustedAsset: boolean } {
  const isTrusted = isTrustedAsset(assetAmount.asset)

  if (shouldForciblyDisplayAsset(assetAmount)) {
    return { displayAsset: true, trustedAsset: isTrusted }
  }

  const isNotDust =
    typeof assetAmount.mainCurrencyAmount === "undefined"
      ? true
      : assetAmount.mainCurrencyAmount > userValueDustThreshold
  const isPresent = assetAmount.decimalAmount > 0
  const showDust = !hideDust

  const verificationStatusAllowsVisibility = showUnverifiedAssets || isTrusted
  const enoughBalanceToBeVisible = isPresent && (isNotDust || showDust)

  return {
    displayAsset:
      verificationStatusAllowsVisibility && enoughBalanceToBeVisible,
    trustedAsset: isTrusted,
  }
}

const computeCombinedAssetAmountsData = (
  assetAmounts: AnyAssetAmount<AnyAsset>[],
  assets: AssetsState,
  mainCurrencySymbol: string,
  hideDust: boolean,
  showUnverifiedAssets: boolean,
  prices: PricesState,
): {
  allAssetAmounts: CompleteAssetAmount[]
  combinedAssetAmounts: CompleteAssetAmount[]
  unverifiedAssetAmounts: CompleteAssetAmount[]
  totalMainCurrencyAmount: number | undefined
} => {
  // Derive account "assets"/assetAmount which include USD values using
  // data from the assets slice
  const allAssetAmounts = assetAmounts
    .map<CompleteAssetAmount>((assetAmount) => {
      const assetPricePoint = selectAssetPricePoint(
        prices,
        assetAmount.asset,
        mainCurrencySymbol,
      )

      const mainCurrencyEnrichedAssetAmount =
        enrichAssetAmountWithMainCurrencyValues(
          assetAmount,
          assetPricePoint,
          desiredDecimals.default,
        )

      const fullyEnrichedAssetAmount = enrichAssetAmountWithDecimalValues(
        mainCurrencyEnrichedAssetAmount,
        heuristicDesiredDecimalsForUnitPrice(
          EXCEPTION_ASSETS_BY_SYMBOL.includes(
            assetAmount.asset.symbol.toUpperCase(),
          )
            ? desiredDecimals.greater
            : desiredDecimals.default,
          mainCurrencyEnrichedAssetAmount.unitPrice,
        ),
      )

      return fullyEnrichedAssetAmount
    })
    .sort((asset1, asset2) => {
      // Always sort DOGGO above everything.
      if (asset1.asset.symbol === DOGGO.symbol) {
        return -1
      }
      if (asset2.asset.symbol === DOGGO.symbol) {
        return 1
      }

      const leftIsBaseAsset = isNetworkBaseAsset(asset1.asset)
      const rightIsBaseAsset = isNetworkBaseAsset(asset2.asset)

      // Always sort base assets above non-base assets. This also sorts the
      // current network base asset above the rest
      if (leftIsBaseAsset !== rightIsBaseAsset) {
        return leftIsBaseAsset ? -1 : 1
      }

      // If the assets are both base assets or neither is a base asset, compare
      // by main currency amount.
      if (
        asset1.mainCurrencyAmount !== undefined &&
        asset2.mainCurrencyAmount !== undefined
      ) {
        return asset2.mainCurrencyAmount - asset1.mainCurrencyAmount
      }

      if (asset1.mainCurrencyAmount === asset2.mainCurrencyAmount) {
        // If both assets are missing a main currency amount, compare symbols
        // lexicographically.
        return asset1.asset.symbol.localeCompare(asset2.asset.symbol)
      }

      // If only one asset has a main currency amount, it wins.
      return asset1.mainCurrencyAmount === undefined ? 1 : -1
    })

  const { combinedAssetAmounts, unverifiedAssetAmounts } =
    allAssetAmounts.reduce<{
      combinedAssetAmounts: CompleteAssetAmount[]
      unverifiedAssetAmounts: CompleteAssetAmount[]
    }>(
      (acc, assetAmount) => {
        const { displayAsset, trustedAsset } = determineAssetDisplayAndVerify(
          assetAmount,
          { hideDust, showUnverifiedAssets },
        )

        if (displayAsset) {
          if (trustedAsset) {
            acc.combinedAssetAmounts.push(assetAmount)
          } else {
            acc.unverifiedAssetAmounts.push(assetAmount)
          }
        }
        return acc
      },
      { combinedAssetAmounts: [], unverifiedAssetAmounts: [] },
    )

  // Keep a tally of the total user value; undefined if no main currency data
  // is available.
  let totalMainCurrencyAmount: number | undefined
  combinedAssetAmounts.forEach((assetAmount) => {
    if (typeof assetAmount.mainCurrencyAmount !== "undefined") {
      totalMainCurrencyAmount ??= 0 // initialize if needed
      totalMainCurrencyAmount += assetAmount.mainCurrencyAmount
    }
  })

  return {
    allAssetAmounts,
    combinedAssetAmounts,
    unverifiedAssetAmounts,
    totalMainCurrencyAmount,
  }
}

const getAccountState = (state: RootState) => state.account
const getCurrentAccountState = (state: RootState) => {
  const { address, network } = state.ui.selectedAccount
  return state.account.accountsData.evm[network.chainID]?.[
    normalizeEVMAddress(address)
  ]
}
export const getAssetsState = (state: RootState): AssetsState => state.assets
export const getPricesState = (state: RootState): PricesState => state.prices

export const selectAccountAndTimestampedActivities = createSelector(
  getAccountState,
  getAssetsState,
  getPricesState,
  selectHideDust,
  selectShowUnverifiedAssets,
  selectMainCurrencySymbol,
  (
    account,
    assets,
    prices,
    hideDust,
    showUnverifiedAssets,
    mainCurrencySymbol,
  ) => {
    const { combinedAssetAmounts, totalMainCurrencyAmount } =
      computeCombinedAssetAmountsData(
        account.combinedData.assets,
        assets,
        mainCurrencySymbol,
        hideDust,
        showUnverifiedAssets,
        prices,
      )

    return {
      combinedData: {
        assets: combinedAssetAmounts,
        totalMainCurrencyValue: totalMainCurrencyAmount
          ? formatCurrencyAmount(
              mainCurrencySymbol,
              totalMainCurrencyAmount,
              desiredDecimals.default,
            )
          : undefined,
      },
      accountData: account.accountsData,
    }
  },
)
export const selectCurrentAccountBalances = createSelector(
  getCurrentAccountState,
  getAssetsState,
  getPricesState,
  selectHideDust,
  selectShowUnverifiedAssets,
  selectMainCurrencySymbol,
  (
    currentAccount,
    assets,
    prices,
    hideDust,
    showUnverifiedAssets,
    mainCurrencySymbol,
  ) => {
    if (typeof currentAccount === "undefined" || currentAccount === "loading") {
      return undefined
    }

    const assetAmounts = Object.values(currentAccount.balances).map(
      (balance) => balance.assetAmount,
    )

    const {
      allAssetAmounts,
      combinedAssetAmounts,
      unverifiedAssetAmounts,
      totalMainCurrencyAmount,
    } = computeCombinedAssetAmountsData(
      assetAmounts,
      assets,
      mainCurrencySymbol,
      hideDust,
      showUnverifiedAssets,
      prices,
    )

    return {
      allAssetAmounts,
      assetAmounts: combinedAssetAmounts,
      unverifiedAssetAmounts,
      totalMainCurrencyValue: totalMainCurrencyAmount
        ? formatCurrencyAmount(
            mainCurrencySymbol,
            totalMainCurrencyAmount,
            desiredDecimals.default,
          )
        : undefined,
    }
  },
)

export type AccountTotal = AddressOnNetwork & {
  shortenedAddress: string
  accountType: AccountType
  signerId: string | null
  path: string | null
  accountSigner: AccountSigner
  name?: string
  avatarURL?: string
  localizedTotalMainCurrencyAmount?: string
}

/**
 * Given an account signer, resolves a unique id for that signer. Returns null
 * for read-only accounts. This allows for grouping accounts together by the
 * signer that can provide signatures for those accounts.
 */
function signerIdFor(accountSigner: AccountSigner): string | null {
  switch (accountSigner.type) {
    case "private-key":
      return "private-key"
    case "keyring":
      return accountSigner.keyringID
    case "ledger":
      return accountSigner.deviceID
    case "read-only":
      return null
    default:
      return assertUnreachable(accountSigner)
  }
}

export type CategorizedAccountTotals = { [key in AccountType]?: AccountTotal[] }

const signerTypeToAccountType: Record<SignerType, AccountType> = {
  keyring: AccountType.Imported,
  "private-key": AccountType.PrivateKey,
  ledger: AccountType.Ledger,
  "read-only": AccountType.ReadOnly,
}

const getAccountType = (
  address: string,
  signer: AccountSigner,
  addressSources: {
    [address: string]: SignerImportSource
  },
): AccountType => {
  switch (true) {
    case signerTypeToAccountType[signer.type] === AccountType.ReadOnly:
    case signerTypeToAccountType[signer.type] === AccountType.Ledger:
    case signerTypeToAccountType[signer.type] === AccountType.PrivateKey:
      return signerTypeToAccountType[signer.type]
    case addressSources[address] === SignerImportSource.import:
      return AccountType.Imported
    default:
      return AccountType.Internal
  }
}

const getTotalBalance = (
  accountBalances: { [assetSymbol: string]: AccountBalance },
  prices: PricesState,
  mainCurrencySymbol: string,
) =>
  Object.values(accountBalances)
    .map(({ assetAmount }) => {
      const assetPricePoint = selectAssetPricePoint(
        prices,
        assetAmount.asset,
        mainCurrencySymbol,
      )

      if (typeof assetPricePoint === "undefined") {
        return 0
      }

      const convertedAmount = convertAssetAmountViaPricePoint(
        assetAmount,
        assetPricePoint,
      )

      if (typeof convertedAmount === "undefined") {
        return 0
      }

      return assetAmountToDesiredDecimals(
        convertedAmount,
        desiredDecimals.default,
      )
    })
    .reduce((total, assetBalance) => total + assetBalance, 0)

function getNetworkAccountTotalsByCategory(
  state: RootState,
  network: EVMNetwork,
): CategorizedAccountTotals {
  const accounts = getAccountState(state)
  const prices = getPricesState(state)
  const accountSignersByAddress = selectAccountSignersByAddress(state)
  const keyringsByAddresses = selectKeyringsByAddresses(state)
  const sourcesByAddress = selectSourcesByAddress(state)
  const mainCurrencySymbol = selectMainCurrencySymbol(state)

  return Object.entries(accounts.accountsData.evm[network.chainID] ?? {})
    .filter(([, accountData]) => typeof accountData !== "undefined")
    .map(([address, accountData]): AccountTotal => {
      const shortenedAddress = truncateAddress(address)

      const accountSigner = accountSignersByAddress[address]
      const signerId = signerIdFor(accountSigner)
      const path = keyringsByAddresses[address]?.path

      const accountType = getAccountType(
        address,
        accountSigner,
        sourcesByAddress,
      )

      if (accountData === "loading") {
        return {
          address,
          network,
          shortenedAddress,
          accountType,
          signerId,
          path,
          accountSigner,
        }
      }

      return {
        address,
        network,
        shortenedAddress,
        accountType,
        signerId,
        path,
        accountSigner,
        name: accountData.ens.name ?? accountData.defaultName,
        avatarURL: accountData.ens.avatarURL ?? accountData.defaultAvatar,
        localizedTotalMainCurrencyAmount: formatCurrencyAmount(
          mainCurrencySymbol,
          getTotalBalance(accountData.balances, prices, mainCurrencySymbol),
          desiredDecimals.default,
        ),
      }
    })
    .reduce<CategorizedAccountTotals>(
      (seenTotalsByType, accountTotal) => ({
        ...seenTotalsByType,
        [accountTotal.accountType]: [
          ...(seenTotalsByType[accountTotal.accountType] ?? []),
          accountTotal,
        ],
      }),
      {},
    )
}

const selectNetworkAccountTotalsByCategoryResolver = createSelector(
  (state: RootState) => state,
  (state) => (network: EVMNetwork) =>
    getNetworkAccountTotalsByCategory(state, network),
)

export const selectCurrentNetworkAccountTotalsByCategory = createSelector(
  selectNetworkAccountTotalsByCategoryResolver,
  selectCurrentNetwork,
  (
    selectNetworkAccountTotalsByCategory,
    currentNetwork,
  ): CategorizedAccountTotals =>
    selectNetworkAccountTotalsByCategory(currentNetwork),
)

export const selectAccountTotals = createSelector(
  selectCurrentNetworkAccountTotalsByCategory,
  (selectNetworkAccountTotalsByCategory): AccountTotal[] =>
    Object.values(selectNetworkAccountTotalsByCategory).flat(),
)

export type AccountTotalList = {
  [address: string]: {
    ensName?: string
    shortenedAddress: string
    totals: {
      [chainID: string]: number
    }
  }
}
/** Get list of all accounts totals on all networks but without test networks */
export const selectAccountTotalsForOverview = createSelector(
  getAccountState,
  getAssetsState,
  getPricesState,
  selectMainCurrencySymbol,
  (accountsState, assetsState, pricesState, mainCurrencySymbol) => {
    const accountsTotal: AccountTotalList = {}

    Object.entries(accountsState.accountsData.evm)
      .filter(
        ([chainID, accounts]) =>
          typeof accounts !== "undefined" &&
          !TEST_NETWORK_BY_CHAIN_ID.has(chainID),
      )
      .forEach(([chainID, accounts]) =>
        Object.entries(accounts).forEach(([address, accountData]) => {
          if (accountData === "loading") return

          const normalizedAddress = normalizeEVMAddress(address)
          accountsTotal[normalizedAddress] ??= {
            ensName: accountData.ens.name,
            shortenedAddress: truncateAddress(address),
            totals: {},
          }

          accountsTotal[normalizedAddress].totals[chainID] = getTotalBalance(
            accountData.balances,
            pricesState,
            mainCurrencySymbol,
          )
        }),
      )

    return accountsTotal
  },
)

function findAccountTotal(
  categorizedAccountTotals: CategorizedAccountTotals,
  accountAddressOnNetwork: AddressOnNetwork,
): AccountTotal | undefined {
  return Object.values(categorizedAccountTotals)
    .flat()
    .find(
      ({ address, network }) =>
        sameEVMAddress(address, accountAddressOnNetwork.address) &&
        sameNetwork(network, accountAddressOnNetwork.network),
    )
}

export const getAccountTotal = (
  state: RootState,
  accountAddressOnNetwork: AddressOnNetwork,
): AccountTotal | undefined =>
  findAccountTotal(
    selectNetworkAccountTotalsByCategoryResolver(state)(
      accountAddressOnNetwork.network,
    ),
    accountAddressOnNetwork,
  )

export const getAccountNameOnChain = (
  state: RootState,
  accountAddressOnNetwork: AddressOnNetwork,
): string | undefined => {
  const account = getAccountTotal(state, accountAddressOnNetwork)

  return account?.name && !DEFAULT_ACCOUNT_NAMES.includes(account.name)
    ? account.name
    : undefined
}

export const selectCurrentAccountTotal = createSelector(
  selectCurrentNetworkAccountTotalsByCategory,
  selectCurrentAccount,
  (categorizedAccountTotals, currentAccount): AccountTotal | undefined =>
    findAccountTotal(categorizedAccountTotals, currentAccount),
)

export const getAllAddresses = createSelector(getAccountState, (account) =>
  // On extension install we are using this selector to display onboarding screen,
  // sometimes frontend is loading faster than background script and we need to
  // prepare for redux slices to be undefined for a split second
  account
    ? [
        ...new Set(
          Object.values(account.accountsData.evm).flatMap((chainAddresses) =>
            Object.keys(chainAddresses),
          ),
        ),
      ]
    : [],
)

export const getAddressCount = createSelector(
  getAllAddresses,
  (allAddresses) => allAddresses.length,
)

export const getAllNetworks = createSelector(getAccountState, (account) =>
  Object.keys(account.accountsData.evm).map(
    (chainID) => NETWORK_BY_CHAIN_ID[chainID],
  ),
)

export const getNetworkCountForOverview = createSelector(
  getAccountState,
  (account) =>
    Object.keys(account.accountsData.evm).filter(
      (chainID) => !TEST_NETWORK_BY_CHAIN_ID.has(chainID),
    ).length,
)

export const getTotalBalanceForOverview = createSelector(
  selectAccountTotalsForOverview,
  selectMainCurrencySymbol,
  (accountsTotal, currencySymbol) =>
    formatCurrencyAmount(
      currencySymbol,
      Object.values(accountsTotal).reduce(
        (total, { totals }) =>
          Object.values(totals).reduce((sum, balance) => sum + balance) + total,
        0,
      ),
      2,
    ),
)
