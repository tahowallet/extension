import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"

import { EIP1559TransactionRequest, BlockPrices } from "../networks"
import { createBackgroundAsyncThunk } from "./utils"

type TransactionConstruction = {
  transactionRequest: Partial<EIP1559TransactionRequest>
  gasEstimates: BlockPrices | null
}

export const initialState: TransactionConstruction = {
  transactionRequest: {
    gasLimit: BigInt(21000), // 21,000 is the minimum amount of gas needed for sending a transaction
    maxFeePerGas: BigInt(21000),
    maxPriorityFeePerGas: BigInt(21000),
  },
  gasEstimates: null,
}

const transactionSlice = createSlice({
  name: "transaction-construction",
  initialState,
  reducers: {
    transactionOptions: (
      immerState,
      { payload: options }: { payload: Partial<EIP1559TransactionRequest> }
    ) => {
      return { ...immerState, ...options }
    },

    gasEstimates: (
      immerState,
      { payload: gasEstimates }: { payload: BlockPrices }
    ) => {
      return { ...immerState, gasEstimates }
    },
  },
})

export const { transactionOptions, gasEstimates } = transactionSlice.actions

export default transactionSlice.reducer

export type Events = {
  updateOptions: Partial<EIP1559TransactionRequest>
  gasEstimates: BlockPrices
}

export const emitter = new Emittery<Events>()

// Async thunk to pass transaction options from the store to the background via an event
export const updateTransactionOptions = createBackgroundAsyncThunk(
  "transaction/options",
  async (options: Partial<EIP1559TransactionRequest>) => {
    await emitter.emit("updateOptions", options)
  }
)
