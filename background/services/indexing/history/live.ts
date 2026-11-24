import { FIAT_CURRENCIES_SYMBOL } from "../../../constants/currencies"
import type { PricePoint } from "../../../assets"
import { isFungibleAsset, isSmartContractFungibleAsset } from "../../../assets"
import {
  getFullAssetID,
  isNetworkBaseAsset,
} from "../../../redux-slices/utils/asset-utils"
import type { PriceMeasurement } from "./records"

/**
 * The smallest time read as milliseconds rather than seconds. As
 * milliseconds, it falls in March 1973, and as seconds, in the year 5138. No
 * price predates the former or postdates the latter, so a time below it can
 * only be in seconds.
 */
const SMALLEST_MILLISECOND_TIME = 1e11

/**
 * Returns a UNIX time in milliseconds, given one in either seconds or
 * milliseconds.
 *
 * Price points are typed as `UNIXTime`, which is documented as seconds, but
 * the wallet's price sources stamp them with `Date.now()`, in milliseconds.
 * Note that treating such a time as seconds multiplies it by a thousand,
 * dating a price recorded in late 2026 to around the year 58800. Telling the
 * two units apart by size keeps history right whichever one a source uses.
 *
 * @param time A UNIX time in seconds or milliseconds.
 */
export function millisecondsOf(time: number): number {
  return time < SMALLEST_MILLISECOND_TIME ? time * 1000 : time
}

/**
 * Returns the live price measurement for a price point between an asset and a
 * fiat currency, or `undefined` if the point doesn't price a fungible asset
 * in fiat or its amounts don't make a price.
 *
 * For example, a point pricing 1 ETH at 2,948 USD becomes a measurement for
 * ETH's full asset id with a value of 2948, timed in milliseconds.
 *
 * @param pricePoint The price point, as the wallet's price sources emit it.
 */
export function livePriceMeasurement(
  pricePoint: PricePoint,
): PriceMeasurement | undefined {
  const fiatIndex = pricePoint.pair.findIndex(({ symbol }) =>
    FIAT_CURRENCIES_SYMBOL.includes(symbol),
  )
  if (fiatIndex === -1) return undefined
  const fiat = pricePoint.pair[fiatIndex]
  const asset = pricePoint.pair[1 - fiatIndex]
  if (
    !(isNetworkBaseAsset(asset) || isSmartContractFungibleAsset(asset)) ||
    !isFungibleAsset(fiat)
  ) {
    return undefined
  }
  const assetUnits =
    Number(pricePoint.amounts[1 - fiatIndex]) / 10 ** asset.decimals
  const fiatUnits = Number(pricePoint.amounts[fiatIndex]) / 10 ** fiat.decimals
  if (!(assetUnits > 0) || !Number.isFinite(fiatUnits)) return undefined

  return {
    assetID: getFullAssetID(asset),
    symbol: asset.symbol,
    time: millisecondsOf(pricePoint.time),
    value: fiatUnits / assetUnits,
    origin: "live",
  }
}
