import dayjs from "dayjs"
import { UniswapSignTypedDataAnnotation } from "./types"
import { ETHEREUM } from "../../constants"
import { SignTypedDataRequest } from "../signing/types"
import { SmartContractFungibleAsset } from "../../assets"
import { NameService } from ".."

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

export async function enrichUniswapSignTypedDataRequest(
  signTypedDataRequest: SignTypedDataRequest,
  nameService: NameService,
  asset: SmartContractFungibleAsset | undefined
): Promise<UniswapSignTypedDataAnnotation> {
  // If we have a corresponding asset - use known decimals to display a human-friendly
  // amount e.g. 10 USDC.  Otherwise just display the value e.g. 10000000
  const value = asset
    ? `${
        Number(signTypedDataRequest.typedData.message.value) /
        10 ** asset?.decimals
      } ${asset.symbol}`
    : (signTypedDataRequest.typedData.message.value as string)

  const { owner, spender, nonce } = signTypedDataRequest.typedData.message as {
    [key: string]: string
  }

  const [ownerName, spenderName] = await Promise.all([
    await nameService.lookUpName(owner, ETHEREUM, false),
    await nameService.lookUpName(spender, ETHEREUM, false),
  ])

  return {
    source: "uniswap",
    displayFields: {
      owner: ownerName ?? owner,
      spender: spenderName ?? spender,
      value,
      nonce,
      expiry: dayjs
        .unix(Number(signTypedDataRequest.typedData.message.deadline))
        .format("DD MMM YYYY"),
    },
  }
}
