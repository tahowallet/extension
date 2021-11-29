import { createSlice } from "@reduxjs/toolkit"
import { fetchJson } from "@ethersproject/web"

import { createBackgroundAsyncThunk } from "./utils"
import { isSmartContractFungibleAsset, Asset } from "../assets"
import { AssetsState } from "./assets"
import logger from "../lib/logger"

interface SwapAmount {
  from: string
  to: string
}

interface TradingPair {
  from?: Asset
  to?: Asset
  price: string
}

interface ZrxToken {
  symbol: string
  name: string
  decimals: number
  address: string
  price?: string
}

interface ZrxPrice {
  symbol: string
  price: string
}

interface ZrxSwap {
  amount: SwapAmount
  tokens: Asset[]
  tradingPair: TradingPair
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

export const initialState: ZrxSwap = {
  amount: {
    from: "0.0",
    to: "0.0",
  },
  tokens: [],
  tradingPair: {
    from: undefined,
    to: undefined,
    price: "0",
  },
}

const swapSlice = createSlice({
  name: "0x-swap",
  initialState,
  reducers: {
    setSwapAmount: (
      immerState,
      { payload: amount }: { payload: SwapAmount }
    ) => {
      return { ...immerState, amount }
    },

    setSwapTrade: (
      immerState,
      { payload: tradingPair }: { payload: TradingPair }
    ) => {
      return { ...immerState, tradingPair }
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
