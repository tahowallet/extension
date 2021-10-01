import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"

import { EIP1559TransactionRequest } from "../types"
import { createBackgroundAsyncThunk } from "./utils"

export const initialState: Partial<EIP1559TransactionRequest> = {
  gasLimit: BigInt(21000), // 21,000 gwei is the minimum amount of gas needed for sending a transaction
  maxFeePerGas: BigInt(21000),
  maxPriorityFeePerGas: BigInt(21000),
}

const transactionSlice = createSlice({
  name: "transaction",
  initialState,
  reducers: {
    transactionOptions: (
      immerState,
      { payload: options }: { payload: Partial<EIP1559TransactionRequest> }
    ) => {
      return { ...immerState, ...options }
    },
  },
})

export const { transactionOptions } = transactionSlice.actions

export default transactionSlice.reducer

export type Events = {
  updateOptions: Partial<EIP1559TransactionRequest>
}

export const emitter = new Emittery<Events>()

// Async thunk to pass transaction options from the store to the background via an event
export const updateTransactionOptions = createBackgroundAsyncThunk(
  "transaction/options",
  async (options: Partial<EIP1559TransactionRequest>) => {
    await emitter.emit("updateOptions", options)
  }
)
