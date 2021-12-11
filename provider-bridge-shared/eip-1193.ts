// https://eips.ethereum.org/EIPS/eip-1193#request

export type RequestArgument = {
  readonly method: string
  readonly params?: Array<unknown>
}

export const EIP1193_ERROR = {
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
}

export class EIP1193Error extends Error {
  constructor(
    public eip1193Error: { code: number; message: string },
    public data?: unknown
  ) {
    super(eip1193Error.message)
  }

  toJSON() {
    return {
      code: this.eip1193Error.code,
      message: this.eip1193Error.message,
      data: this.data,
    }
  }
}

export function isEIP1193ErrorCode(code: number) {
  return Object.values(EIP1193Error)
    .map((e) => e.code)
    .includes(code)
}
