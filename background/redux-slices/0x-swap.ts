import { createSlice } from "@reduxjs/toolkit"
import { BigNumber } from "ethers"

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
  tokens: ZrxToken[]
  tradingPair: TradingPair
}

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

    setSwapTokens: (
      immerState,
      { payload: tokens }: { payload: ZrxToken[] }
    ) => {
      return { ...immerState, tokens }
    },

    setSwapTrade: (
      immerState,
      { payload: tradingPair }: { payload: TradingPair }
    ) => {
      return { ...immerState, tradingPair }
    },
  },
})

export const { setSwapAmount, setSwapTokens, setSwapTrade } =
  transactionSlice.actions

export default transactionSlice.reducer
