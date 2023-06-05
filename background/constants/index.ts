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
    minute: 0.1,
  },
}

export const SECOND = 1000
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

export const DEFAULT_COMMUNITY_MULTISIG_ADDRESS =
  "0x99b36fDbC582D113aF36A21EBa06BFEAb7b9bE12"

// TODO add correct addresses
export const COMMUNITY_MULTISIG_ADDRESS: Record<string, string> = {}

export enum EarnStages {
  ComingSoon = "ComingSoon",
  Deploying = "Deploying",
  PartialyLive = "PartialyLive",
  Live = "Live",
}

export * from "./assets"
export * from "./currencies"
export * from "./networks"
export * from "./base-assets"
