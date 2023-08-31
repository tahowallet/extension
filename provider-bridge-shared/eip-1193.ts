// https://eips.ethereum.org/EIPS/eip-1193#request

import { isNumber, isObject, isString } from "./runtime-typechecks"

export type RequestArgument = {
  readonly method: string
  readonly params?: Array<unknown>
}

export const EIP1193_ERROR_CODES = {
  userRejectedRequest: {
    code: 4001,
    message: "The user rejected the request.",
  },
  unauthorized: {
    code: 4100,
    message:
      "The requested method and/or account has not been authorized by the user.",
  },
  unsupportedMethod: {
    code: 4200,
    message: "The Provider does not support the requested method.",
  },
  disconnected: {
    // 4900 is intended to indicate that the Provider is disconnected from all chains
    code: 4900,
    message: "The Provider is disconnected from all chains.",
  },
  chainDisconnected: {
    // 4901 is intended to indicate that the Provider is disconnected from a specific chain only.
    // In other words, 4901 implies that the Provider is connected to other chains, just not the requested one.
    code: 4901,
    message: "The Provider is not connected to the requested chain.",
  },
} as const

export type EIP1193ErrorPayload =
  (typeof EIP1193_ERROR_CODES)[keyof typeof EIP1193_ERROR_CODES] & {
    data?: unknown
  }

export type EIP1193ErrorCodeNumbers = Pick<
  (typeof EIP1193_ERROR_CODES)[keyof typeof EIP1193_ERROR_CODES],
  "code"
>
export class EIP1193Error extends Error {
  constructor(public eip1193Error: EIP1193ErrorPayload) {
    super(eip1193Error.message)
  }

  toJSON(): unknown {
    return this.eip1193Error
  }
}

export function isEIP1193ErrorCodeNumber(
  code: unknown,
): code is EIP1193ErrorCodeNumbers {
  return (
    isNumber(code) &&
    Object.values(EIP1193_ERROR_CODES)
      .map((e) => e.code as number)
      .includes(code)
  )
}

export function isEIP1193Error(arg: unknown): arg is EIP1193ErrorPayload {
  return (
    isObject(arg) &&
    isNumber(arg.code) &&
    isEIP1193ErrorCodeNumber(arg.code) &&
    isString(arg.message)
  )
}
