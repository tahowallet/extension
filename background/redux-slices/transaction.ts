import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"

import { TxParams } from "../types"
import { createBackgroundAsyncThunk } from "./utils"

export const initialState: TxParams = {
  gasLimit: BigInt(21000), // 21,000 gwei is the minimum amount of gas needed for sending a transaction
}

const transactionSlice = createSlice({
  name: "transaction",
  initialState,
  reducers: {
    transactionOptions: (
      immerState,
      { payload: options }: { payload: TxParams }
    ) => {
      return { ...immerState, ...options }
    },
  },
})

export const { transactionOptions } = transactionSlice.actions

export default transactionSlice.reducer

export type Events = {
  updateOptions: TxParams
}

export const emitter = new Emittery<Events>()

// Async thunk to pass transaction options from the store to the background via an event
export const updateTransactionOptions = createBackgroundAsyncThunk(
  "transaction/options",
  async (options: TxParams) => {
    await emitter.emit("updateOptions", options)
  }
)

// transaction/broadcast
