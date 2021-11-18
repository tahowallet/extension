import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import { BigNumber } from "ethers"
import { fetchJson } from "@ethersproject/web"

import { Asset } from "../assets"

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
  price: string
}

interface ZrxSwap {
  amount: SwapAmount
  tokens: Asset[]
  tradingPair: TradingPair
}

export const fetchSwapPrices = createAsyncThunk(
  "0x-swap/fetchPrices",
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

const transactionSlice = createSlice({
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

export const { setSwapAmount, setSwapTrade } = transactionSlice.actions
export default transactionSlice.reducer
