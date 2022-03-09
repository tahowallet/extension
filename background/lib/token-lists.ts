import { TokenList } from "@uniswap/token-lists"

import {
  FungibleAsset,
  SmartContractFungibleAsset,
  TokenListAndReference,
} from "../assets"
import { isValidUniswapTokenListResponse } from "./validate"
import { EVMNetwork } from "../networks"
import {
  findClosestAssetIndex,
  prioritizedAssetSimilarityKeys,
} from "./asset-similarity"

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

function tokenListToFungibleAssetsForNetwork(
  network: EVMNetwork,
  { url: tokenListURL, tokenList }: TokenListAndReference
): SmartContractFungibleAsset[] {
  const networkChainID = Number(network.chainID)
  const tokenListCitation = {
    url: tokenListURL,
    name: tokenList.name,
    logoURL: tokenList.logoURI,
  }

  return tokenList.tokens
    .filter(({ chainId }) => chainId === networkChainID)
    .map((tokenMetadata) => {
      return {
        metadata: {
          logoURL: tokenMetadata.logoURI,
          tokenLists: [tokenListCitation],
        },
        name: tokenMetadata.name,
        symbol: tokenMetadata.symbol,
        decimals: tokenMetadata.decimals,
        homeNetwork: network,
        contractAddress: tokenMetadata.address,
      }
    })
}

/**
 * Merges the given asset lists into a single deduplicated array.
 *
 * Note that currently, two smart contract assets that are the same but don't
 * share a contract address (e.g., a token A that points to a contract address
 * and a token A that points to a proxy A's contract address) will not be
 * considered the same for merging purposes.
 */
export function mergeAssets<T extends FungibleAsset>(
  ...assetLists: T[][]
): T[] {
  function tokenReducer(
    seenAssetsBySimilarityKey: {
      [similarityKey: string]: T[]
    },
    asset: T
  ) {
    const updatedSeenAssetsBySimilarityKey = { ...seenAssetsBySimilarityKey }

    const similarityKeys = prioritizedAssetSimilarityKeys(asset)

    // For now, only use the highest-priority similarity key with no fallback.
    const referenceKey = similarityKeys[0]
    // Initialize if needed.
    updatedSeenAssetsBySimilarityKey[referenceKey] ??= []

    // For each key, determine where a close asset match exists.
    const matchingAssetIndex = findClosestAssetIndex(
      asset,
      updatedSeenAssetsBySimilarityKey[referenceKey]
    )

    if (typeof matchingAssetIndex !== "undefined") {
      // Merge the matching asset with this new one.
      const matchingAsset =
        updatedSeenAssetsBySimilarityKey[referenceKey][matchingAssetIndex]

      updatedSeenAssetsBySimilarityKey[referenceKey][matchingAssetIndex] = {
        ...matchingAsset,
        metadata: {
          ...matchingAsset.metadata,
          ...asset.metadata,
          tokenLists:
            matchingAsset.metadata?.tokenLists?.concat(
              asset.metadata?.tokenLists ?? []
            ) ?? [],
        },
      }
    } else {
      updatedSeenAssetsBySimilarityKey[referenceKey].push(asset)
    }

    return updatedSeenAssetsBySimilarityKey
  }

  const mergedAssetsBy = assetLists.flat().reduce(tokenReducer, {})
  const mergedAssets = Object.values(mergedAssetsBy).flat()

  // Sort the merged assets by the number of token lists they appear in.
  return mergedAssets.sort(
    (a, b) =>
      (a.metadata?.tokenLists?.length || 0) -
      (b.metadata?.tokenLists?.length || 0)
  )
}

/*
 * Return all tokens in the provided lists, de-duplicated and structured in our
 * types for easy manipulation, and sorted by the number of lists each appears
 * in.
 */
export function networkAssetsFromLists(
  network: EVMNetwork,
  tokenLists: TokenListAndReference[]
): SmartContractFungibleAsset[] {
  const fungibleAssets = tokenLists.map((tokenListAndReference) =>
    tokenListToFungibleAssetsForNetwork(network, tokenListAndReference)
  )

  return mergeAssets(...fungibleAssets)
}
