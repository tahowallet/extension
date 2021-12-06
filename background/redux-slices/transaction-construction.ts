import { createSlice, createSelector } from "@reduxjs/toolkit"
import Emittery from "emittery"

import {
  BlockEstimate,
  BlockPrices,
  EIP1559TransactionRequest,
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
  estimatedFeesPerGas:
    | {
        baseFeePerGas: bigint
        instant: BlockEstimate | undefined
        express: BlockEstimate | undefined
        regular: BlockEstimate | undefined
      }
    | undefined
  lastGasEstimatesRefreshed: number
}

export const initialState: TransactionConstruction = {
  status: TransactionConstructionStatus.Idle,
  estimatedFeesPerGas: undefined,
  lastGasEstimatesRefreshed: Date.now(),
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
    transactionRequest: (
      immerState,
      { payload: transactionRequest }: { payload: EIP1559TransactionRequest }
    ) => {
      return {
        ...immerState,
        status: TransactionConstructionStatus.Loaded,
        transactionRequest,
      }
    },
    signed: (immerState) => {
      immerState.status = TransactionConstructionStatus.Signed
    },
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
    })
  },
})

export const { transactionRequest, signed, estimatedFeesPerGas } =
  transactionSlice.actions

export default transactionSlice.reducer

export const selectEstimatedFeesPerGas = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.estimatedFeesPerGas,
  (gasData) => {
    if (
      gasData?.instant &&
      gasData.express &&
      gasData.regular &&
      gasData.baseFeePerGas
    ) {
      return {
        baseFeePerGas: gasData.baseFeePerGas,
        instant: {
          ...gasData?.instant,
          maxFeePerGas: BigInt(gasData?.instant?.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(gasData?.instant?.maxPriorityFeePerGas),
        },
        express: {
          ...gasData?.express,
          maxFeePerGas: BigInt(gasData?.express?.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(gasData?.express?.maxPriorityFeePerGas),
        },
        regular: {
          ...gasData?.regular,
          maxFeePerGas: BigInt(gasData?.regular?.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(gasData?.regular?.maxPriorityFeePerGas),
        },
      }
    }
    return {}
  }
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
