import dayjs from "dayjs"
import { UniswapSignTypedDataAnnotation } from "./types"
import { ETHEREUM } from "../../constants"
import { SignTypedDataRequest } from "../signing/types"
import { truncateAddress } from "../../lib/utils"
import { SmartContractFungibleAsset } from "../../assets"

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
  signTypedDataRequest: SignTypedDataRequest,
  asset: SmartContractFungibleAsset | undefined
): UniswapSignTypedDataAnnotation {
  // If we have a corresponding asset - use known decimals to display a human-friendly
  // amount e.g. 10 USDC.  Otherwise just display the value e.g. 10000000
  const value = asset
    ? `${
        Number(signTypedDataRequest.typedData.message.value) /
        10 ** asset?.decimals
      } ${asset.symbol}`
    : (signTypedDataRequest.typedData.message.value as string)

  return {
    source: "uniswap",
    displayFields: {
      owner: signTypedDataRequest.typedData.message.owner as string,
      spender: signTypedDataRequest.typedData.message.spender as string,
      value,
      nonce: signTypedDataRequest.typedData.message.nonce as string,
      expiry: dayjs
        .unix(Number(signTypedDataRequest.typedData.message.deadline))
        .format("DD MMM YYYY"),
    },
  }
}
