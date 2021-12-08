import {
  PortResponseEvent,
  WindowResponseEvent,
  RPCRequest,
} from "@tallyho/provider-bridge-shared"

export function isObject(
  arg: unknown
): arg is Record<string | number | symbol, unknown> {
  return Object.prototype.toString.call(arg) === "[object Object]"
}

export function isArray(arg: unknown): arg is Array<unknown> {
  return Object.prototype.toString.call(arg) === "[object Array]"
}

export function isUndefined(arg: unknown): arg is undefined {
  return typeof arg === "undefined"
}

export function isString(arg: unknown): arg is string {
  return Object.prototype.toString.call(arg) === "[object String]"
}

export function isRPCRequestParamsType(
  arg: unknown
): arg is RPCRequest["params"] {
  return isObject(arg) || isArray(arg) || isUndefined(arg)
}

export function isWindowResponseEvent(
  arg: unknown
): arg is WindowResponseEvent {
  return (
    isObject(arg) &&
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
