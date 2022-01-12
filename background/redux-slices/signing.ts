import { TypedDataField } from "@ethersproject/abstract-signer"
import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { HexString } from "../types"
import { createBackgroundAsyncThunk } from "./utils"

export type TypedData = {
  from: HexString
  domain: EIP712DomainType
  types: Record<string, TypedDataField[]>
  value: Record<string, unknown>
}

export type Events = {
  requestSignTypedData: Partial<PermitRequest>
}

export const signingSliceEmitter = new Emittery<Events>()

export type Signing = {
  signedTypedData: string | undefined
}

export const initialState: Signing = {
  signedTypedData: undefined,
}

export type EIP712DomainType = {
  name?: string
  version?: string
  chainId?: number
  verifyingContract?: HexString
}

export type PermitRequest = {
  owner: HexString
  spender: HexString
  value: number
  nonce: number
  deadline: number
}

export const signPermitRequest = createBackgroundAsyncThunk(
  "signing/signTypedData",
  async (permitData: Partial<PermitRequest>) => {
    await signingSliceEmitter.emit("requestSignTypedData", permitData)
  }
)

const signingSlice = createSlice({
  name: "signing",
  initialState,
  reducers: {
    signedTypedData: (state, { payload }: { payload: string }) => ({
      ...state,
      signedTypedData: payload,
    }),
  },
})

export const { signedTypedData } = signingSlice.actions

export default signingSlice.reducer
