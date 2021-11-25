import { createSlice, createDraftSafeSelector } from "@reduxjs/toolkit"
import { BigNumber } from "ethers"
import { fetchJson } from "@ethersproject/web"

import { createBackgroundAsyncThunk } from "./utils"
import { isSmartContractFungibleAsset, AnyAsset, Asset } from "../assets"
import { AssetsState } from "./assets"

interface SwapAmount {
  from: string
  to: string
}

interface TradingPair {
  from?: Asset
  to?: Asset
  price: BigNumber
}

interface ZrxToken {
  symbol: string
  name: string
  decimals: number
  address: string
  price?: string
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

    const stats = {
      symbolMatch: 0,
      addressMatch: 0,
      bothMatch: 0,
      missing: 0,
    }

    const filteredAssets = apiData.records.filter((zrxToken: ZrxToken) => {
      const matchingAssets = assets
        .filter(isSmartContractFungibleAsset)
        .filter((asset) => {
          if (
            asset.symbol.toLowerCase() === zrxToken.symbol.toLowerCase() &&
            asset.contractAddress.toLowerCase() ===
              zrxToken.address.toLowerCase()
          ) {
            stats.bothMatch += 1
            return true
          }

          if (asset.symbol.toLowerCase() === zrxToken.symbol.toLowerCase()) {
            stats.symbolMatch += 1
            return true
          }

          if (
            asset.contractAddress.toLowerCase() ===
            zrxToken.address.toLowerCase()
          ) {
            stats.addressMatch += 1
            return true
          }

          return false
        })

      if (!matchingAssets.length) {
        stats.missing += 1
      } else {
        return true
      }

      // console.log("totally missing", zrxToken)
      return false
    })

    // console.log("got some stats", stats)
    // console.log("FilteredAssets!", filteredAssets, filteredAssets.length)
    return filteredAssets
  }
)

export const fetchSwapPrices = createBackgroundAsyncThunk(
  "0x-swap/fetchSwapPrices",
  async (token: Asset) => {
    const apiData = await fetchJson(
      `https://api.0x.org/swap/v1/prices?sellToken=${token.symbol}&perPage=1000`
    )

    return apiData.records.map((zrxToken: ZrxToken) => {
      return { ...zrxToken, name: "" } // TODO: Populate this by using the assets redux slice?
    })
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
    price: BigNumber.from("0"),
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
    builder.addCase(
      fetchSwapPrices.fulfilled,
      (immerState, { payload: tokens }: { payload: Asset[] }) => {
        return { ...immerState, tokens }
      }
    )
  },
})

export const { setSwapAmount, setSwapTrade } = swapSlice.actions
export default swapSlice.reducer
