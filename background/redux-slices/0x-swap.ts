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
  sellToken?: SwapAsset
  buyToken?: SwapAsset
  sellAmount: string
  buyAmount: string
  tokens: Asset[]
}

interface SwapToken {
  sellToken?: Asset
  buyToken?: Asset
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

export const fetchTokens = createBackgroundAsyncThunk(
  "0x-swap/fetchTokens",
  async (_, { getState }) => {
    const state = getState() as { assets: AssetsState }
    const assets = state.assets as Asset[]
    const apiData = await fetchJson(`https://api.0x.org/swap/v1/tokens`)

    const filteredAssets = assets
      .filter(isSmartContractFungibleAsset)
      .filter((asset) => {
        const matchingTokens = apiData.records.filter((zrxToken: ZrxToken) => {
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
        if (matchingTokens.length) {
          return matchingTokens[0]
        }

        return false
      })

    return filteredAssets
  }
)

export const fetchSwapPrices = createBackgroundAsyncThunk(
  "0x-swap/fetchSwapPrices",
  async (token: Asset) => {
    const apiData = await fetchJson(
      `https://api.0x.org/swap/v1/prices?sellToken=${token.symbol}&perPage=1000`
    )

    return apiData.records
  }
)

export const initialState: SwapState = {
  sellToken: undefined,
  buyToken: undefined,
  sellAmount: "",
  buyAmount: "",
  tokens: [],
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

    setSwapTrade: (immerState, { payload: token }: { payload: SwapToken }) => {
      // Reset the buy token to be empty when the user changes their sell token
      // This is necessary because we have to fetch price data from the 0x API whenver the sell token changes
      if (token.sellToken) {
        return {
          ...immerState,
          sellToken: token.sellToken,
          buyToken: undefined,
          sellAmount: "",
          buyAmount: "",
        }
      }

      return { ...immerState, ...token }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(
        fetchSwapPrices.fulfilled,
        (immerState, { payload: assetPrices }: { payload: ZrxPrice[] }) => {
          const tokensWithPrices = immerState.tokens.map((asset) => {
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

          return { ...immerState, tokens: tokensWithPrices }
        }
      )
      .addCase(
        fetchTokens.fulfilled,
        (immerState, { payload: tokens }: { payload: Asset[] }) => {
          return { ...immerState, tokens }
        }
      )
  },
})

export const { setSwapAmount, setSwapTrade } = swapSlice.actions
export default swapSlice.reducer
