import eligibles from "../../static/eligibles.json"
import { toHexString } from "../../lib/utils/hex"
import type { Claim, Eligible } from "./types"

const defaultClaim: Claim = {
  eligibles: eligibles.map((item): Eligible => ({
    index: toHexString(item.index),
    account: toHexString(item.account),
    proof: item.proof.map(toHexString),
    amount: BigInt(item.amount),
  })),
}

export default defaultClaim
