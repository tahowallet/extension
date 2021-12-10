export * from "./constants"
export * from "./eip-1193"

export type PermissionRequest = {
  url: string
  favIconUrl: string
  title: string
  state: "request" | "allow" | "deny"
}

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

export type EthersSendCallback = (error: unknown, response: unknown) => void

export function getType(arg: unknown) {
  return Object.prototype.toString.call(arg).slice("[object ".length, -1)
}

export function isObject(
  arg: unknown
): arg is Record<string | number | symbol, unknown> {
  return getType(arg) === "Object"
}

export function isArray(arg: unknown): arg is Array<unknown> {
  return Array.isArray(arg)
}

export function isUndefined(arg: unknown): arg is undefined {
  return typeof arg === "undefined"
}

export function isString(arg: unknown): arg is string {
  return getType(arg) === "String"
}

export function isNumber(arg: unknown): arg is number {
  return getType(arg) === "Number"
}

export function isMessageEvent(arg: unknown): arg is MessageEvent {
  return arg instanceof MessageEvent
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

export const ALLOWED_QUERY_PARAM_PAGE = {
  permissions: "/permission",
  signTransaction: "/signTransaction",
  dappConnect: "/dapp-connect",
} as const

export type AllowedQueryParamPage =
  typeof ALLOWED_QUERY_PARAM_PAGE[keyof typeof ALLOWED_QUERY_PARAM_PAGE]

export function isAllowedQueryParamPage(
  url: unknown
): url is AllowedQueryParamPage {
  // The typing for Array.includes in `lib.es.2016.array.include.ts` does not make any sense -> Object.values<string>
  // interface Array<T> { ... includes(searchElement: T, fromIndex?: number): boolean; ...
  return Object.values<unknown>(ALLOWED_QUERY_PARAM_PAGE).includes(url)
}
