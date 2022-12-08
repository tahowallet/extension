import {
  formatJsonRpcError,
  formatJsonRpcResult,
  JsonRpcError,
  JsonRpcResult,
} from "@json-rpc-tools/utils"
import { SignClientTypes } from "@walletconnect/types"

export function approveEIP155Request(
  requestEvent: SignClientTypes.EventArguments["session_request"],
  signedMessage: string
): JsonRpcResult<any> {
  const { params, id } = requestEvent
  const { request } = params

  switch (request.method) {
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
  request: SignClientTypes.EventArguments["session_request"]
): JsonRpcError {
  const { id } = request

  return formatJsonRpcError(id, "JSONRPC_REQUEST_METHOD_REJECTED")
}
