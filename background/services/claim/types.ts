import { HexString } from "../../types"

export interface Eligible {
  index: HexString
  account: HexString
  amount: BigInt
  proof: HexString[]
}

export interface Claim {
  eligibles: Eligible[]
}
