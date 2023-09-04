import { fetchJson } from "@ethersproject/web"
import logger from "./logger"
import {
  AnyAsset,
  CoinGeckoAsset,
  FiatCurrency,
  FungibleAsset,
  PricePoint,
  SmartContractFungibleAsset,
  UnitPricePoint,
} from "../assets"

import { toFixedPoint } from "./fixed-point"
import { isValidCoinGeckoPriceResponse } from "./validate"
import { EVMNetwork } from "../networks"
import { USD } from "../constants"

const COINGECKO_API_ROOT = "https://api.coingecko.com/api/v3"

// @TODO Test Me
export async function getPrices(
  assets: AnyAsset[],
  vsCurrencies: FiatCurrency[],
): Promise<PricePoint[]> {
  const queryableAssets = assets.filter(
    (asset): asset is AnyAsset & Required<CoinGeckoAsset> =>
      "metadata" in asset &&
      !!asset.metadata &&
      "coinGeckoID" in asset.metadata,
  )

  if (queryableAssets.length === 0) {
    return []
  }

  const coinIds = [
    ...new Set([...queryableAssets.map((asset) => asset.metadata.coinGeckoID)]),
  ].join(",")

  const currencySymbols = vsCurrencies
    .map((c) => c.symbol.toLowerCase())
    .join(",")

  const url = `${COINGECKO_API_ROOT}/simple/price?ids=${coinIds}&include_last_updated_at=true&vs_currencies=${currencySymbols}`

  try {
    const json = await fetchJson({
      url,
      // Prevent throttling
      throttleCallback: async () => false,
    })
    // TODO fix loss of precision from json
    // TODO: TESTME

    if (!isValidCoinGeckoPriceResponse(json)) {
      logger.warn(
        "CoinGecko price response didn't validate, did the API change?",
        json,
        isValidCoinGeckoPriceResponse.errors,
      )

      return []
    }

    const resolutionTime = Date.now()
    return queryableAssets.flatMap((asset) => {
      const simpleCoinPrices = json[asset.metadata.coinGeckoID]

      return vsCurrencies
        .map<PricePoint | undefined>((currency) => {
          const symbol = currency.symbol.toLowerCase()
          const coinPrice = simpleCoinPrices?.[symbol]

          if (coinPrice) {
            // Scale amounts to the asset's decimals; if the asset is not fungible,
            // assume 0 decimals, i.e. that this is a unit price.
            const assetPrecision = "decimals" in asset ? asset.decimals : 0

            return {
              pair: [currency, asset],
              amounts: [
                toFixedPoint(coinPrice, currency.decimals),
                10n ** BigInt(assetPrecision),
              ],
              time: resolutionTime,
            }
          }
          return undefined
        })
        .filter((p): p is PricePoint => p !== undefined)
    })
  } catch (e) {
    logger.warn("Coingecko price API throw an error: ", e)
    return []
  }
}

/*
 * Get a list of Ethereum-based token prices from the CoinGecko API against a
 * fiat currency.
 *
 * Tokens are specified by an array of contract addresses. Prices are returned
 * as the "unit price" of each single token in the fiat currency.
 */
export async function getTokenPrices(
  tokenAddresses: string[],
  fiatCurrency: FiatCurrency,
  network: EVMNetwork,
): Promise<{
  [contractAddress: string]: UnitPricePoint<FungibleAsset>
}> {
  if (tokenAddresses.length < 1) {
    return {}
  }

  const fiatSymbol = fiatCurrency.symbol

  const prices: {
    [index: string]: UnitPricePoint<FungibleAsset>
  } = {}

  // TODO cover failed schema validation
  const addys = tokenAddresses.join(",")
  const url = `${COINGECKO_API_ROOT}/simple/token_price/${network.coingeckoPlatformID}?vs_currencies=${fiatSymbol}&include_last_updated_at=true&contract_addresses=${addys}`

  try {
    const json = await fetchJson({
      url,
      // Prevent throttling
      throttleCallback: async () => false,
    })

    // TODO Improve typing with Ajv validation.
    Object.entries(
      json as {
        [address: string]: { last_updated_at: number } & {
          [currencySymbol: string]: string
        }
      },
    ).forEach(([address, priceDetails]) => {
      // TODO parse this as a fixed decimal rather than a number. Will require
      // custom JSON deserialization
      const price: number = Number.parseFloat(
        priceDetails[fiatSymbol.toLowerCase()],
      )
      if (!Number.isNaN(price)) {
        prices[address] = {
          unitPrice: {
            asset: fiatCurrency,
            amount: BigInt(Math.trunc(price * 10 ** fiatCurrency.decimals)),
          },
          time: priceDetails.last_updated_at,
        }
      } else {
        logger.warn(
          "Price for Ethereum token from CoinGecko cannot be parsed.",
          address,
          priceDetails,
        )
      }
    })
  } catch (err) {
    logger.error(
      "Error fetching price for tokens on network.",
      tokenAddresses,
      network,
      err,
    )
  }
  return prices
}

/*
 * Get a Price Point for asset to USD.
 */
export function getPricePoint(
  asset: SmartContractFungibleAsset | FungibleAsset,
  unitPricePoint: UnitPricePoint<FungibleAsset>,
): PricePoint {
  return {
    pair: [asset, USD],
    amounts: [
      1n * 10n ** BigInt(asset.decimals),
      BigInt(
        Math.trunc(
          (Number(unitPricePoint.unitPrice.amount) /
            10 ** (unitPricePoint.unitPrice.asset as FungibleAsset).decimals) *
            10 ** USD.decimals,
        ),
      ),
    ],
    time: unitPricePoint.time,
  }
}
