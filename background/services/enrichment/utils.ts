import { UniswapSignTypedDataAnnotation } from "./types"
import { ETHEREUM } from "../../constants"
import { SignTypedDataRequest } from "../signing/types"
import { truncateAddress } from "../../lib/utils"

export const ENRICHABLE_CONTRACTS: { [k: string]: string } = {
  "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45": "Uniswap",
}

export function isUniswapSignTypedDataRequest(
  signTypedDataRequest: SignTypedDataRequest
): boolean {
  if (typeof signTypedDataRequest.typedData.message.spender === "string") {
    if (
      // Must be on main chain
      signTypedDataRequest.typedData.domain.chainId ===
        Number(ETHEREUM.chainID) &&
      // Must match Uniswap contract
      ENRICHABLE_CONTRACTS[signTypedDataRequest.typedData.message.spender] ===
        "Uniswap" &&
      // Must have all expected fields
      ["owner", "spender", "value", "nonce", "deadline"].every(
        (key) => key in signTypedDataRequest.typedData.message
      )
    ) {
      return true
    }
  }
  return false
}

export function enrichUniswapSignTypedDataRequest(
  signTypedDataRequest: SignTypedDataRequest
): UniswapSignTypedDataAnnotation {
  return {
    source: "uniswap",
    owner: truncateAddress(
      signTypedDataRequest.typedData.message.owner as string
    ),
    spender: truncateAddress(
      signTypedDataRequest.typedData.message.spender as string
    ),
    value: signTypedDataRequest.typedData.message.value as string,
    _assetName: signTypedDataRequest.typedData.domain.name,
    nonce: signTypedDataRequest.typedData.message.nonce as string,
    expiry: signTypedDataRequest.typedData.message.deadline as string,
  }
}
