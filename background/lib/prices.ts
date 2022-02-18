import { fetchJson } from "@ethersproject/web"
import logger from "./logger"
import {
  AnyAsset,
  CoinGeckoAsset,
  FiatCurrency,
  FungibleAsset,
  PricePoint,
  UnitPricePoint,
} from "../assets"

import { toFixedPoint } from "./fixed-point"
import { isValidCoinGeckoPriceResponse } from "./validate"

const COINGECKO_API_ROOT = "https://api.coingecko.com/api/v3"

export async function getPrice(
  coingeckoCoinId = "ethereum",
  currencySymbol = "usd"
): Promise<number | null> {
  const url = `${COINGECKO_API_ROOT}/simple/price?ids=${coingeckoCoinId}&vs_currencies=${currencySymbol}&include_last_updated_at=true`

  const json = await fetchJson(url)

  if (!isValidCoinGeckoPriceResponse(json)) {
    logger.warn(
      "CoinGecko price response didn't validate, did the API change?",
      json,
      isValidCoinGeckoPriceResponse.errors
    )

    return null
  }

  return json?.[coingeckoCoinId]?.[currencySymbol] || null
}

export async function getPrices(
  assets: (AnyAsset & CoinGeckoAsset)[],
  vsCurrencies: FiatCurrency[]
): Promise<PricePoint[]> {
  const coinIds = assets.map((a) => a.metadata.coinGeckoID).join(",")

  const currencySymbols = vsCurrencies
    .map((c) => c.symbol.toLowerCase())
    .join(",")

  const url = `${COINGECKO_API_ROOT}/simple/price?ids=${coinIds}&include_last_updated_at=true&vs_currencies=${currencySymbols}`

  const json = await fetchJson(url)
  // TODO fix loss of precision from json
  // TODO: TESTME

  if (!isValidCoinGeckoPriceResponse(json)) {
    logger.warn(
      "CoinGecko price response didn't validate, did the API change?",
      json,
      isValidCoinGeckoPriceResponse.errors
    )

    return []
  }

  const resolutionTime = Date.now()
  return assets.flatMap((asset) => {
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
}

/*
 * Get a list of Ethereum-based token prices from the CoinGecko API against a
 * fiat currency.
 *
 * Tokens are specified by an array of contract addresses. Prices are returned
 * as the "unit price" of each single token in the fiat currency.
 */
export async function getEthereumTokenPrices(
  tokenAddresses: string[],
  fiatCurrency: FiatCurrency
): Promise<{
  [contractAddress: string]: UnitPricePoint<FungibleAsset>
}> {
  const fiatSymbol = fiatCurrency.symbol

  // TODO cover failed schema validation and http & network errors
  const addys = tokenAddresses.join(",")
  const url = `${COINGECKO_API_ROOT}/simple/token_price/ethereum?vs_currencies=${fiatSymbol}&include_last_updated_at=true&contract_addresses=${addys}`

  const json = await fetchJson(url)

  const prices: {
    [index: string]: UnitPricePoint<FungibleAsset>
  } = {}
  // TODO Improve typing with Ajv validation.
  Object.entries(
    json as {
      [address: string]: { last_updated_at: number } & {
        [currencySymbol: string]: string
      }
    }
  ).forEach(([address, priceDetails]) => {
    // TODO parse this as a fixed decimal rather than a number. Will require
    // custom JSON deserialization
    const price: number = Number.parseFloat(
      priceDetails[fiatSymbol.toLowerCase()]
    )
    prices[address] = {
      unitPrice: {
        asset: fiatCurrency,
        amount: BigInt(Math.trunc(price * 10 ** fiatCurrency.decimals)),
      },
      time: priceDetails.last_updated_at,
    }
  })
  return prices
}
