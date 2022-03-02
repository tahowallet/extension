import { createSelector, createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { EIP712TypedData, HexString } from "../types"
import { createBackgroundAsyncThunk } from "./utils"

export type Events = {
  requestSignTypedData: {
    typedData: EIP712TypedData
    account: HexString
    signingMethod: SigningMethod
  }
  signatureRejected: never
}

export type SigningMethod =
  | { type: "keyring" }
  | { type: "ledger"; deviceID: string; path: string }

export const signingSliceEmitter = new Emittery<Events>()

export type SigningState = {
  signedTypedData: string | undefined
  typedDataRequest: SignTypedDataRequest | undefined
}

export const initialState: SigningState = {
  typedDataRequest: undefined,
  signedTypedData: undefined,
}

export type EIP712DomainType = {
  name?: string
  version?: string
  chainId?: number
  verifyingContract?: HexString
}

export type SignTypedDataRequest = {
  account: string
  typedData: EIP712TypedData
  signingMethod: SigningMethod
}

export const signTypedData = createBackgroundAsyncThunk(
  "signing/signTypedData",
  async (data: SignTypedDataRequest) => {
    const { account, typedData, signingMethod } = data

    await signingSliceEmitter.emit("requestSignTypedData", {
      typedData,
      account,
      signingMethod,
    })
  }
)

const signingSlice = createSlice({
  name: "signing",
  initialState,
  reducers: {
    signedTypedData: (state, { payload }: { payload: string }) => ({
      ...state,
      signedTypedData: payload,
      typedDataRequest: undefined,
    }),
    typedDataRequest: (
      state,
      { payload }: { payload: SignTypedDataRequest }
    ) => ({
      ...state,
      typedDataRequest: payload,
    }),
    clearSigningState: (state) => ({
      ...state,
      typedDataRequest: undefined,
    }),
  },
})

export const { signedTypedData, typedDataRequest, clearSigningState } =
  signingSlice.actions

export default signingSlice.reducer

export const selectTypedData = createSelector(
  (state: { signing: SigningState }) => state.signing.typedDataRequest,
  (signTypes) => signTypes
)

export const rejectDataSignature = createBackgroundAsyncThunk(
  "signing/reject",
  async (_, { dispatch }) => {
    await signingSliceEmitter.emit("signatureRejected")
    // Provide a clean slate for future transactions.
    dispatch(signingSlice.actions.clearSigningState())
  }
)
