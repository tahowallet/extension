import eligibles from "../../static/eligibles.json"
import { Claim, Eligible } from "./types"

const defaultClaim: Claim = {
  eligibles: eligibles.map((item): Eligible => {
    return { ...item, earnings: BigInt(item.earnings) }
  }),
}

export default defaultClaim
