import { createSlice } from "@reduxjs/toolkit"
import { AnyAsset, PricePoint } from "../types"

type SingleAssetState = AnyAsset & {
  currentPrice: PricePoint | null
}

type AssetsState = SingleAssetState[]

export const initialState = [] as AssetsState

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
          mappedAssets[asset.symbol] = [{ ...asset, currentPrice: null }]
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
            mappedAssets[asset.symbol].push({ ...asset, currentPrice: null })
          }
          // TODO if there are duplicates... when should we replace assets?
        }
      })
      return Object.values(mappedAssets).flat()
    },
  },
})

export const { assetsLoaded } = assetsSlice.actions

export default assetsSlice.reducer
