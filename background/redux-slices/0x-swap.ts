import { createSlice, createSelector } from "@reduxjs/toolkit"
import { fetchJson } from "@ethersproject/web"
import { utils } from "ethers"
import { JTDDataType, ValidateFunction } from "ajv/dist/jtd"

import { createBackgroundAsyncThunk } from "./utils"
import { Asset, FungibleAsset, isSmartContractFungibleAsset } from "../assets"
import logger from "../lib/logger"
import {
  isValidSwapAssetsResponse,
  isValidSwapPriceResponse,
  isValidSwapQuoteResponse,
} from "../lib/validate"

interface PartialSwapAssets {
  sellAsset?: FungibleAsset
  buyAsset?: FungibleAsset
}

interface SwapAssets {
  sellAsset: FungibleAsset
  buyAsset: FungibleAsset
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

interface ZrxOrder {
  makerAmount: string
  makerToken: string
  source: string
  sourcePathId: string
  takerAmount: string
  takerToken: string
  type: number
}

interface ZrxSources {
  name: string
  proportion: string
}

interface ZrxQuote {
  allowanceTarget: string
  buyAmount: string
  buyTokenAddress: string
  buyTokenToEthRate: string
  chainId: number
  data: string
  estimatedGas: string
  gas: string
  gasPrice: string
  guaranteedPrice: string
  minimumProtocolFee: string
  orders: ZrxOrder[]
  price: string
  protocolFee: string
  sellAmount: string
  sellTokenAddress: string
  sellTokenToEthRate: string
  sources: ZrxSources[]
  to: string
  value: string
}

export interface SwapState {
  sellAsset?: FungibleAsset
  buyAsset?: FungibleAsset
  sellAmount: string
  buyAmount: string
  zrxAssets: ZrxAsset[]
  zrxPrices: ZrxPrice[]
  quote?: ZrxQuote
}

export const initialState: SwapState = {
  sellAsset: undefined,
  buyAsset: undefined,
  sellAmount: "",
  buyAmount: "",
  zrxAssets: [],
  zrxPrices: [],
}

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

export const fetchSwapPrices = createBackgroundAsyncThunk(
  "0x-swap/fetchPrices",
  async (asset: Asset) => {
    const apiData = await fetchJson(
      `https://api.0x.org/swap/v1/prices?sellToken=${asset.symbol}&perPage=1000`
    )

    if (isValidSwapPriceResponse(apiData)) {
      return apiData.records as ZrxPrice[]
    }

    logger.warn(
      "Swap price API call didn't validate, did the 0x API change?",
      apiData,
      isValidSwapPriceResponse.errors
    )

    return []
  }
)

export const fetchSwapQuote = createBackgroundAsyncThunk(
  "0x-swap/fetchQuote",
  async (quote: { assets: SwapAssets; amount: SwapAmount }) => {
    const sellAmount = utils.parseUnits(
      quote.amount.sellAmount,
      quote.assets.sellAsset.decimals
    )

    const apiData = await fetchJson(
      `https://api.0x.org/swap/v1/quote?` +
        `sellToken=${quote.assets.sellAsset.symbol}&` +
        `buyToken=${quote.assets.buyAsset.symbol}&` +
        `sellAmount=${sellAmount}`
    )

    if (isValidSwapQuoteResponse(apiData)) {
      return apiData as ZrxQuote
    }

    logger.warn(
      "Swap quote API call didn't validate, did the 0x API change?",
      apiData,
      isValidSwapPriceResponse.errors
    )

    return undefined
  }
)

const swapSlice = createSlice({
  name: "0x-swap",
  initialState,
  reducers: {
    setSwapAmount: (state, { payload: amount }: { payload: SwapAmount }) => {
      return { ...state, ...amount }
    },

    setSwapTrade: (
      state,
      { payload: swap }: { payload: PartialSwapAssets }
    ) => {
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

    clearSwapQuote: (state) => {
      return { ...state, quote: undefined }
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
      .addCase(
        fetchSwapQuote.fulfilled,
        (state, { payload: quote }: { payload: ZrxQuote | undefined }) => {
          return { ...state, quote }
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
              zrxAsset.address.toLowerCase() &&
            process.env.DEBUG === "true"
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
            walletAsset.symbol.toLowerCase() !==
              zrxAsset.symbol.toLowerCase() &&
            process.env.DEBUG === "true"
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

export const { setSwapAmount, setSwapTrade, clearSwapQuote } = swapSlice.actions
export default swapSlice.reducer
