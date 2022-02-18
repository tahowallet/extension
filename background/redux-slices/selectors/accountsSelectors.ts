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
import { SigningMethod } from "../signing"

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
      const isNotDust =
        typeof assetAmount.mainCurrencyAmount === "undefined"
          ? true
          : assetAmount.mainCurrencyAmount > userValueDustThreshold
      // TODO Update below to be network responsive
      const isPresent =
        assetAmount.decimalAmount > 0 || assetAmount.asset.symbol === "ETH"

      // Hide dust and missing amounts.
      return hideDust ? isNotDust && isPresent : isPresent
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

export const selectAccountTotalsByCategory = createSelector(
  getAccountState,
  getAssetsState,
  selectAddressSigningMethods,
  selectMainCurrencySymbol,
  (
    accounts,
    assets,
    signingAccounts,
    mainCurrencySymbol
  ): CategorizedAccountTotals => {
    // TODO: here
    return Object.entries(accounts.accountsData)
      .map(([address, accountData]): AccountTotal => {
        const shortenedAddress = truncateAddress(address)

        const signingMethod = signingAccounts[address] ?? null

        const accountType =
          signingMethod === null
            ? AccountType.ReadOnly
            : signingMethodTypeToAccountType[signingMethod.type]

        if (accountData === "loading") {
          return {
            address,
            shortenedAddress,
            accountType,
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
