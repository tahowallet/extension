import { TokenList } from "@uniswap/token-lists"

import { memoize } from "lodash"
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

// We allow `any` here because we don't know what we'll get back from a 3rd party api.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cleanTokenListResponse = (json: any, url: string) => {
  if (url.includes("api-polygon-tokens.polygon.technology")) {
    if (typeof json === "object" && json !== null && "tags" in json) {
      const { tags, ...cleanedJson } = json
      return cleanedJson
    }
  }
  return json
}

export async function fetchAndValidateTokenList(
  url: string
): Promise<TokenListAndReference> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Error resolving token list at ${url}`)
  }
  const json = await response.json()
  const cleanedJSON = cleanTokenListResponse(json, url)

  if (!isValidUniswapTokenListResponse(cleanedJSON)) {
    throw new Error(`Invalid token list at ${url}`)
  }
  return {
    tokenList: cleanedJSON as TokenList,
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

// The result of the `mergeAssets` is a pure function in the sense that the output depends
// only on the function argument, which makes it a good candidate for memoization.
// As for cache key generation we are using the total number of assets that were provided.
// This is not 100% accurate, but given that we are dealing with token lists it seems to be
// a safe bet. The chances are slim that 1 asset is added and 1 is removed in 1 minute.
export const memoizedMergeAssets = memoize(mergeAssets, (...assetLists) => {
  return assetLists.reduce((acc, curr) => acc + curr.length, 0)
})

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

  return memoizedMergeAssets(...fungibleAssets)
}
