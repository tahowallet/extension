import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"

import { EVMTransaction, HexString } from "../types"
import { createBackgroundAsyncThunk } from "./utils"

type TransactionOptions = {
  from: HexString
  to: HexString
  value: bigint
  nonce: bigint
  gasLimit: bigint
}

export const initialState: Partial<EVMTransaction> = {}

const transactionSlice = createSlice({
  name: "transaction",
  initialState,
  reducers: {
    transactionOptions: (
      immerState,
      { payload: options }: { payload: TransactionOptions }
    ) => {
      return { ...immerState, ...options }
    },
  },
})

export const { transactionOptions } = transactionSlice.actions

export default transactionSlice.reducer

export type Events = {
  updateOptions: { options: TransactionOptions }
}

export const emitter = new Emittery<Events>()

// Async thunk to pass transaction options from the store to the background via an event
export const updateTransactionOptions = createBackgroundAsyncThunk(
  "transaction/options",
  async ({ options }: { options: TransactionOptions }) => {
    await emitter.emit("updateOptions", { options })
  }
)
