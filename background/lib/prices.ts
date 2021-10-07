import Ajv, { JTDDataType } from "ajv/dist/jtd"
import { fetchJson } from "@ethersproject/web"
import {
  CoinGeckoAsset,
  FiatCurrency,
  PricePoint,
  UnitPricePoint,
} from "../types"

const ajv = new Ajv()

const COINGECKO_API_ROOT = "https://api.coingecko.com/api/v3"

// See RFC 8927 or jsontypedef.com to learn more about JTD.
const coinGeckoPriceJTD = {
  values: {
    properties: {
      usd: { type: "float64" },
      last_updated_at: { type: "uint32" },
    },
  },
} as const

type CoingGeckoPriceResponse = JTDDataType<typeof coinGeckoPriceJTD>
const isValidCoinGeckoPriceResponse =
  ajv.compile<CoingGeckoPriceResponse>(coinGeckoPriceJTD)

export async function getPrice(
  coingeckoCoinId = "ethereum",
  currencySymbol = "usd"
): Promise<number> {
  const url = `${COINGECKO_API_ROOT}/simple/price?ids=${coingeckoCoinId}&vs_currencies=${currencySymbol}&include_last_updated_at=true`

  const json = await fetchJson(url)

  if (!isValidCoinGeckoPriceResponse(json)) {
    console.warn(
      "CoinGecko price response didn't validate, did the API change?",
      json
    )
    return null
  }

  return parseFloat(json[coingeckoCoinId][currencySymbol])
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
  const url = `${COINGECKO_API_ROOT}/simple/price?ids=${assets
    .map((a) => a.metadata.coinGeckoId)
    .join(",")}&include_last_updated_at=true&vs_currencies=${vsCurrencies
    .map((c) => c.symbol.toLowerCase())
    .join(",")}`

  const json = await fetchJson(url)
  // TODO further validate response, fix loss of precision from json
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
  Object.entries(json).forEach(([address, priceDetails]) => {
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
      time: Number.parseInt((priceDetails as any).last_updated_at || 0, 10),
    }
  })
  return prices
}
