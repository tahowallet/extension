import { createSelector, createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { SiweMessage } from "siwe"
import { EIP191Data, EIP712TypedData, HexString } from "../types"
import { createBackgroundAsyncThunk } from "./utils"

export enum SignDataMessageType {
  EIP191 = 0,
  EIP4361 = 1,
}

// can add more types to this in the future
export type ExpectedSigningData = EIP191Data | EIP4361Data

export type Events = {
  requestSignTypedData: {
    typedData: EIP712TypedData
    account: HexString
    signingMethod: SigningMethod
  }
  requestSignData: {
    signingData: ExpectedSigningData
    messageType: SignDataMessageType
    rawSigningData: string
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

  signedData: string | undefined
  signDataRequest: SignDataRequest | undefined
}

export const initialState: SigningState = {
  typedDataRequest: undefined,
  signedTypedData: undefined,

  signedData: undefined,
  signDataRequest: undefined,
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
}

// spec found https://eips.ethereum.org/EIPS/eip-4361
export interface EIP4361Data {
  domain: string
  address: string
  version: string
  chainId: number
  nonce: string
  expiration?: string
  statement?: string
}

export type SignDataRequest = {
  account: string
  rawSigningData: string
  signingData: ExpectedSigningData
  messageType: SignDataMessageType
}

export interface SignOperation<T> {
  request: T
  signingMethod: SigningMethod
}

export const signTypedData = createBackgroundAsyncThunk(
  "signing/signTypedData",
  async (data: SignOperation<SignTypedDataRequest>) => {
    const {
      request: { account, typedData },
      signingMethod,
    } = data

    await signingSliceEmitter.emit("requestSignTypedData", {
      typedData,
      account,
      signingMethod,
    })
  }
)

export const signData = createBackgroundAsyncThunk(
  "signing/signData",
  async (data: SignOperation<SignDataRequest>) => {
    const {
      request: { account, signingData, rawSigningData, messageType },
      signingMethod,
    } = data
    await signingSliceEmitter.emit("requestSignData", {
      rawSigningData,
      signingData,
      account,
      messageType,
      signingMethod,
    })
  }
)

const checkEIP4361: (message: string) => EIP4361Data | undefined = (
  message
) => {
  try {
    const siweMessage = new SiweMessage(message)
    return {
      domain: siweMessage.domain,
      address: siweMessage.address,
      statement: siweMessage.statement,
      version: siweMessage.version,
      chainId: siweMessage.chainId,
      expiration: siweMessage.expirationTime,
      nonce: siweMessage.nonce,
    }
  } catch (err) {
    // console.error(err)
  }

  return undefined
}

/**
 * Takes a string and parses the string into a ExpectedSigningData Type
 *
 * EIP4361 standard can be found https://eips.ethereum.org/EIPS/eip-4361
 */
export const parseSigningData: (signingData: string) => {
  data: ExpectedSigningData
  type: SignDataMessageType
} = (signingData) => {
  const data = checkEIP4361(signingData)
  if (data) {
    return {
      data,
      type: SignDataMessageType.EIP4361,
    }
  }

  // data = checkOtherType(lines)
  // if (!!data) {
  // return data
  // }

  // add additional checks for any other types to add in the future
  return {
    data: signingData,
    type: SignDataMessageType.EIP191,
  }
}

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
    signDataRequest: (state, { payload }: { payload: SignDataRequest }) => {
      return {
        ...state,
        signDataRequest: payload,
      }
    },
    signedData: (state, { payload }: { payload: string }) => ({
      ...state,
      signedData: payload,
      signDataRequest: undefined,
    }),
    clearSigningState: (state) => ({
      ...state,
      typedDataRequest: undefined,
      signDataRequest: undefined,
    }),
  },
})

export const {
  signedTypedData,
  typedDataRequest,
  signedData,
  signDataRequest,
  clearSigningState,
} = signingSlice.actions

export default signingSlice.reducer

export const selectTypedData = createSelector(
  (state: { signing: SigningState }) => state.signing.typedDataRequest,
  (signTypes) => signTypes
)

export const selectSigningData = createSelector(
  (state: { signing: SigningState }) => state.signing.signDataRequest,
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
