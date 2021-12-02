import { createSlice, createSelector } from "@reduxjs/toolkit"
import Emittery from "emittery"

import { BlockPrices, EIP1559TransactionRequest } from "../networks"
import { createBackgroundAsyncThunk } from "./utils"

const enum TransactionConstructionStatus {
  Idle = "idle",
  Pending = "pending",
  Loaded = "loaded",
  Signed = "signed",
}
export type TransactionConstruction = {
  status: TransactionConstructionStatus
  transactionRequest?: EIP1559TransactionRequest
  estimatedFeesPerGas: BlockPrices | null
}

export const initialState: TransactionConstruction = {
  status: TransactionConstructionStatus.Idle,
  estimatedFeesPerGas: null,
}

export type Events = {
  updateOptions: Partial<EIP1559TransactionRequest>
  requestSignature: EIP1559TransactionRequest
}

export const emitter = new Emittery<Events>()

// Async thunk to pass transaction options from the store to the background via an event
export const updateTransactionOptions = createBackgroundAsyncThunk(
  "transaction-construction/update-options",
  async (options: Partial<EIP1559TransactionRequest>) => {
    await emitter.emit("updateOptions", options)
  }
)

export const signTransaction = createBackgroundAsyncThunk(
  "transaction-construction/sign",
  async (transaction: EIP1559TransactionRequest) => {
    await emitter.emit("requestSignature", transaction)
  }
)

const transactionSlice = createSlice({
  name: "transaction-construction",
  initialState,
  reducers: {
    setTransactionRequest: (
      immerState,
      { payload: transactionRequest }: { payload: EIP1559TransactionRequest }
    ) => {
      return {
        ...immerState,
        status: TransactionConstructionStatus.Loaded,
        transactionRequest,
      }
    },
    setSigned: (immerState) => {
      immerState.status = TransactionConstructionStatus.Signed
    },
    setEstimatedFeesPerGas: (
      immerState,
      { payload: estimatedFeesPerGas }: { payload: BlockPrices }
    ) => {
      return { ...immerState, estimatedFeesPerGas }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(updateTransactionOptions.pending, (immerState) => {
      immerState.status = TransactionConstructionStatus.Pending
    })
  },
})

export const { setTransactionRequest, setSigned, setEstimatedFeesPerGas } =
  transactionSlice.actions

export default transactionSlice.reducer

export const selectEstimatedFeesPerGas = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.estimatedFeesPerGas,
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
