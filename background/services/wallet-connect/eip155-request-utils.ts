import { SignClientTypes } from "@walletconnect/types"
import {
  EIP1193Error,
  EIP1193_ERROR_CODES,
} from "@tallyho/provider-bridge-shared"
import {
  formatJsonRpcError,
  formatJsonRpcResult,
  JsonRpcError,
  JsonRpcResult,
} from "@json-rpc-tools/utils"
import { TranslatedRequestParams } from "./types"

export function approveEIP155Request(
  request: TranslatedRequestParams,
  signedMessage: string
): JsonRpcResult<any> {
  const { id, method } = request

  switch (method) {
    case "eth_sign":
    case "personal_sign":
    case "eth_signTransaction":
    case "eth_sendTransaction":
      return formatJsonRpcResult(id, signedMessage)

    default:
      throw new Error("UNKNOWN_JSONRPC_METHOD")
  }
}

export function rejectEIP155Request(
  request: TranslatedRequestParams
): JsonRpcError {
  const { id } = request

  return formatJsonRpcError(id, "JSONRPC_REQUEST_METHOD_REJECTED")
}

export function processRequestParams(
  event: SignClientTypes.EventArguments["session_request"]
): TranslatedRequestParams {
  // TODO: figure out if this method is needed
  const { id, params: eventParams, topic } = event
  // TODO: handle chain id
  const { request } = eventParams

  switch (request.method) {
    case "eth_sign":
    case "personal_sign":
    case "eth_sendTransaction":
    case "eth_signTransaction":
      return {
        id,
        topic,
        method: request.method,
        params: request.params,
      }
    default:
      throw new EIP1193Error(EIP1193_ERROR_CODES.unsupportedMethod)
  }
}
