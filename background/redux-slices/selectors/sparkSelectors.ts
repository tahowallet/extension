import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from ".."
import type { SparkAccount, SparkBalance } from "../../services/spark/types"
import { selectAssetPricePoint } from "../prices"
import { selectMainCurrencySymbol } from "./uiSelectors"
import { SPARK_BTC } from "../../constants/spark"

const selectSparkState = (state: RootState) => state.spark

export const selectSparkAccounts = createSelector(
  selectSparkState,
  (spark): SparkAccount[] =>
    Object.values(spark.accounts).sort((a, b) => a.addedAt - b.addedAt),
)

export const selectSparkAccount = createSelector(
  [selectSparkState, (_: RootState, accountID: string) => accountID],
  (spark, accountID): SparkAccount | undefined => spark.accounts[accountID],
)

export const selectSparkBalance = createSelector(
  [selectSparkState, (_: RootState, accountID: string) => accountID],
  (spark, accountID): SparkBalance | undefined => spark.balances[accountID],
)

export const selectSparkActivity = createSelector(
  [selectSparkState, (_: RootState, accountID: string) => accountID],
  (spark, accountID) => spark.activity[accountID] ?? [],
)

export const selectSparkWalletStatus = createSelector(
  [selectSparkState, (_: RootState, accountID: string) => accountID],
  (spark, accountID) => spark.walletStatus[accountID],
)

/**
 * The main-currency (e.g. USD) price of one bitcoin, if Taho has one.
 */
export const selectBitcoinMainCurrencyPrice = createSelector(
  [(state: RootState) => state.prices, selectMainCurrencySymbol],
  (prices, mainCurrencySymbol): number | undefined => {
    const pricePoint = selectAssetPricePoint(
      prices,
      SPARK_BTC,
      mainCurrencySymbol,
    )
    if (!pricePoint) {
      return undefined
    }
    const [btcAmount, fiatAmount] = pricePoint.amounts
    const [btcAsset, fiatAsset] = pricePoint.pair
    // Amounts are fixed-point in each asset's own decimals; the BTC side may
    // come from another network's bitcoin asset with different decimals.
    const btcDecimals = "decimals" in btcAsset ? btcAsset.decimals : 0
    const fiatDecimals = "decimals" in fiatAsset ? fiatAsset.decimals : 0
    return (
      Number(fiatAmount) /
      10 ** fiatDecimals /
      (Number(btcAmount) / 10 ** btcDecimals)
    )
  },
)

/**
 * Total main-currency value of every mainnet Spark account's bitcoin, for
 * folding into portfolio totals. Regtest balances have no value.
 */
export const selectSparkMainCurrencyTotal = createSelector(
  [selectSparkAccounts, selectSparkState, selectBitcoinMainCurrencyPrice],
  (accounts, spark, btcPrice): number | undefined => {
    if (btcPrice === undefined) {
      return undefined
    }
    return accounts
      .filter((account) => account.network.sparkNetworkType === "MAINNET")
      .reduce((total, account) => {
        const owned = spark.balances[account.id]?.owned ?? 0n
        return total + (Number(owned) / 1e8) * btcPrice
      }, 0)
  },
)
