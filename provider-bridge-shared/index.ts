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

export type PortResponseEvent = {
  id: string
  result: unknown
}

export type ProviderTransport = WindowTransport | PortTransport

export type WindowListener = Window["addEventListener"]
export type WindowTransport = {
  postMessage: (data: unknown) => void
  addEventListener: WindowListener
  removeEventListener: WindowListener
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
