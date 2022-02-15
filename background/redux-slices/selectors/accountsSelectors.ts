import { createSelector } from "@reduxjs/toolkit"
import { selectHideDust } from "../ui"
import { RootState } from ".."
import { AccountType, CompleteAssetAmount } from "../accounts"
import { AssetsState, selectAssetPricePoint } from "../assets"
import {
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
  formatCurrencyAmount,
} from "../utils/asset-utils"
import {
  AnyAsset,
  AnyAssetAmount,
  assetAmountToDesiredDecimals,
  convertAssetAmountViaPricePoint,
} from "../../assets"
import { selectCurrentAccount } from "./uiSelectors"
import { truncateAddress } from "../../lib/utils"
import { selectAddressSigningMethods } from "./signingSelectors"
import { SigningMethod } from "../signing"
import { selectAddressSources } from "./keyringsSelectors"

// TODO What actual precision do we want here? Probably more than 2
// TODO decimals? Maybe it's configurable?
const desiredDecimals = 2
// TODO Make this a setting.
const mainCurrencySymbol = "USD"
// TODO Make this a setting.
const userValueDustThreshold = 2

const computeCombinedAssetAmountsData = (
  assetAmounts: AnyAssetAmount<AnyAsset>[],
  assets: AssetsState,
  hideDust: boolean
): {
  combinedAssetAmounts: CompleteAssetAmount<
    AnyAsset,
    AnyAssetAmount<AnyAsset>
  >[]
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

      if (assetPricePoint) {
        const mainCurrencyEnrichedAssetAmount =
          enrichAssetAmountWithMainCurrencyValues(
            assetAmount,
            assetPricePoint,
            desiredDecimals
          )

        // Heuristically add decimal places to high-unit-price assets, `
        // 1 decimal place per order of magnitude in the unit price; e.g.
        // if USD is the main currency and the asset unit price is $100,
        // 2 decimal points, $1000, 3 decimal points, $10000, 4 decimal
        // points, etc. `desiredDecimals` is treated as the minimum, and
        // order of magnitude is rounded up (e.g. $2000 = >3 orders of
        // magnitude, so 4 decimal points).
        const decimalValuePlaces = Math.max(
          // Using ?? 0, safely handle cases where no main currency is
          // available.
          Math.ceil(Math.log10(mainCurrencyEnrichedAssetAmount.unitPrice ?? 0)),
          desiredDecimals
        )

        const fullyEnrichedAssetAmount = enrichAssetAmountWithDecimalValues(
          mainCurrencyEnrichedAssetAmount,
          decimalValuePlaces
        )

        if (
          typeof fullyEnrichedAssetAmount.mainCurrencyAmount !== "undefined"
        ) {
          totalMainCurrencyAmount ??= 0 // initialize if needed
          totalMainCurrencyAmount += fullyEnrichedAssetAmount.mainCurrencyAmount
        }

        return fullyEnrichedAssetAmount
      }

      return enrichAssetAmountWithDecimalValues(assetAmount, desiredDecimals)
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
  (account, assets, hideDust) => {
    const { combinedAssetAmounts, totalMainCurrencyAmount } =
      computeCombinedAssetAmountsData(
        account.combinedData.assets,
        assets,
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
  (assets) => {
    // TODO Support multi-network base assets.
    return selectAssetPricePoint(assets, "ETH", mainCurrencySymbol)
  }
)

export const selectCurrentAccountBalances = createSelector(
  getCurrentAccountState,
  getAssetsState,
  selectHideDust,
  (currentAccount, assets, hideDust) => {
    if (typeof currentAccount === "undefined" || currentAccount === "loading") {
      return undefined
    }

    const assetAmounts = Object.values(currentAccount.balances).map(
      (balance) => balance.assetAmount
    )

    const { combinedAssetAmounts, totalMainCurrencyAmount } =
      computeCombinedAssetAmountsData(assetAmounts, assets, hideDust)

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

const getAccountType = (
  address: string,
  signingMethod: SigningMethod,
  addressSources: {
    [address: string]: "import" | "newSeed"
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
  return AccountType.NewSeed
}

export const selectAccountTotalsByCategory = createSelector(
  getAccountState,
  getAssetsState,
  selectAddressSigningMethods,
  selectAddressSources,
  (
    accounts,
    assets,
    signingAccounts,
    addressSources
  ): CategorizedAccountTotals => {
    // TODO: here
    return Object.entries(accounts.accountsData)
      .map(([address, accountData]): AccountTotal => {
        const shortenedAddress = truncateAddress(address)

        const signingMethod = signingAccounts[address] ?? null

        const accountType = getAccountType(
          address,
          signingMethod,
          addressSources
        )

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
