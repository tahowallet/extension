import type { HexString } from "../../types"

export type ReferrerStats = {
  bonusTotal: bigint
  referredUsers: number
}

export interface Eligible {
  index: HexString
  account: HexString
  amount: bigint
  proof: HexString[]
}

export interface Claim {
  eligibles: Eligible[]
}

export interface IPFSLinkItem {
  Hash: { "/": string }
  Name: string
  Tsize: number
}
