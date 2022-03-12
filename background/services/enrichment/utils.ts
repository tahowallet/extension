import dayjs from "dayjs"
import { EIP2612SignTypedDataAnnotation } from "./types"
import { ETHEREUM } from "../../constants"
import { SignTypedDataRequest } from "../signing/types"
import { SmartContractFungibleAsset } from "../../assets"
import NameService from "../name"

export const ENRICHABLE_CONTRACT_NAMES: { [contractAddress: string]: string } =
  {
    // Uniswap v2 Router
    "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45": "🦄 Uniswap",
  }

export function isEIP2612SignTypedDataRequest(
  signTypedDataRequest: SignTypedDataRequest
): boolean {
  if (typeof signTypedDataRequest.typedData.message.spender === "string") {
    if (
      // Must be on main chain
      signTypedDataRequest.typedData.domain.chainId ===
        Number(ETHEREUM.chainID) &&
      // Must be a recognized contract (Not necessarily a
      // required check).  Do we want to still format the data
      // when the message matches EIP-2612 and maybe display something
      // like "Unrecognized Dapp" instead of the dapp name?
      !!ENRICHABLE_CONTRACT_NAMES[
        signTypedDataRequest.typedData.message.spender
      ] &&
      // Must have all expected fields
      // @TODO use AJV validation
      ["owner", "spender", "value", "nonce", "deadline"].every(
        (key) => key in signTypedDataRequest.typedData.message
      )
    ) {
      return true
    }
  }
  return false
}

export async function enrichEIP2612SignTypedDataRequest(
  signTypedDataRequest: SignTypedDataRequest,
  nameService: NameService,
  asset: SmartContractFungibleAsset | undefined
): Promise<EIP2612SignTypedDataAnnotation> {
  const { message, domain } = signTypedDataRequest.typedData
  const { value } = message
  // If we have a corresponding asset - use known decimals to display a human-friendly
  // amount e.g. 10 USDC.  Otherwise just display the value e.g. 10000000
  const formattedValue = asset
    ? `${Number(value) / 10 ** asset?.decimals} ${asset.symbol}`
    : (value as string)

  // We only need to add the token if we're not able to properly format the value above
  const token = formattedValue === value ? domain.name : null

  const { owner, spender, nonce } = message as {
    [key: string]: string
  }

  const [ownerName, spenderName] = await Promise.all([
    await nameService.lookUpName(owner, ETHEREUM, false),
    await nameService.lookUpName(spender, ETHEREUM, false),
  ])

  return {
    type: "EIP-2612",
    source: ENRICHABLE_CONTRACT_NAMES[spender],
    displayFields: {
      owner: ownerName ?? owner,
      spender: spenderName ?? spender,
      tokenContract: domain.verifyingContract || "unknown",
      value: formattedValue,
      ...(token ? { token } : {}),
      nonce,
      expiry: dayjs.unix(Number(message.deadline)).format("DD MMM YYYY"),
    },
  }
}
