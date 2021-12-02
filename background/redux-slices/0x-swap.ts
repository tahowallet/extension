import { createSlice } from "@reduxjs/toolkit"
import { fetchJson } from "@ethersproject/web"

import { createBackgroundAsyncThunk } from "./utils"
import { isSmartContractFungibleAsset, Asset } from "../assets"
import { AssetsState } from "./assets"
import logger from "../lib/logger"

interface SwapAsset extends Asset {
  price?: string
}

export interface SwapState {
  sellAsset?: SwapAsset
  buyAsset?: SwapAsset
  sellAmount: string
  buyAmount: string
  availableAssets: Asset[]
}

interface SwapAssets {
  sellAsset?: Asset
  buyAsset?: Asset
}

interface SwapAmount {
  sellAmount: string
  buyAmount: string
}

interface ZrxToken {
  symbol: string
  name: string
  decimals: number
  address: string
}

interface ZrxPrice {
  symbol: string
  price: string
}

export const fetchSwapAssets = createBackgroundAsyncThunk(
  "0x-swap/fetchAssets",
  async (_, { getState }) => {
    const state = getState() as { assets: AssetsState }
    const assets = state.assets as Asset[]
    const apiData = await fetchJson(`https://api.0x.org/swap/v1/tokens`)

    const filteredAssets = assets
      .filter(isSmartContractFungibleAsset)
      .filter((asset) => {
        const matchingAssets = apiData.records.filter((zrxToken: ZrxToken) => {
          // Only allow tokens to be swapped if the data from 0x matches our asset information
          if (
            asset.symbol.toLowerCase() === zrxToken.symbol.toLowerCase() &&
            asset.contractAddress.toLowerCase() ===
              zrxToken.address.toLowerCase()
          ) {
            return true
          }

          if (
            asset.symbol.toLowerCase() === zrxToken.symbol.toLowerCase() &&
            asset.contractAddress.toLowerCase() !==
              zrxToken.address.toLowerCase()
          ) {
            logger.warn(
              "Swap Token Discrepancy: Symbol matches but contract address doesn't",
              asset,
              zrxToken
            )
          }

          if (
            asset.contractAddress.toLowerCase() ===
              zrxToken.address.toLowerCase() &&
            asset.symbol.toLowerCase() !== zrxToken.symbol.toLowerCase()
          ) {
            logger.warn(
              "Swap Token Discrepancy: Contract address matches but symbol doesn't",
              asset,
              zrxToken
            )
          }

          return false
        })

        // TODO: What if multiple assets match?
        if (matchingAssets.length) {
          return matchingAssets[0]
        }

        return false
      })

    return filteredAssets
  }
)

export const fetchSwapPrices = createBackgroundAsyncThunk(
  "0x-swap/fetchPrices",
  async (asset: Asset) => {
    const apiData = await fetchJson(
      `https://api.0x.org/swap/v1/prices?sellToken=${asset.symbol}&perPage=1000`
    )

    return apiData.records
  }
)

export const initialState: SwapState = {
  sellAsset: undefined,
  buyAsset: undefined,
  sellAmount: "",
  buyAmount: "",
  availableAssets: [],
}

const swapSlice = createSlice({
  name: "0x-swap",
  initialState,
  reducers: {
    setSwapAmount: (
      immerState,
      { payload: amount }: { payload: SwapAmount }
    ) => {
      return { ...immerState, ...amount }
    },

    setSwapTrade: (immerState, { payload: swap }: { payload: SwapAssets }) => {
      // Reset the buy token to be empty when the user changes their sell token
      // This is necessary because we have to fetch price data from the 0x API whenver the sell token changes
      if (swap.sellAsset) {
        return {
          ...immerState,
          sellAsset: swap.sellAsset,
          buyAsset: undefined,
          sellAmount: "",
          buyAmount: "",
        }
      }

      return { ...immerState, ...swap }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(
        fetchSwapPrices.fulfilled,
        (immerState, { payload: assetPrices }: { payload: ZrxPrice[] }) => {
          const assetsWithPrices = immerState.availableAssets.map((asset) => {
            const matchingAsset = assetPrices.filter((price) => {
              if (asset.symbol.toLowerCase() === price.symbol.toLowerCase()) {
                return true
              }

              return false
            })

            if (matchingAsset.length) {
              return { ...asset, price: matchingAsset[0].price }
            }

            return { ...asset, price: 0 }
          })

          return { ...immerState, availableAssets: assetsWithPrices }
        }
      )
      .addCase(
        fetchSwapAssets.fulfilled,
        (immerState, { payload: availableAssets }: { payload: Asset[] }) => {
          return { ...immerState, availableAssets }
        }
      )
  },
})

export const { setSwapAmount, setSwapTrade } = swapSlice.actions
export default swapSlice.reducer
