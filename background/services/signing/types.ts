import { EIP712TypedData } from "../../types"

export type SignTypedDataRequest = {
  account: string
  typedData: EIP712TypedData
  signingMethod: SigningMethod
}

export type SigningMethod =
  | { type: "keyring" }
  | { type: "ledger"; deviceID: string; path: string }
