/* eslint-disable import/prefer-default-export */
// source reference: https://github.com/pedrouid/json-rpc-tools/blob/master/packages/utils/src/error.ts

import { ErrorResponse } from "./types"

const PARSE_ERROR = "PARSE_ERROR"
const INVALID_REQUEST = "INVALID_REQUEST"
const METHOD_NOT_FOUND = "METHOD_NOT_FOUND"
const INVALID_PARAMS = "INVALID_PARAMS"
const INTERNAL_ERROR = "INTERNAL_ERROR"
const SERVER_ERROR = "SERVER_ERROR"

const RESERVED_ERROR_CODES = [-32700, -32600, -32601, -32602, -32603]
const SERVER_ERROR_CODE_RANGE = [-32000, -32099]

const STANDARD_ERROR_MAP: Record<string, ErrorResponse> = {
  [PARSE_ERROR]: { code: -32700, message: "Parse error" },
  [INVALID_REQUEST]: { code: -32600, message: "Invalid Request" },
  [METHOD_NOT_FOUND]: { code: -32601, message: "Method not found" },
  [INVALID_PARAMS]: { code: -32602, message: "Invalid params" },
  [INTERNAL_ERROR]: { code: -32603, message: "Internal error" },
  [SERVER_ERROR]: { code: -32000, message: "Server error" },
}

function isServerErrorCode(code: number): boolean {
  return (
    code <= SERVER_ERROR_CODE_RANGE[0] && code >= SERVER_ERROR_CODE_RANGE[1]
  )
}

function isReservedErrorCode(code: number): boolean {
  return RESERVED_ERROR_CODES.includes(code)
}

function getError(type: string): ErrorResponse {
  if (!Object.keys(STANDARD_ERROR_MAP).includes(type)) {
    return STANDARD_ERROR_MAP[INTERNAL_ERROR]
  }
  return STANDARD_ERROR_MAP[type]
}

function getErrorByCode(code: number): ErrorResponse {
  const match = Object.values(STANDARD_ERROR_MAP).find((e) => e.code === code)
  if (!match) {
    return STANDARD_ERROR_MAP[INTERNAL_ERROR]
  }
  return match
}

export function formatErrorMessage(
  error?: string | ErrorResponse
): ErrorResponse {
  let translatedError = error
  if (typeof translatedError === "undefined") {
    return getError(INTERNAL_ERROR)
  }
  if (typeof translatedError === "string") {
    translatedError = {
      ...getError(SERVER_ERROR),
      message: translatedError,
    }
  }
  if (isReservedErrorCode(translatedError.code)) {
    translatedError = getErrorByCode(translatedError.code)
  }
  if (!isServerErrorCode(translatedError.code)) {
    throw new Error("Error code is not in server code range")
  }
  return translatedError
}
