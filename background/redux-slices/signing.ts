import { TypedDataField } from "@ethersproject/abstract-signer"
import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { BigNumber } from "ethers"
import { getEthereumNetwork } from "../lib/utils"
import { HexString } from "../types"
import { createBackgroundAsyncThunk } from "./utils"

export type TypedData = {
  domain: EIP712DomainType
  types: Record<string, TypedDataField[]>
  message: Record<string, unknown>
  primaryType: string
}

export type Events = {
  requestSignTypedData: {
    typedData: TypedData
    account: HexString
  }
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
  account: HexString
  liquidityTokenAddress: HexString
  liquidityAmount: BigNumber
  nonce: BigNumber
  deadline: BigNumber
}
const ROUTER_ADDRESS = "0x123"
export const signPermitRequest = createBackgroundAsyncThunk(
  "signing/signTypedData",
  async (data: PermitRequest) => {
    const { account, liquidityTokenAddress, liquidityAmount, nonce, deadline } =
      data
    const EIP712Domain = [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ]
    const domain = {
      name: "Tally LP Token",
      version: "1",
      chainId: Number(getEthereumNetwork().chainID),
      verifyingContract: liquidityTokenAddress,
    }
    const Permit = [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ]
    const message = {
      owner: account,
      spender: ROUTER_ADDRESS,
      value: liquidityAmount,
      nonce: nonce.toHexString(),
      deadline: deadline.toNumber(),
    }
    const permitRequest = {
      types: {
        EIP712Domain,
        Permit,
      },
      domain,
      primaryType: "Permit",
      message,
    } as TypedData
    await signingSliceEmitter.emit("requestSignTypedData", {
      typedData: permitRequest,
      account,
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
    }),
  },
})

export const { signedTypedData } = signingSlice.actions

export default signingSlice.reducer
