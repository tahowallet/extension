import { createSlice, createSelector } from "@reduxjs/toolkit"
import Emittery from "emittery"

import {
  BlockPrices,
  EIP1559TransactionRequest,
  SignedEVMTransaction,
} from "../networks"
import { createBackgroundAsyncThunk } from "./utils"

type TransactionConstruction = {
  status: string
  signedTx: Partial<SignedEVMTransaction>
  transactionRequest: Partial<EIP1559TransactionRequest>
  gasEstimates: BlockPrices | null
}

export const initialState: TransactionConstruction = {
  status: "idle",
  signedTx: {},
  transactionRequest: {
    gasLimit: BigInt(21000), // 21,000 is the minimum amount of gas needed for sending a transaction
    maxFeePerGas: BigInt(21000),
    maxPriorityFeePerGas: BigInt(21000),
  },
  gasEstimates: null,
}

export type Events = {
  updateOptions: Partial<EIP1559TransactionRequest>
  gasEstimates: BlockPrices
  signRequest: Partial<EIP1559TransactionRequest>
}

export const emitter = new Emittery<Events>()

// Async thunk to pass transaction options from the store to the background via an event
export const updateTransactionOptions = createBackgroundAsyncThunk(
  "transaction/options",
  async (options: Partial<EIP1559TransactionRequest>) => {
    await emitter.emit("updateOptions", options)
  }
)

export const signTransaction = createBackgroundAsyncThunk(
  "transaction/sign",
  async (transaction: Partial<EIP1559TransactionRequest>) => {
    await emitter.emit("signRequest", transaction)
  }
)

const transactionSlice = createSlice({
  name: "transaction-construction",
  initialState,
  reducers: {
    transactionOptions: (
      immerState,
      { payload: options }: { payload: Partial<EIP1559TransactionRequest> }
    ) => {
      return {
        ...immerState,
        status: "loaded",
        transactionRequest: { ...options },
      }
    },
    signed: (immerState) => {
      immerState.status = "signed"
    },
    gasEstimates: (
      immerState,
      { payload: gasEstimates }: { payload: BlockPrices }
    ) => {
      return { ...immerState, gasEstimates }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(updateTransactionOptions.pending, (immerState) => {
      immerState.status = "pending"
    })
  },
})

export const { transactionOptions, signed, gasEstimates } =
  transactionSlice.actions

export default transactionSlice.reducer

export const selectGasEstimates = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.gasEstimates,
  (gasData) => gasData
)

export const selectTransactionData = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.transactionRequest,
  (transactionRequest) => transactionRequest
)

export const selectIsTransactionLoaded = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.status,
  (status) => status === "loaded"
)

export const selectIsTransactionSigned = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.status,
  (status) => status === "signed"
)
