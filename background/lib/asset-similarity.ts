import { AnyAsset, isSmartContractFungibleAsset } from "../assets"
import { sameNetwork } from "../networks"
import { normalizeEVMAddress } from "./utils"

/**
 * Use heuristics to score two assets based on their metadata similarity. The
 * higher the score, the more likely the asset metadata refers to the same
 * asset.
 *
 * @param a - the first asset
 * @param b - the second asset
 * @return an integer score >= 0
 */
export function scoreAssetSimilarity(a: AnyAsset, b: AnyAsset): number {
  let score = 0
  if (a.symbol === b.symbol) {
    score += 1
  }
  if (a.name === b.name) {
    score += 1
  }
  if ("decimals" in a && "decimals" in b && a.decimals === b.decimals) {
    score += 1
  } else if ("decimals" in a || "decimals" in b) {
    score -= 1
  }
  if (
    "homeNetwork" in a &&
    "homeNetwork" in b &&
    sameNetwork(a.homeNetwork, b.homeNetwork)
  ) {
    score += 1
  } else if ("homeNetwork" in a || "homeNetwork" in b) {
    score -= 1
  }
  return score
}

/**
 * Returns a prioritized list of similarity keys, which are strings that can be
 * used to rapidly correlate assets. All similarity keys should be further
 * checked using {@link assetsSufficientlySimilar}, as a similarity key match
 * is designed to narrow the field rather than guarantee asset sameness.
 */
export function prioritizedAssetSimilarityKeys(asset: AnyAsset): string[] {
  let similarityKeys: string[] = []

  if (isSmartContractFungibleAsset(asset)) {
    const normalizedContractAddressAndNetwork = `${normalizeEVMAddress(
      asset.contractAddress
    )}-${asset.homeNetwork.chainID}`

    similarityKeys = [...similarityKeys, normalizedContractAddressAndNetwork]
  }

  return [...similarityKeys, asset.symbol]
}

/**
 * Score a set of assets by similarity to a search asset, returning the most
 * similiar asset to the search asset as long as it is above a base similiarity
 * score, or null.
 *
 * @see scoreAssetSimilarity The way asset similarity is computed.
 *
 * @param assetToFind The asset we're trying to find.
 * @param assets The array of assets in which to search for `assetToFind`.
 * @param minimumSimilarityScore The minimum similarity score to consider as a
 *        match.
 */
export function findClosestAssetIndex(
  assetToFind: AnyAsset,
  assets: AnyAsset[],
  minimumSimilarityScore = 2
): number | undefined {
  const [bestScore, index] = assets.reduce(
    ([runningScore, runningScoreIndex], asset, i) => {
      const score = scoreAssetSimilarity(assetToFind, asset)
      if (score > runningScore) {
        return [score, i]
      }
      return [runningScore, runningScoreIndex]
    },
    [0, -1]
  )

  if (bestScore >= minimumSimilarityScore && index >= 0) {
    return index
  }

  return undefined
}

/**
 * Merges the information about two assets. Mostly focused on merging metadata.
 */
export function mergeAssets(asset1: AnyAsset, asset2: AnyAsset): AnyAsset {
  return {
    ...asset1,
    metadata: {
      ...asset1.metadata,
      ...asset2.metadata,
      tokenLists:
        asset1.metadata?.tokenLists?.concat(
          asset2.metadata?.tokenLists ?? []
        ) ?? [],
    },
  }
}
