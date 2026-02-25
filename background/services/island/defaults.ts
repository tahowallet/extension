import eligibles from "../../static/eligibles.json"
import type { Claim, Eligible } from "./types"

const defaultClaim: Claim = {
  eligibles: eligibles.map(
    (item): Eligible => ({ ...item, amount: BigInt(item.amount) }),
  ),
}

export default defaultClaim
