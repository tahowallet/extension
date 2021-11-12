import { fetchJson } from "@ethersproject/web"
import { JSONSchemaType } from "ajv"
import logger from "./logger"
import {
  AnyAsset,
  CoinGeckoAsset,
  FiatCurrency,
  PricePoint,
  UnitPricePoint,
} from "../assets"
import { jsonSchemaValidatorFor } from "./validation"

import { multiplyByFloat, toFixedPoint } from "./fixed-point"

const COINGECKO_API_ROOT = "https://api.coingecko.com/api/v3"

export type CoingeckoPriceData = {
  [coinId: string]:
    | {
        last_updated_at: number
        [currencyId: string]: number | undefined
      }
    | undefined
}

// Ajv's typing incorrectly requires nullable: true for last_updated_at because
// the remaining keys in the coin entry are optional. This in turn interferes
// with the fact that last_updated_at is listed in `required`. The two `as`
// type casts below trick the type system into allowing the schema correctly.
// Note that the schema will validate as required, and the casts allow it to
// match the corret TypeScript types.
//
// This all stems from Ajv also incorrectly requiring an optional property (`|
// undefined`) to be nullable (`| null`). See
// https://github.com/ajv-validator/ajv/issues/1664, which should be fixed in
// Ajv v9 via
// https://github.com/ajv-validator/ajv/commit/b4b806fd03a9906e9126ad86cef233fa405c9a3e
export const coingeckoPriceSchema: JSONSchemaType<CoingeckoPriceData> = {
  type: "object",
  required: [],
  additionalProperties: {
    type: "object",
    properties: {
      last_updated_at: { type: "number" } as {
        type: "number"
        nullable: true
      },
    },
    required: ["last_updated_at"] as never[],
    additionalProperties: { type: "number", nullable: true },
    nullable: true,
  },
}

export async function getPrice(
  coingeckoCoinId = "ethereum",
  currencySymbol = "usd"
): Promise<number | null> {
  const url = `${COINGECKO_API_ROOT}/simple/price?ids=${coingeckoCoinId}&vs_currencies=${currencySymbol}&include_last_updated_at=true`

  const json = await fetchJson(url)
  const validate = jsonSchemaValidatorFor(coingeckoPriceSchema)

  if (!validate(json)) {
    logger.warn(
      "CoinGecko price response didn't validate, did the API change?",
      json,
      validate.errors
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
  const validate = jsonSchemaValidatorFor(coingeckoPriceSchema)

  if (!validate(json)) {
    logger.warn(
      "CoinGecko price response didn't validate, did the API change?",
      json,
      validate.errors
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
        amount: BigInt(Math.trunc(price * 10 ** fiatDecimals)),
      },
      time: priceDetails.last_updated_at,
    }
  })
  return prices
}
