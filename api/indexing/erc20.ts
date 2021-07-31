import { ethers } from "ethers"
import { fetchJson } from "@ethersproject/web"
import { NetworkFungibleAsset, UnitPriceAndTime } from "../types"

const COINGECKO_API_ROOT = "https://api.coingecko.com/api/v3/"
const COINGECKO_BASE_URL = new URL(COINGECKO_API_ROOT)

const ALCHEMY_KEY = "8R4YNuff-Is79CeEHM2jzj2ssfzJcnfa"

/*
 * Get a list of token prices from the CoinGecko API against a fiat currency.
 *
 * Tokens are specified by an array of contract addresses. Prices are returned
 * as the "unit price" of each single token in the fiat currency.
 */
export async function getPrices(
  tokenAddresses: string[],
  fiatCurrency: string
) {
  // TODO cover failed schema validation and http & network errors
  const url = URL.createObjectURL({
    ...COINGECKO_BASE_URL,
    pathname: `${COINGECKO_BASE_URL.pathname}simple/token_price/ethereum`,
    searchParams: {
      contract_addresses: tokenAddresses.join(","),
      include_last_updated_at: "true",
      vs_currencies: fiatCurrency,
    },
  })
  const json = await fetchJson(url.toString())

  const prices: {
    [index: string]: UnitPriceAndTime
  } = {}
  Object.entries(json).forEach(([address, priceDetails]) => {
    // TODO parse this as a fixed decimal rather than a number
    const price: number = Number.parseFloat(priceDetails[fiatCurrency])
    // TODO fiat currency data lookups
    const fiatDecimals = 10 // SHIB only needs 8, we're going all out
    prices[address] = {
      unitPrice: {
        asset: {
          name: fiatCurrency,
          symbol: fiatCurrency.toUpperCase(),
          decimals: fiatDecimals,
        },
        amount: BigInt(price ** fiatDecimals),
      },
      lastUpdated: Number.parseInt(
        (priceDetails as any).last_updated_at || 0,
        10
      ),
    }
  })
  return prices
}

/*
 * Get an account's balance from an ERC20-compliant contract.
 */
export async function getBalance(
  tokenAddress: string,
  account: string
): Promise<BigInt> {
  const provider = new ethers.providers.AlchemyProvider(ALCHEMY_KEY)
  const abi = ["function balanceOf(address owner) view returns (uint256)"]
  const token = new ethers.Contract(tokenAddress, abi, provider)

  return BigInt((await token.balanceOf(account)).toString())
}

/*
 * Get multiple token balances for an account using Alchemy.
 *
 * If no token contracts are provided, balances for the top 100 tokens by 24
 * hour volume will be returned.
 */
export async function getBalances(
  tokens: NetworkFungibleAsset[],
  account: string
): Promise<{ [tokenAddress: string]: BigInt }> {
  const provider = new ethers.providers.AlchemyProvider(ALCHEMY_KEY)

  const params = [
    account,
    tokens.length > 0 ? tokens.map((t) => t.contractAddress) : "DEFAULT_TOKENS",
  ]
  const json = await provider.send("alchemy_getTokenBalances", params)
  // TODO cover failed schema validation and other errors

  return json.tokenBalances.reduce((acc: any, tokenDetail: any) => {
    acc[tokenDetail.contractAddress] = BigInt(tokenDetail.tokenBalance || 0)
    return acc
  }, {})
}

// TODO get token balances of a many token contracts for a particular account the slow way, cache
// TODO get price data from 0xAPI
// TODO export a function that can take a tx and return any involved ERC-20s using traces
// TODO export a function that can simulate an unsigned transaction and return the token balance changes
