import { createSlice, createSelector } from "@reduxjs/toolkit"
import Emittery from "emittery"

import {
  BlockPrices,
  EIP1559TransactionRequest,
  SignedEVMTransaction,
} from "../networks"
import { createBackgroundAsyncThunk } from "./utils"

type TransactionConstruction = {
  signedTx: Partial<SignedEVMTransaction>
  transactionRequest: Partial<EIP1559TransactionRequest>
  gasEstimates: BlockPrices | null
}

export const initialState: TransactionConstruction = {
  signedTx: {},
  transactionRequest: {
    gasLimit: BigInt(21000), // 21,000 is the minimum amount of gas needed for sending a transaction
    maxFeePerGas: BigInt(21000),
    maxPriorityFeePerGas: BigInt(21000),
  },
  gasEstimates: null,
}

export const createTransaction = createBackgroundAsyncThunk(
  "transactionConstruction/createTransaction",
  async (transaction: Partial<EIP1559TransactionRequest>) => {
    // ! how to properly call chain servive to get a gasLimit, or should that be called in Send component since there is a gasLimit input?
    // transactionData.gasLimit = await chainService.estimateGasLimit(getEthereumNetwork(), transaction)
    //! how to call chain service to get gasPrice, is gasPrice in gwei? What is the difference between that and baseFeePerGas?
    //! price is also coming from gasEstimates from blocknative so do I even need to make the below call?
    // transactionData.gasPrice = await chainService.pollingProviders.ethereum.getGasPrice()

    return transaction
  }
)

export const signTransaction = createBackgroundAsyncThunk(
  "transactionConstruction/signTransaction",
  async (transaction: EIP1559TransactionRequest) => {
    //! how to call keyring service correctly to sign transaction?
    // const signedTx = keyringService.signTransaction(transaction.from, transaction)
    // return signedTx
    // TODO push the signed tx as pending somewhere?
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
      return { ...immerState, transactionRequest: { ...options } }
    },

    gasEstimates: (
      immerState,
      { payload: gasEstimates }: { payload: BlockPrices }
    ) => {
      return { ...immerState, gasEstimates }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      createTransaction.fulfilled,
      // ! correct typing
      (immerState, { payload }: { payload: any }) => {
        immerState.transactionRequest = payload
      }
    )
    builder.addCase(
      signTransaction.fulfilled,
      // ! correct typing
      (immerState, { payload }: { payload: any }) => {
        immerState.signedTx = payload
      }
    )
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

export const selectGasEstimates = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.gasEstimates,
  (gasData) => gasData
)

export const selectTransactionData = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction,
  (transactionRequest) => transactionRequest
)
