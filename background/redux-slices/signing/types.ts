import { EnrichedSignTypedDataRequest } from "../../services/enrichment"
import { SigningMethod } from "../../services/signing/types"
import { EIP191Data, EIP712TypedData, HexString } from "../../types"

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

export type SigningState = {
  signedTypedData: string | undefined
  typedDataRequest: EnrichedSignTypedDataRequest | undefined

  signedData: string | undefined
  signDataRequest: SignDataRequest | undefined
}

export type EIP712DomainType = {
  name?: string
  version?: string
  chainId?: number
  verifyingContract?: HexString
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
