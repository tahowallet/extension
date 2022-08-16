import { TypedDataField } from "@ethersproject/abstract-signer"
import { hexlify, toUtf8Bytes, toUtf8String } from "ethers/lib/utils"
import { SiweMessage } from "siwe"
import { AddressOnNetwork } from "../accounts"

import { EIP191Data, EIP712TypedData, HexString } from "../types"

export type EIP712DomainType = {
  name?: string
  version?: string
  chainId?: number | string
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

export type SignTypedDataRequest = {
  account: AddressOnNetwork
  typedData: EIP712TypedData
}

export type ExpectedSigningData = EIP191Data | EIP4361Data

export type SignDataRequest = {
  account: AddressOnNetwork
  rawSigningData: string
  signingData: ExpectedSigningData
  messageType: SignDataMessageType
}

export enum SignDataMessageType {
  EIP191 = 0,
  EIP4361 = 1,
}

type EIP2612Message = {
  owner: HexString
  spender: HexString
  value: number
  nonce: number
  deadline: number
}

export type EIP2612TypedData = {
  domain: EIP712DomainType
  types: Record<string, TypedDataField[]>
  message: EIP2612Message
  primaryType: "Permit"
  // FIXME Add network info.
}

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
  let normalizedData = signingData

  // Attempt to normalize hex signing data to a UTF-8 string message. If the
  // signing data is <= 32 bytes long, assume it's a hash or other short data
  // that need not be normalized to a regular UTF-8 string.
  if (signingData.startsWith("0x") && signingData.length > 66) {
    let possibleMessageString: string | undefined
    try {
      possibleMessageString = toUtf8String(signingData)
      // Below, if the signing data is not a valid UTF-8 string, we move on
      // with an undefined possibleMessageString.
      // eslint-disable-next-line no-empty
    } catch (err) {}

    // If the hex was parsable as UTF-8 and re-converting to bytes in a hex
    // string produces the identical output, accept it as a valid string and
    // set the interpreted data to the UTF-8 string.
    if (
      possibleMessageString !== undefined &&
      hexlify(toUtf8Bytes(possibleMessageString)) === signingData.toLowerCase()
    ) {
      normalizedData = possibleMessageString
    }
  }

  const data = checkEIP4361(normalizedData)
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
    data: normalizedData,
    type: SignDataMessageType.EIP191,
  }
}
