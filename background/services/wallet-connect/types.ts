import { RPCRequest } from "@tallyho/provider-bridge-shared"

export interface TranslatedRequestParams {
  id: number
  topic: string
  method: string
  params: RPCRequest["params"]
}

export interface ErrorResponse {
  code: number
  message: string
  data?: string
}
export interface JsonRpcError {
  id: number
  jsonrpc: string
  error: ErrorResponse
}

export interface JsonRpcResult<T = unknown> {
  id: number
  jsonrpc: string
  result: T
}
