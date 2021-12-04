import { createSlice, createSelector } from "@reduxjs/toolkit"
import { fetchJson } from "@ethersproject/web"

import { createBackgroundAsyncThunk } from "./utils"
import { Asset, isSmartContractFungibleAsset } from "../assets"
import logger from "../lib/logger"
import { jtdValidatorFor } from "../lib/validation"

export interface SwapState {
  sellAsset?: Asset
  buyAsset?: Asset
  sellAmount: string
  buyAmount: string
  zrxAssets: ZrxAsset[]
  zrxPrices: ZrxPrice[]
}

interface SwapAssets {
  sellAsset?: Asset
  buyAsset?: Asset
}

interface SwapAmount {
  sellAmount: string
  buyAmount: string
}

interface ZrxAsset {
  symbol: string
  name: string
  decimals: number
  address: string
}

interface ZrxPrice {
  symbol: string
  price: string
}

export const initialState: SwapState = {
  sellAsset: undefined,
  buyAsset: undefined,
  sellAmount: "",
  buyAmount: "",
  zrxAssets: [],
  zrxPrices: [],
}

const swapAssetsJTD = {
  properties: {
    records: {
      elements: {
        properties: {
          address: { type: "string" },
          decimals: { type: "int8" },
          name: { type: "string" },
          symbol: { type: "string" },
        },
      },
    },
  },
}

const isValidSwapAssetsResponse = jtdValidatorFor(swapAssetsJTD)

export const fetchSwapAssets = createBackgroundAsyncThunk(
  "0x-swap/fetchAssets",
  async () => {
    const apiData = await fetchJson(`https://api.0x.org/swap/v1/tokens`)

    if (isValidSwapAssetsResponse(apiData)) {
      return apiData.records as ZrxAsset[]
    }

    logger.warn(
      "Swap asset API call didn't validate, did the 0x API change?",
      apiData,
      isValidSwapAssetsResponse.errors
    )

    return []
  }
)

const swapPriceJTD = {}

export const fetchSwapPrices = createBackgroundAsyncThunk(
  "0x-swap/fetchPrices",
  async (asset: Asset) => {
    const apiData = await fetchJson(
      `https://api.0x.org/swap/v1/prices?sellToken=${asset.symbol}&perPage=1000`
    )

    // TODO: Add API validation
    return apiData.records
  }
)

const swapSlice = createSlice({
  name: "0x-swap",
  initialState,
  reducers: {
    setSwapAmount: (state, { payload: amount }: { payload: SwapAmount }) => {
      return { ...state, ...amount }
    },

    setSwapTrade: (state, { payload: swap }: { payload: SwapAssets }) => {
      // Reset the buy token to be empty when the user changes their sell token
      // This is necessary because we have to fetch price data from the 0x API whenver the sell token changes
      if (swap.sellAsset) {
        return {
          ...state,
          sellAsset: swap.sellAsset,
          buyAsset: undefined,
          sellAmount: "",
          buyAmount: "",
        }
      }

      return { ...state, ...swap }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(
        fetchSwapAssets.fulfilled,
        (state, { payload: zrxAssets }: { payload: ZrxAsset[] }) => {
          return { ...state, zrxAssets }
        }
      )
      .addCase(
        fetchSwapPrices.fulfilled,
        (state, { payload: zrxPrices }: { payload: ZrxPrice[] }) => {
          return { ...state, zrxPrices }
        }
      )
  },
})

export const selectSwappableAssets = createSelector(
  (state: { assets: Asset[]; swap: SwapState }) => ({
    walletAssets: state.assets,
    zrxAssets: state.swap.zrxAssets,
    zrxPrices: state.swap.zrxPrices,
  }),
  ({ walletAssets, zrxAssets, zrxPrices }) => {
    const filteredAssets = walletAssets
      .filter(isSmartContractFungibleAsset)
      .filter((walletAsset) => {
        const matchingAsset = zrxAssets.find((zrxAsset) => {
          // Only allow assets to be swapped if the data from 0x matches our asset information
          if (
            walletAsset.symbol.toLowerCase() ===
              zrxAsset.symbol.toLowerCase() &&
            walletAsset.contractAddress.toLowerCase() ===
              zrxAsset.address.toLowerCase()
          ) {
            return true
          }

          if (
            walletAsset.symbol.toLowerCase() ===
              zrxAsset.symbol.toLowerCase() &&
            walletAsset.contractAddress.toLowerCase() !==
              zrxAsset.address.toLowerCase()
          ) {
            logger.warn(
              "Swap Asset Discrepancy: Symbol matches but contract address doesn't",
              walletAsset,
              zrxAsset
            )
          }

          if (
            walletAsset.contractAddress.toLowerCase() ===
              zrxAsset.address.toLowerCase() &&
            walletAsset.symbol.toLowerCase() !== zrxAsset.symbol.toLowerCase()
          ) {
            logger.warn(
              "Swap Asset Discrepancy: Contract address matches but symbol doesn't",
              walletAsset,
              zrxAsset
            )
          }

          return false
        })

        // Make sure the matched asset has price data
        if (matchingAsset) {
          const priceData = zrxPrices.find(
            (zrxPrice: ZrxPrice) =>
              matchingAsset.symbol.toLowerCase() ===
              zrxPrice.symbol.toLowerCase()
          )

          return !!priceData
        }

        return false
      })

    return filteredAssets
  }
)

export const selectSwapPrice = createSelector(
  (state: { swap: SwapState }) => ({
    buyAsset: state.swap.buyAsset,
    zrxPrices: state.swap.zrxPrices,
  }),
  ({ buyAsset, zrxPrices }) => {
    if (buyAsset) {
      const priceData = zrxPrices.find(
        (zrxPrice: ZrxPrice) =>
          buyAsset.symbol.toLowerCase() === zrxPrice.symbol.toLowerCase()
      )

      if (priceData) {
        return priceData.price
      }
    }

    return "0"
  }
)

export const { setSwapAmount, setSwapTrade } = swapSlice.actions
export default swapSlice.reducer
