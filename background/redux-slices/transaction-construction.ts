import { createSlice, createSelector } from "@reduxjs/toolkit"
import Emittery from "emittery"

import {
  BlockEstimate,
  BlockPrices,
  EIP1559TransactionRequest,
  SignedEVMTransaction,
} from "../networks"
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
  signedTransaction?: SignedEVMTransaction
  broadcastOnSign?: boolean
  transactionLikelyFails?: boolean
  estimatedFeesPerGas: EstimatedFeesPerGas | undefined
  lastGasEstimatesRefreshed: number
}

export type EstimatedFeesPerGas = {
  baseFeePerGas: bigint
  instant: BlockEstimate | undefined
  express: BlockEstimate | undefined
  regular: BlockEstimate | undefined
}

export const initialState: TransactionConstruction = {
  status: TransactionConstructionStatus.Idle,
  estimatedFeesPerGas: undefined,
  lastGasEstimatesRefreshed: Date.now(),
}

export type Events = {
  updateOptions: Partial<EIP1559TransactionRequest> & {
    from: string
  }
  requestSignature: EIP1559TransactionRequest
  signatureRejected: never
  broadcastSignedTransaction: SignedEVMTransaction
}

export const emitter = new Emittery<Events>()

// Async thunk to pass transaction options from the store to the background via an event
export const updateTransactionOptions = createBackgroundAsyncThunk(
  "transaction-construction/update-options",
  async (options: Partial<EIP1559TransactionRequest> & { from: string }) => {
    await emitter.emit("updateOptions", options)
  }
)

export const signTransaction = createBackgroundAsyncThunk(
  "transaction-construction/sign",
  async (transaction: EIP1559TransactionRequest) => {
    await emitter.emit("requestSignature", transaction)
  }
)

export const broadcastSignedTransaction = createBackgroundAsyncThunk(
  "transaction-construction/broadcast",
  async (transaction: SignedEVMTransaction) => {
    await emitter.emit("broadcastSignedTransaction", transaction)
  }
)

const transactionSlice = createSlice({
  name: "transaction-construction",
  initialState,
  reducers: {
    transactionRequest: (
      state,
      {
        payload: { transactionRequest, transactionLikelyFails },
      }: {
        payload: {
          transactionRequest: EIP1559TransactionRequest
          transactionLikelyFails: boolean
        }
      }
    ) => ({
      ...state,
      status: TransactionConstructionStatus.Loaded,
      signedTransaction: undefined,
      transactionRequest,
      transactionLikelyFails,
    }),
    clearTransactionState: (state) => ({
      estimatedFeesPerGas: state.estimatedFeesPerGas,
      lastGasEstimatesRefreshed: state.lastGasEstimatesRefreshed,
      status: TransactionConstructionStatus.Idle,
    }),
    signed: (state, { payload }: { payload: SignedEVMTransaction }) => ({
      ...state,
      status: TransactionConstructionStatus.Signed,
      signedTransaction: payload,
    }),
    broadcastOnSign: (state, { payload }: { payload: boolean }) => ({
      ...state,
      broadcastOnSign: payload,
    }),
    transactionLikelyFails: (state) => ({
      ...state,
      transactionLikelyFails: true,
    }),
    estimatedFeesPerGas: (
      immerState,
      { payload: estimatedFeesPerGas }: { payload: BlockPrices }
    ) => {
      return {
        ...immerState,
        estimatedFeesPerGas: {
          baseFeePerGas: estimatedFeesPerGas.baseFeePerGas,
          instant: estimatedFeesPerGas.estimatedPrices.find(
            (el) => el.confidence === 99
          ),
          express: estimatedFeesPerGas.estimatedPrices.find(
            (el) => el.confidence === 95
          ),
          regular: estimatedFeesPerGas.estimatedPrices.find(
            (el) => el.confidence === 70
          ),
        },
        lastGasEstimatesRefreshed: Date.now(),
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(updateTransactionOptions.pending, (immerState) => {
      immerState.status = TransactionConstructionStatus.Pending
      immerState.signedTransaction = undefined
    })
  },
})

export const {
  transactionRequest,
  transactionLikelyFails,
  broadcastOnSign,
  signed,
  estimatedFeesPerGas,
} = transactionSlice.actions

export default transactionSlice.reducer

export const rejectTransactionSignature = createBackgroundAsyncThunk(
  "transaction-construction/reject",
  async (_, { dispatch }) => {
    await emitter.emit("signatureRejected")
    // Provide a clean slate for future transactions.
    dispatch(transactionSlice.actions.clearTransactionState())
  }
)

export const selectEstimatedFeesPerGas = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.estimatedFeesPerGas,
  (gasData) => gasData
)

export const selectLastGasEstimatesRefreshTime = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.lastGasEstimatesRefreshed,
  (updateTime) => updateTime
)

export const selectTransactionData = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.transactionRequest,
  (transactionRequestData) => transactionRequestData
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
