import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { FORK } from "../constants"
import {
  EXPRESS,
  INSTANT,
  MAX_FEE_MULTIPLIER,
  REGULAR,
} from "../constants/network-fees"
import { USE_MAINNET_FORK } from "../features"

import {
  BlockEstimate,
  BlockPrices,
  EIP1559TransactionRequest,
  EVMNetwork,
  isEIP1559TransactionRequest,
  LegacyEVMTransactionRequest,
  SignedTransaction,
  TransactionRequest,
} from "../networks"
import {
  EnrichedEVMTransactionSignatureRequest,
  EnrichedEVMTransactionRequest,
} from "../services/enrichment"

import { createBackgroundAsyncThunk } from "./utils"
import { SignOperation } from "./signing"

export const enum TransactionConstructionStatus {
  Idle = "idle",
  Pending = "pending",
  Loaded = "loaded",
  Signed = "signed",
}

export type NetworkFeeSettings = {
  feeType: NetworkFeeTypeChosen
  gasLimit: bigint | undefined
  suggestedGasLimit: bigint | undefined
  values: {
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
    baseFeePerGas?: bigint
  }
}

export enum NetworkFeeTypeChosen {
  Regular = "regular",
  Express = "express",
  Instant = "instant",
  Custom = "custom",
}
export type TransactionConstruction = {
  status: TransactionConstructionStatus
  transactionRequest?: EnrichedEVMTransactionRequest
  signedTransaction?: SignedTransaction
  broadcastOnSign?: boolean
  transactionLikelyFails?: boolean
  estimatedFeesPerGas: { [chainID: string]: EstimatedFeesPerGas | undefined }
  customFeesPerGas?: EstimatedFeesPerGas["custom"]
  lastGasEstimatesRefreshed: number
  feeTypeSelected: NetworkFeeTypeChosen
}

export type EstimatedFeesPerGas = {
  baseFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  maxFeePerGas?: bigint
  instant?: BlockEstimate
  express?: BlockEstimate
  regular?: BlockEstimate
  custom?: BlockEstimate
}

const defaultCustomGas = {
  maxFeePerGas: 0n,
  maxPriorityFeePerGas: 0n,
  confidence: 0,
}

export const initialState: TransactionConstruction = {
  status: TransactionConstructionStatus.Idle,
  feeTypeSelected: NetworkFeeTypeChosen.Regular,
  estimatedFeesPerGas: {},
  customFeesPerGas: defaultCustomGas,
  lastGasEstimatesRefreshed: Date.now(),
}

export type Events = {
  updateTransaction: EnrichedEVMTransactionSignatureRequest
  requestSignature: SignOperation<TransactionRequest>
  signatureRejected: never
  broadcastSignedTransaction: SignedTransaction
}

export type GasOption = {
  confidence: string
  estimatedSpeed: string
  type: NetworkFeeTypeChosen
  estimatedGwei: string
  maxPriorityGwei: string
  maxGwei: string
  dollarValue: string
  estimatedFeePerGas: bigint // wei
  baseMaxFeePerGas: bigint // wei
  baseMaxGwei: string
  maxFeePerGas: bigint // wei
  maxPriorityFeePerGas: bigint // wei
}

export const emitter = new Emittery<Events>()

const makeBlockEstimate = (
  type: number,
  estimatedFeesPerGas: BlockPrices
): BlockEstimate => {
  let maxFeePerGas = estimatedFeesPerGas.estimatedPrices.find(
    (el) => el.confidence === type
  )?.maxFeePerGas

  if (typeof maxFeePerGas === "undefined") {
    // Fallback
    maxFeePerGas = estimatedFeesPerGas.baseFeePerGas
  }

  // Exaggerate differences between options
  maxFeePerGas = (maxFeePerGas * MAX_FEE_MULTIPLIER[type]) / 10n

  return {
    maxFeePerGas,
    confidence: type,
    maxPriorityFeePerGas:
      estimatedFeesPerGas.estimatedPrices.find((el) => el.confidence === type)
        ?.maxPriorityFeePerGas ?? 0n,
    price:
      estimatedFeesPerGas.estimatedPrices.find((el) => el.confidence === type)
        ?.price ?? 0n,
  }
}

// Async thunk to pass transaction options from the store to the background via an event
export const updateTransactionData = createBackgroundAsyncThunk(
  "transaction-construction/update-transaction",
  async (options: EnrichedEVMTransactionSignatureRequest) => {
    await emitter.emit("updateTransaction", options)
  }
)

export const signTransaction = createBackgroundAsyncThunk(
  "transaction-construction/sign",
  async (
    request: SignOperation<
      EIP1559TransactionRequest | LegacyEVMTransactionRequest
    >
  ) => {
    if (USE_MAINNET_FORK) {
      request.request.chainID = FORK.chainID
    }

    await emitter.emit("requestSignature", request)
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
          transactionRequest: TransactionRequest
          transactionLikelyFails: boolean
        }
      }
    ) => {
      const newState = {
        ...state,
        status: TransactionConstructionStatus.Loaded,
        signedTransaction: undefined,
        transactionRequest: {
          ...transactionRequest,
        },
        transactionLikelyFails,
      }

      if (
        // We use two guards here to satisfy the compiler but due to the spread
        // above we know that if one is an EIP1559 then the other one must be too
        isEIP1559TransactionRequest(newState.transactionRequest) &&
        isEIP1559TransactionRequest(transactionRequest)
      ) {
        const estimatedMaxFeePerGas =
          state.estimatedFeesPerGas?.[transactionRequest.network.chainID]?.[
            state.feeTypeSelected
          ]?.maxFeePerGas

        newState.transactionRequest.maxFeePerGas =
          estimatedMaxFeePerGas ?? transactionRequest.maxFeePerGas

        const estimatedMaxPriorityFeePerGas =
          state.estimatedFeesPerGas?.[transactionRequest.network.chainID]?.[
            state.feeTypeSelected
          ]?.maxPriorityFeePerGas

        newState.transactionRequest.maxPriorityFeePerGas =
          estimatedMaxPriorityFeePerGas ??
          transactionRequest.maxPriorityFeePerGas
      }

      return newState
    },
    clearTransactionState: (
      state,
      { payload }: { payload: TransactionConstructionStatus }
    ) => ({
      estimatedFeesPerGas: state.estimatedFeesPerGas,
      lastGasEstimatesRefreshed: state.lastGasEstimatesRefreshed,
      status: payload,
      feeTypeSelected: state.feeTypeSelected ?? NetworkFeeTypeChosen.Regular,
      broadcastOnSign: false,
      signedTransaction: undefined,
      customFeesPerGas: state.customFeesPerGas,
    }),
    setFeeType: (
      immerState,
      { payload }: { payload: NetworkFeeTypeChosen }
    ) => {
      immerState.feeTypeSelected = payload

      if (immerState.transactionRequest) {
        const selectedFeesPerGas =
          immerState.estimatedFeesPerGas?.[
            immerState.transactionRequest.network.chainID
          ]?.[immerState.feeTypeSelected] ?? immerState.customFeesPerGas

        immerState.transactionRequest = {
          ...immerState.transactionRequest,
        }

        if (
          immerState.transactionRequest &&
          isEIP1559TransactionRequest(immerState.transactionRequest)
        ) {
          immerState.transactionRequest.maxFeePerGas =
            selectedFeesPerGas?.maxFeePerGas ??
            immerState.transactionRequest.maxFeePerGas

          immerState.transactionRequest.maxFeePerGas =
            selectedFeesPerGas?.maxPriorityFeePerGas ??
            immerState.transactionRequest.maxPriorityFeePerGas
        }
      }
    },

    signed: (state, { payload }: { payload: SignedTransaction }) => ({
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
      {
        payload: { estimatedFeesPerGas, network },
      }: { payload: { estimatedFeesPerGas: BlockPrices; network: EVMNetwork } }
    ) => {
      immerState.estimatedFeesPerGas = {
        ...(immerState.estimatedFeesPerGas ?? {}),
        [network.chainID]: {
          baseFeePerGas: estimatedFeesPerGas.baseFeePerGas,
          instant: makeBlockEstimate(INSTANT, estimatedFeesPerGas),
          express: makeBlockEstimate(EXPRESS, estimatedFeesPerGas),
          regular: makeBlockEstimate(REGULAR, estimatedFeesPerGas),
        },
      }
      immerState.lastGasEstimatesRefreshed = Date.now()
    },
    setCustomGas: (
      immerState,
      {
        payload: { maxPriorityFeePerGas, maxFeePerGas },
      }: {
        payload: {
          maxPriorityFeePerGas: bigint
          maxFeePerGas: bigint
        }
      }
    ) => {
      immerState.customFeesPerGas = {
        maxPriorityFeePerGas,
        maxFeePerGas,
        confidence: 0,
      }
    },
    clearCustomGas: (immerState) => {
      immerState.customFeesPerGas = defaultCustomGas
    },
  },
  extraReducers: (builder) => {
    builder.addCase(updateTransactionData.pending, (immerState) => {
      immerState.status = TransactionConstructionStatus.Pending
      immerState.signedTransaction = undefined
    })
  },
})

export const {
  transactionRequest,
  clearTransactionState,
  transactionLikelyFails,
  broadcastOnSign,
  signed,
  setFeeType,
  estimatedFeesPerGas,
  setCustomGas,
  clearCustomGas,
} = transactionSlice.actions

export default transactionSlice.reducer

export const broadcastSignedTransaction = createBackgroundAsyncThunk(
  "transaction-construction/broadcast",
  async (transaction: SignedTransaction) => {
    await emitter.emit("broadcastSignedTransaction", transaction)
  }
)

export const transactionSigned = createBackgroundAsyncThunk(
  "transaction-construction/transaction-signed",
  async (transaction: SignedTransaction, { dispatch, getState }) => {
    await dispatch(signed(transaction))

    const { transactionConstruction } = getState() as {
      transactionConstruction: TransactionConstruction
    }

    if (transactionConstruction.broadcastOnSign ?? false) {
      await dispatch(broadcastSignedTransaction(transaction))
    }
  }
)

export const rejectTransactionSignature = createBackgroundAsyncThunk(
  "transaction-construction/reject",
  async (_, { dispatch }) => {
    await emitter.emit("signatureRejected")
    // Provide a clean slate for future transactions.
    dispatch(
      transactionSlice.actions.clearTransactionState(
        TransactionConstructionStatus.Idle
      )
    )
  }
)
