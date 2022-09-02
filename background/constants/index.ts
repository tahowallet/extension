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

export const COMMUNITY_MULTISIG_ADDRESS =
  "0x99b36fDbC582D113aF36A21EBa06BFEAb7b9bE12"

// We can't use destructuring because webpack has to replace all instances of
// `process.env` variables in the bundled output
export const ALCHEMY_KEY = process.env.ALCHEMY_KEY // eslint-disable-line prefer-destructuring

export enum EarnStages {
  ComingSoon = "ComingSoon",
  Deploying = "Deploying",
  PartialyLive = "PartialyLive",
  Live = "Live",
}

export * from "./assets"
export * from "./currencies"
export * from "./networks"
