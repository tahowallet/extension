export const STATE_KEY = "tally"

export const NETWORK_TYPES = {
  ethereum: "ethereum",
}

export const TRANSPORT_TYPES = {
  ws: "ws",
  http: "http",
}

export const ALARMS = {
  block: "block",
  minute: "minute",
  times: {
    block: 0.13,
    minute: 1,
  },
}

export const CONTENT_BACKGROUND_PORT = "content<->background"

export * from "./currencies"
export * from "./networks"
