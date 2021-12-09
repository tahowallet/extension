// https://eips.ethereum.org/EIPS/eip-1193#request

export type RequestArgument = {
  readonly method: string
  readonly params?: Array<unknown>
}

export const PROVIDER_ERROR_CODES = {
  unknown: 4000, // This is not included in EIP-1193
  userRejectedRequest: 4001,
  unauthorized: 4100,
  unsupportedMethod: 4200,
  disconnected: 4900,
  chainDisconnected: 4901,
}

export class UserRejectedRequestError extends Error {
  code = 4001

  constructor(public data?: unknown) {
    super("The user rejected the request.")
  }
}

export class UnauthorizedError extends Error {
  code = 4100

  constructor(public data?: unknown) {
    super(
      "The requested method and/or account has not been authorized by the user."
    )
  }
}

export class UnsupportedMethodError extends Error {
  code = 4200

  constructor(public data?: unknown) {
    super("The Provider does not support the requested method.")
  }
}

export class DisconnectedError extends Error {
  // 4900 is intended to indicate that the Provider is disconnected from all chains
  code = 4900

  constructor(public data?: unknown) {
    super("The Provider is disconnected from all chains.")
  }
}

export class ChainDisconnectedError extends Error {
  // 4901 is intended to indicate that the Provider is disconnected from a specific chain only.
  // In other words, 4901 implies that the Provider is connected to other chains, just not the requested one.
  code = 4901

  constructor(public data?: unknown) {
    super("The Provider is not connected to the requested chain.")
  }
}
