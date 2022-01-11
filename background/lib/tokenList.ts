import { TokenList } from "@uniswap/token-lists"

import { getEthereumNetwork } from "./utils"
import { SmartContractFungibleAsset, TokenListAndReference } from "../assets"
import { isValidUniswapTokenListResponse } from "./validate"

export async function fetchAndValidateTokenList(
  url: string
): Promise<TokenListAndReference> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Error resolving token list at ${url}`)
  }
  const json = await response.json()

  if (!isValidUniswapTokenListResponse(json)) {
    throw new Error(`Invalid token list at ${url}`)
  }
  return {
    tokenList: json as TokenList,
    url,
  }
}

export async function fetchAndValidateTokenLists(
  urls: string[]
): Promise<TokenListAndReference[]> {
  return (await Promise.allSettled(urls.map(fetchAndValidateTokenList)))
    .filter((l) => l.status === "fulfilled")
    .map((l) => (l as PromiseFulfilledResult<TokenListAndReference>).value)
}

function tokenListToFungibleAssets(
  url: string,
  tokenList: TokenList
): SmartContractFungibleAsset[] {
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
      homeNetwork: getEthereumNetwork(),
      contractAddress: t.address,
    }
  })
}

/*
 * Return all tokens in the provided lists, de-duplicated and structured in our
 * types for easy manipulation, and sorted by the number of lists each appears
 * in.
 */
export function networkAssetsFromLists(
  tokenLists: TokenListAndReference[]
): SmartContractFungibleAsset[] {
  const fungibleAssets = tokenLists
    .map((listAndRef) =>
      tokenListToFungibleAssets(listAndRef.url, listAndRef.tokenList)
    )
    .reduce((a, b) => a.concat(b), [])

  function tokenReducer(
    acc: { [contractAddress: string]: SmartContractFungibleAsset },
    asset: SmartContractFungibleAsset
  ) {
    const newAcc = { ...acc }
    if (asset.contractAddress in newAcc) {
      const original = newAcc[asset.contractAddress]
      newAcc[asset.contractAddress] = {
        ...original,
        metadata: {
          ...original.metadata,
          ...asset.metadata,
          tokenLists:
            original.metadata?.tokenLists?.concat(
              asset.metadata?.tokenLists ?? []
            ) ?? [],
        },
      }
    } else {
      newAcc[asset.contractAddress] = asset
    }
    return newAcc
  }

  const merged = fungibleAssets.reduce(tokenReducer, {})
  return Object.entries(merged)
    .map(([, v]) => v)
    .slice()
    .sort((a, b) =>
      (a.metadata?.tokenLists?.length || 0) >
      (b.metadata?.tokenLists?.length || 0)
        ? 1
        : -1
    )
}
