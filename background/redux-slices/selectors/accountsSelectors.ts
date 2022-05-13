import { createSelector } from "@reduxjs/toolkit"
import { selectHideDust } from "../ui"
import { RootState } from ".."
import { AccountType, CompleteAssetAmount } from "../accounts"
import { AssetsState, selectAssetPricePoint } from "../assets"
import {
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
  formatCurrencyAmount,
  heuristicDesiredDecimalsForUnitPrice,
} from "../utils/asset-utils"
import {
  AnyAsset,
  AnyAssetAmount,
  assetAmountToDesiredDecimals,
  convertAssetAmountViaPricePoint,
} from "../../assets"
import { selectCurrentAccount, selectMainCurrencySymbol } from "./uiSelectors"
import { truncateAddress } from "../../lib/utils"
import { selectAddressSigningMethods } from "./signingSelectors"
import { SigningMethod } from "../../utils/signing"
import {
  selectKeyringsByAddresses,
  selectSourcesByAddress,
} from "./keyringsSelectors"
import { BASE_ASSETS_BY_SYMBOL } from "../../constants"
import { DOGGO } from "../../constants/assets"
import { HIDE_TOKEN_FEATURES } from "../../features"

// TODO What actual precision do we want here? Probably more than 2
// TODO decimals? Maybe it's configurable?
const desiredDecimals = 2
// TODO Make this a setting.
const userValueDustThreshold = 2

const computeCombinedAssetAmountsData = (
  assetAmounts: AnyAssetAmount<AnyAsset>[],
  assets: AssetsState,
  mainCurrencySymbol: string,
  hideDust: boolean
): {
  combinedAssetAmounts: CompleteAssetAmount[]
  totalMainCurrencyAmount: number | undefined
} => {
  // Keep a tally of the total user value; undefined if no main currency data
  // is available.
  let totalMainCurrencyAmount: number | undefined

  // Derive account "assets"/assetAmount which include USD values using
  // data from the assets slice
  const combinedAssetAmounts = assetAmounts
    .map<CompleteAssetAmount>((assetAmount) => {
      const assetPricePoint = selectAssetPricePoint(
        assets,
        assetAmount.asset.symbol,
        mainCurrencySymbol
      )

      const mainCurrencyEnrichedAssetAmount =
        enrichAssetAmountWithMainCurrencyValues(
          assetAmount,
          assetPricePoint,
          desiredDecimals
        )

      const fullyEnrichedAssetAmount = enrichAssetAmountWithDecimalValues(
        mainCurrencyEnrichedAssetAmount,
        heuristicDesiredDecimalsForUnitPrice(
          desiredDecimals,
          mainCurrencyEnrichedAssetAmount.unitPrice
        )
      )

      if (typeof fullyEnrichedAssetAmount.mainCurrencyAmount !== "undefined") {
        totalMainCurrencyAmount ??= 0 // initialize if needed
        totalMainCurrencyAmount += fullyEnrichedAssetAmount.mainCurrencyAmount
      }

      return fullyEnrichedAssetAmount
    })
    .filter((assetAmount) => {
      const isForciblyDisplayed =
        (!HIDE_TOKEN_FEATURES && assetAmount.asset.symbol === DOGGO.symbol) ||
        // TODO Update filter to let through only the base asset of the current
        // TODO network.
        BASE_ASSETS_BY_SYMBOL[assetAmount.asset.symbol] !== undefined
      const isNotDust =
        typeof assetAmount.mainCurrencyAmount === "undefined"
          ? true
          : assetAmount.mainCurrencyAmount > userValueDustThreshold
      const isPresent = assetAmount.decimalAmount > 0

      // Hide dust and missing amounts.
      return (
        isForciblyDisplayed || (hideDust ? isNotDust && isPresent : isPresent)
      )
    })
    .sort((asset1, asset2) => {
      // Always sort DOGGO above everything.
      if (asset1.asset.symbol === DOGGO.symbol) {
        return -1
      }
      if (asset2.asset.symbol === DOGGO.symbol) {
        return 1
      }

      const leftIsBaseAsset = asset1.asset.symbol in BASE_ASSETS_BY_SYMBOL
      const rightIsBaseAsset = asset2.asset.symbol in BASE_ASSETS_BY_SYMBOL

      // Always sort base assets above non-base assets.
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

  return { combinedAssetAmounts, totalMainCurrencyAmount }
}

const getAccountState = (state: RootState) => state.account
const getCurrentAccountState = (state: RootState) => {
  return state.account.accountsData[state.ui.selectedAccount.address]
}
export const getAssetsState = (state: RootState): AssetsState => state.assets

export const selectAccountAndTimestampedActivities = createSelector(
  getAccountState,
  getAssetsState,
  selectHideDust,
  selectMainCurrencySymbol,
  (account, assets, hideDust, mainCurrencySymbol) => {
    const { combinedAssetAmounts, totalMainCurrencyAmount } =
      computeCombinedAssetAmountsData(
        account.combinedData.assets,
        assets,
        mainCurrencySymbol,
        hideDust
      )

    return {
      combinedData: {
        assets: combinedAssetAmounts,
        totalMainCurrencyValue: totalMainCurrencyAmount
          ? formatCurrencyAmount(
              mainCurrencySymbol,
              totalMainCurrencyAmount,
              desiredDecimals
            )
          : undefined,
      },
      accountData: account.accountsData,
    }
  }
)

export const selectMainCurrencyPricePoint = createSelector(
  getAssetsState,
  (state) => selectMainCurrencySymbol(state),
  (assets, mainCurrencySymbol) => {
    // TODO Support multi-network base assets.
    return selectAssetPricePoint(assets, "ETH", mainCurrencySymbol)
  }
)

export const selectCurrentAccountBalances = createSelector(
  getCurrentAccountState,
  getAssetsState,
  selectHideDust,
  selectMainCurrencySymbol,
  (currentAccount, assets, hideDust, mainCurrencySymbol) => {
    if (typeof currentAccount === "undefined" || currentAccount === "loading") {
      return undefined
    }

    const assetAmounts = Object.values(currentAccount.balances).map(
      (balance) => balance.assetAmount
    )

    const { combinedAssetAmounts, totalMainCurrencyAmount } =
      computeCombinedAssetAmountsData(
        assetAmounts,
        assets,
        mainCurrencySymbol,
        hideDust
      )

    return {
      assetAmounts: combinedAssetAmounts,
      totalMainCurrencyValue: totalMainCurrencyAmount
        ? formatCurrencyAmount(
            mainCurrencySymbol,
            totalMainCurrencyAmount,
            desiredDecimals
          )
        : undefined,
    }
  }
)

export type AccountTotal = {
  address: string
  shortenedAddress: string
  accountType: AccountType
  keyringId: string | null
  signingMethod: SigningMethod | null
  name?: string
  avatarURL?: string
  localizedTotalMainCurrencyAmount?: string
}

export type CategorizedAccountTotals = { [key in AccountType]?: AccountTotal[] }

const signingMethodTypeToAccountType: Record<
  SigningMethod["type"],
  AccountType
> = {
  keyring: AccountType.Imported,
  ledger: AccountType.Ledger,
}

const getAccountType = (
  address: string,
  signingMethod: SigningMethod,
  addressSources: {
    [address: string]: "import" | "internal"
  }
): AccountType => {
  if (signingMethod == null) {
    return AccountType.ReadOnly
  }
  if (signingMethodTypeToAccountType[signingMethod.type] === "ledger") {
    return AccountType.Ledger
  }
  if (addressSources[address] === "import") {
    return AccountType.Imported
  }
  return AccountType.Internal
}

export const selectAccountTotalsByCategory = createSelector(
  getAccountState,
  getAssetsState,
  selectAddressSigningMethods,
  selectKeyringsByAddresses,
  selectSourcesByAddress,
  selectMainCurrencySymbol,
  (
    accounts,
    assets,
    signingAccounts,
    keyringsByAddresses,
    sourcesByAddress,
    mainCurrencySymbol
  ): CategorizedAccountTotals => {
    // TODO: here

    return Object.entries(accounts.accountsData)
      .map(([address, accountData]): AccountTotal => {
        const shortenedAddress = truncateAddress(address)

        const signingMethod = signingAccounts[address] ?? null
        const keyringId = keyringsByAddresses[address]?.id

        const accountType = getAccountType(
          address,
          signingMethod,
          sourcesByAddress
        )

        if (accountData === "loading") {
          return {
            address,
            shortenedAddress,
            accountType,
            keyringId,
            signingMethod,
          }
        }

        const totalMainCurrencyAmount = Object.values(accountData.balances)
          .map(({ assetAmount }) => {
            const assetPricePoint = selectAssetPricePoint(
              assets,
              assetAmount.asset.symbol,
              mainCurrencySymbol
            )

            if (typeof assetPricePoint === "undefined") {
              return 0
            }

            const convertedAmount = convertAssetAmountViaPricePoint(
              assetAmount,
              assetPricePoint
            )

            if (typeof convertedAmount === "undefined") {
              return 0
            }

            return assetAmountToDesiredDecimals(
              convertedAmount,
              desiredDecimals
            )
          })
          .reduce((total, assetBalance) => total + assetBalance, 0)

        return {
          address,
          shortenedAddress,
          accountType,
          keyringId,
          signingMethod,
          name: accountData.ens.name ?? accountData.defaultName,
          avatarURL: accountData.ens.avatarURL ?? accountData.defaultAvatar,
          localizedTotalMainCurrencyAmount: formatCurrencyAmount(
            mainCurrencySymbol,
            totalMainCurrencyAmount,
            desiredDecimals
          ),
        }
      })
      .reduce<CategorizedAccountTotals>((acc, accountTotal) => {
        acc[accountTotal.accountType] ??= []
        // Non-nullness guaranteed by the above ??=.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        acc[accountTotal.accountType]!.push(accountTotal)
        return acc
      }, {})
  }
)

function findAccountTotal(
  categorizedAccountTotals: CategorizedAccountTotals,
  accountAddress: string
): AccountTotal | undefined {
  return Object.values(categorizedAccountTotals)
    .flat()
    .find(
      ({ address }) => address.toLowerCase() === accountAddress.toLowerCase()
    )
}

export const getAccountTotal = (
  state: RootState,
  accountAddress: string
): AccountTotal | undefined =>
  findAccountTotal(selectAccountTotalsByCategory(state), accountAddress)

export const selectCurrentAccountTotal = createSelector(
  selectAccountTotalsByCategory,
  selectCurrentAccount,
  (categorizedAccountTotals, currentAccount): AccountTotal | undefined =>
    findAccountTotal(categorizedAccountTotals, currentAccount.address)
)
