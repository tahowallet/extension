import { createSelector, createSlice } from "@reduxjs/toolkit"
import { AnyAsset, PricePoint } from "../assets"

type SingleAssetState = AnyAsset & {
  prices: PricePoint[]
  recentPrices: {
    [assetSymbol: string]: PricePoint
  }
}

export type AssetsState = SingleAssetState[]

export const initialState = [] as AssetsState

/*
 * Use heuristics to score two assets based on their metadata similarity. The
 * higher the score, the more likely the asset metadata refers to the same
 * asset.
 *
 * @param a - the first asset
 * @param b - the second asset
 * @returns an integer score >= 0
 */
function scoreAssetSimilarity(a: AnyAsset, b: AnyAsset): number {
  let score = 0
  if (a.symbol === b.symbol) {
    score += 1
  }
  if (a.name === b.name) {
    score += 1
  }
  if ("decimals" in a && "decimals" in b) {
    if (a.decimals === b.decimals) {
      score += 1
    } else {
      score -= 1
    }
  } else if ("decimals" in a || "decimals" in b) {
    score -= 1
  }
  if ("homeNetwork" in a && "homeNetwork" in b) {
    if (
      a.homeNetwork.name === b.homeNetwork.name &&
      a.homeNetwork.chainID === b.homeNetwork.chainID
    ) {
      score += 1
    } else {
      score -= 1
    }
  } else if ("homeNetwork" in a || "homeNetwork" in b) {
    score -= 1
  }
  return score
}

/*
 * Score all assets by similarity, returning the most similiar asset as long as
 * it is above a base similiarity score, or null.
 *
 * @param baseAsset - the asset we're trying to find
 * @param assets - an array of assets to sort
 */
function findClosestAsset(
  baseAsset: AnyAsset,
  assets: AnyAsset[],
  minScore = 2
): number | null {
  const [bestScore, index] = assets.reduce(
    ([runningScore, runningScoreIndex], asset, i) => {
      const score = scoreAssetSimilarity(baseAsset, asset)
      if (score > runningScore) {
        return [score, i]
      }
      return [runningScore, runningScoreIndex]
    },
    [0, -1] as [number, number]
  )

  if (bestScore >= minScore && index >= 0) {
    return index
  }

  return null
}

function prunePrices(prices: PricePoint[]): PricePoint[] {
  // TODO filter prices to daily in the past week, weekly in the past month, monthly in the past year
  const pricesToSort = prices.map<[number, PricePoint]>((pp) => [pp.time, pp])
  pricesToSort.sort()
  return pricesToSort.map(([, pp]) => pp)
}

/*
 * Reduce a list of asset prices to an object mapping symbols to price.
 *
 * The reducer returns the latest price for each symbol, priced against the
 * base asset. We make a best effort to de-duplicate assets, kicking the can on
 * whether we need to try to canonicalize asset IDs... a deep and dark hole, in
 * my experience.
 *
 * A list of prices for ETH might reduce to {
 *   USD: {...},
 *   CNY: {...},
 *   EUR: {...},
 * }
 *
 * @param baseAsset - the asset against which prices are desired
 * @param prices - a list of price points. One of the assets in each points pair
 *                 should be the base asset.
 */
function recentPricesFromArray(
  baseAsset: AnyAsset,
  prices: PricePoint[]
): SingleAssetState["recentPrices"] {
  const pricesToSort = prices.map((pp) => [pp.time, pp])
  pricesToSort.sort()
  return pricesToSort
    .map((r) => r[1] as PricePoint)
    .reduce((agg: SingleAssetState["recentPrices"], pp: PricePoint) => {
      const pricedAssetIndex = findClosestAsset(baseAsset, pp.pair)
      if (pricedAssetIndex !== null) {
        const pricedAsset = pp.pair[+(pricedAssetIndex === 0)]
        const newAgg = {
          ...agg,
        }
        newAgg[pricedAsset.symbol] = pp
        return newAgg
      }
      return agg
    }, {})
}

const assetsSlice = createSlice({
  name: "assets",
  initialState,
  reducers: {
    assetsLoaded: (
      immerState,
      { payload: newAssets }: { payload: AnyAsset[] }
    ) => {
      const mappedAssets: { [sym: string]: SingleAssetState[] } = {}
      // bin existing known assets
      immerState.forEach((asset) => {
        if (mappedAssets[asset.symbol] === undefined) {
          mappedAssets[asset.symbol] = []
        }
        // if an asset is already in state, assume unique checks have been done
        // no need to check network, contract address, etc
        mappedAssets[asset.symbol].push(asset)
      })
      // merge in new assets
      newAssets.forEach((asset) => {
        if (mappedAssets[asset.symbol] === undefined) {
          mappedAssets[asset.symbol] = [
            { ...asset, prices: [], recentPrices: {} },
          ]
        } else {
          const duplicates = mappedAssets[asset.symbol].filter(
            (a) =>
              ("homeNetwork" in asset &&
                "contractAddress" in asset &&
                "homeNetwork" in a &&
                "contractAddress" in a &&
                a.homeNetwork.name === asset.homeNetwork.name &&
                a.contractAddress === asset.contractAddress) ||
              asset.name === a.name
          )
          // if there aren't duplicates, add the asset
          if (duplicates.length === 0) {
            mappedAssets[asset.symbol].push({
              ...asset,
              prices: [],
              recentPrices: {},
            })
          }
          // TODO if there are duplicates... when should we replace assets?
        }
      })
      return Object.values(mappedAssets).flat()
    },
    newPricePoint: (
      immerState,
      { payload: pricePoint }: { payload: PricePoint }
    ) => {
      pricePoint.pair.forEach((pricedAsset) => {
        // find the asset metadata
        const index = findClosestAsset(pricedAsset, [
          ...immerState,
        ] as AnyAsset[])
        if (index) {
          // append to longer-running prices
          const prices = prunePrices(
            [...immerState[index].prices].concat([pricePoint])
          )
          immerState[index].prices = prices
          // update recent prices for easy checks by symbol
          immerState[index].recentPrices = recentPricesFromArray(
            pricedAsset,
            prices
          )
        }
      })
    },
  },
})

export const { assetsLoaded, newPricePoint } = assetsSlice.actions

export default assetsSlice.reducer

const selectAssetsState = (state: AssetsState) => state
const selectAssetSymbol = (_: AssetsState, assetSymbol: string) => assetSymbol
const selectPairedAssetSymbol = (
  _: AssetsState,
  _2: string,
  pairedAssetSymbol: string
) => pairedAssetSymbol

/**
 * Selects a particular asset price point given the asset symbol and the paired
 * asset symbol used to price it.
 *
 * For example, calling `selectAssetPricePoint(state.assets, "ETH", "USD")`
 * will return the ETH-USD price point, if it exists. Note that this selector
 * guarantees that the returned price point will have the pair in the specified
 * order, so even if the store price point has amounts in the order [USD, ETH],
 * the selector will return them in the order [ETH, USD].
 */
export const selectAssetPricePoint = createSelector(
  [selectAssetsState, selectAssetSymbol, selectPairedAssetSymbol],
  (assets, assetSymbol, pairedAssetSymbol) => {
    const pricedAsset = assets.find(
      (asset) =>
        asset.symbol === assetSymbol &&
        pairedAssetSymbol in asset.recentPrices &&
        asset.recentPrices[pairedAssetSymbol].pair
          .map(({ symbol }) => symbol)
          .includes(assetSymbol)
    )

    if (pricedAsset) {
      const pricePoint = pricedAsset.recentPrices[pairedAssetSymbol]
      const { pair, amounts, time } = pricePoint

      if (pair[0].symbol === assetSymbol) {
        return pricePoint
      }

      const flippedPricePoint: PricePoint = {
        pair: [pair[1], pair[0]],
        amounts: [amounts[1], amounts[0]],
        time,
      }

      return flippedPricePoint
    }

    // If no matching priced asset was found, return undefined.
    return undefined
  }
)
