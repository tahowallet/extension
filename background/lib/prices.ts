import { fetchJson } from "@ethersproject/web"
import logger from "./logger"
import {
  CoinGeckoAsset,
  FiatCurrency,
  PricePoint,
  UnitPricePoint,
} from "../types"
import { getSimplePriceValidator } from "./validation"

const COINGECKO_API_ROOT = "https://api.coingecko.com/api/v3"

export async function getPrice(
  coingeckoCoinId = "ethereum",
  currencySymbol = "usd"
): Promise<number> {
  const url = `${COINGECKO_API_ROOT}/simple/price?ids=${coingeckoCoinId}&vs_currencies=${currencySymbol}&include_last_updated_at=true`

  const json = await fetchJson(url)
  const validate = getSimplePriceValidator()

  if (!validate(json)) {
    logger.warn(
      "CoinGecko price response didn't validate, did the API change?",
      json,
      validate.errors
    )

    return null
  }

  return json ? parseFloat(json[coingeckoCoinId][currencySymbol]) : null
}

function multiplyByFloat(n: bigint, f: number, precision: number) {
  return (
    (n * BigInt(Math.floor(f * 10 ** precision))) /
    BigInt(10) ** BigInt(precision)
  )
}

export async function getPrices(
  assets: CoinGeckoAsset[],
  vsCurrencies: FiatCurrency[]
): Promise<PricePoint[]> {
  const coinIds = assets.map((a) => a.metadata.coinGeckoId).join(",")

  const currencySymbols = vsCurrencies
    .map((c) => c.symbol.toLowerCase())
    .join(",")

  const url = `${COINGECKO_API_ROOT}/simple/price?ids=${coinIds}&include_last_updated_at=true&vs_currencies=${currencySymbols}`

  const json = await fetchJson(url)
  // TODO fix loss of precision from json
  // TODO: TESTME
  const validate = getSimplePriceValidator()

  if (!validate(json)) {
    logger.warn(
      "CoinGecko price response didn't validate, did the API change?",
      json,
      validate.errors
    )

    return null
  }

  return assets.reduce((acc, asset) => {
    const simpleCoinPrices = json[asset.metadata.coinGeckoId]
    return acc.concat(
      vsCurrencies
        .map((c) => {
          const symbol = c.symbol.toLowerCase()
          if (symbol in simpleCoinPrices) {
            return {
              pair: [c, asset],
              amounts: [
                multiplyByFloat(
                  BigInt(10) ** BigInt(c.decimals),
                  parseFloat(simpleCoinPrices[symbol]),
                  8
                ),
                BigInt(1),
              ],
              time: Date.now(),
            } as PricePoint
          }
          return undefined
        })
        .filter((p) => p)
    )
  }, [])
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
  currencySymbol: string
): Promise<{ [contractAddress: string]: UnitPricePoint }> {
  // TODO cover failed schema validation and http & network errors
  const addys = tokenAddresses.join(",")
  const url = `${COINGECKO_API_ROOT}/simple/token_price/ethereum?vs_currencies=${currencySymbol}&include_last_updated_at=true&contract_addresses=${addys}`

  const json = await fetchJson(url)

  const prices: {
    [index: string]: UnitPricePoint
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
      priceDetails[currencySymbol.toLowerCase()]
    )
    // TODO fiat currency data lookups
    const fiatDecimals = 10 // SHIB only needs 8, we're going all out
    prices[address] = {
      unitPrice: {
        asset: {
          name: currencySymbol,
          symbol: currencySymbol.toUpperCase(),
          decimals: fiatDecimals,
        },
        amount: BigInt(price * 10 ** fiatDecimals),
      },
      time: priceDetails.last_updated_at,
    }
  })
  return prices
}
