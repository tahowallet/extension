import eligibles from "../../static/eligibles.json"
import { Claim, Eligible } from "./types"

const defaultClaim: Claim = {
  eligibles: eligibles.map((item): Eligible => {
    return { ...item, amount: BigInt(item.amount) }
  }),
}

export default defaultClaim
