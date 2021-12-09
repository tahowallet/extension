// @ts-nocheck
export const WINDOW_PROVIDER_FLAG = "isTallyWindowProviderEnabled"

export const WINDOW_PROVIDER_TARGET = "tally-window-provider"
export const PROVIDER_BRIDGE_TARGET = "tally-provider-bridge"

export const EXTERNAL_PORT_NAME = "tally-external"
export const INTERNAL_PORT_NAME = "tally-internal"

export type WindowResponseEvent = {
  origin: string
  source: unknown
  data: { id: string; target: string; result: unknown }
}
export type RPCRequest = {
  method: string
  params: Array<unknown> // This typing is required by ethers.js but is not EIP-1193 compatible
}

export type WindowRequestEvent = {
  id: string
  target: unknown
  request: RPCRequest
}

export type PortResponseEvent = {
  id: string
  result: unknown
}

export type PortRequestEvent = {
  id: string
  request: RPCRequest
}

export type ProviderTransport = WindowTransport | PortTransport

export type WindowListener = (event: WindowResponseEvent) => void

export type WindowTransport = {
  postMessage: (data: WindowRequestEvent) => void
  addEventListener: (listener: WindowListener) => void
  removeEventListener: (listener: WindowListener) => void
  origin: string
}

export type PortListenerFn = (callback: unknown, ...params: unknown[]) => void
export type PortListener = (listener: PortListenerFn) => void
export type PortTransport = {
  postMessage: (data: unknown) => void
  addEventListener: PortListener
  removeEventListener: PortListener
  origin: string
}

// https://eips.ethereum.org/EIPS/eip-1193#request
export type RequestArgument = {
  readonly method: string
  readonly params?: Array<unknown>
}

export type EthersSendCallback = (error: unknown, response: unknown) => void

export const PROVIDER_ERROR_CODES = {
  unknown: 4000, // This is not included in EIP-1193
  userRejectedRequest: 4001,
  unauthorized: 4100,
  unsupportedMethod: 4200,
  disconnected: 4900,
  chainDisconnected: 4901,
}

// linter wants Error instance when throwing so a custom Error class is required
export class ProviderRPCError extends Error {
  constructor(
    public message: string,
    public code: number = PROVIDER_ERROR_CODES.unknown,
    public data?: unknown
  ) {
    super(message)
  }
}

export function getType(arg: unknown) {
  return Object.prototype.toString.call(arg).slice("[object ".length, -1)
}

export function isObject(
  arg: unknown
): arg is Record<string | number | symbol, unknown> {
  return getType(arg) === "Object"
}

export function isArray(arg: unknown): arg is Array<unknown> {
  return getType(arg) === "Array"
}

export function isUndefined(arg: unknown): arg is undefined {
  return typeof arg === "undefined"
}

export function isString(arg: unknown): arg is string {
  return getType(arg) === "String"
}

export function isMessageEvent(arg: unknown): arg is MessageEvent {
  return getType(arg) === "MessageEvent"
}

export function isRPCRequestParamsType(
  arg: unknown
): arg is RPCRequest["params"] {
  return isObject(arg) || isArray(arg)
}

export function isWindowResponseEvent(
  arg: unknown
): arg is WindowResponseEvent {
  return (
    isMessageEvent(arg) &&
    isString(arg.origin) &&
    !isUndefined(arg.source) &&
    isObject(arg.data) &&
    isString(arg.data.id) &&
    isString(arg.data.target) &&
    !isUndefined(arg.data.result)
  )
}

export function isPortResponseEvent(arg: unknown): arg is PortResponseEvent {
  return isObject(arg) && isString(arg.id) && !isUndefined(arg.result)
}
