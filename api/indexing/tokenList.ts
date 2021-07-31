import Ajv from "ajv"

import { TokenList, schema } from "@uniswap/token-lists"

import { Network, NetworkFungibleAsset } from "../types"

// TODO integrate this with /api/networks
const ETHEREUM_NETWORK: Network = {
  name: "Ethereum Main Net",
  baseAsset: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  chainId: "1",
  family: "EVM",
}

export interface TokenListAndReference {
  url: string
  tokenList: TokenList
}

async function fetchAndValidateTokenList(
  url: string
): Promise<TokenListAndReference> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Error resolving token list at ${url}`)
  }
  const json = await response.json()
  const valid = new Ajv().validate(schema, json)
  if (!valid) {
    throw new Error(`Invalid token list at ${url}`)
  }
  return {
    tokenList: json as TokenList,
    url,
  }
}

async function fetchAndValidateTokenLists(urls: string[]) {
  return (await Promise.allSettled(urls.map(fetchAndValidateTokenList)))
    .filter((l) => l.status === "fulfilled")
    .map((l) => (l as PromiseFulfilledResult<TokenListAndReference>).value)
}

function tokenListToFungibleAssets(
  url: string,
  tokenList: TokenList
): NetworkFungibleAsset[] {
  return tokenList.tokens.map((t) => {
    return {
      metadata: {
        logoURL: t.logoURI,
        tokenLists: [
          {
            url,
            name: tokenList.name,
            logoURL: tokenList.logoURI,
          },
        ],
      },
      name: t.name,
      symbol: t.symbol,
      decimals: t.decimals,
      homeNetwork: ETHEREUM_NETWORK,
      contractAddress: t.address,
    }
  })
}

/*
 * Return all tokens in the provided lists, de-duplicated and structured in our
 * types for easy manipulation, and sorted by the number of lists each appears
 * in.
 */
export function networkAssetFromLists(tokenLists: TokenListAndReference[]) {
  const fungibleAssets = tokenLists
    .map((listAndRef) =>
      tokenListToFungibleAssets(listAndRef.url, listAndRef.tokenList)
    )
    .reduce((a, b) => a.concat(b), [])

  function tokenReducer(
    acc: { [contractAddress: string]: NetworkFungibleAsset },
    asset: NetworkFungibleAsset
  ) {
    if (asset.contractAddress in acc) {
      const original = acc[asset.contractAddress]
      acc[asset.contractAddress] = {
        ...original,
        metadata: {
          ...original.metadata,
          ...asset.metadata,
          tokenLists: original.metadata.tokenLists.concat(
            asset.metadata.tokenLists
          ),
        },
      }
    }
    return acc
  }

  const merged = fungibleAssets.reduce(tokenReducer, {})

  return Object.entries(merged)
    .map(([k, v]) => v)
    .slice()
    .sort(
      (a, b) =>
        (a.metadata?.tokenLists?.length || 0) -
        (b.metadata?.tokenLists?.length || 0)
    )
}

// TODO track "tokens of interest" in extension storage
// TODO fetch, validate, and cache a token list
// TODO maintain a cached NetworkFungibleAsset list from prioritized token lists
// TODO get the latest list of assets from the cache
// TODO bust the cache
