import dayjs from "dayjs"
import { EIP2612SignTypedDataAnnotation } from "./types"
import { ETHEREUM } from "../../constants"
import { SmartContractFungibleAsset } from "../../assets"
import NameService from "../name"
import { EIP712TypedData } from "../../types"
import { EIP2612TypedData } from "../../utils/signing"
import { ERC20TransferLog } from "../../lib/erc20"
import { normalizeEVMAddress } from "../../lib/utils"

export function isEIP2612TypedData(
  typedData: EIP712TypedData
): typedData is EIP2612TypedData {
  if (typeof typedData.message.spender === "string") {
    if (
      // Must be on main chain
      typedData.domain.chainId === Number(ETHEREUM.chainID) &&
      typedData.primaryType === "Permit" &&
      // Must have all expected fields
      // @TODO use AJV validation
      ["owner", "spender", "value", "nonce", "deadline"].every(
        (key) => key in typedData.message
      )
    ) {
      return true
    }
  }
  return false
}

export async function enrichEIP2612SignTypedDataRequest(
  typedData: EIP2612TypedData,
  nameService: NameService,
  asset: SmartContractFungibleAsset | undefined
): Promise<EIP2612SignTypedDataAnnotation> {
  const { message, domain } = typedData
  const { value, owner, spender, nonce } = message

  // If we have a corresponding asset - use known decimals to display a human-friendly
  // amount e.g. 10 USDC.  Otherwise just display the value e.g. 10000000
  const formattedValue = asset
    ? `${Number(value) / 10 ** asset?.decimals} ${asset.symbol}`
    : `${value}`

  // We only need to add the token if we're not able to properly format the value above
  const token = formattedValue === `${value}` ? domain.name : null

  const [sourceName, ownerName, spenderName] = (
    await Promise.all([
      await nameService.lookUpName({
        address: spender,
        network: ETHEREUM,
      }),
      await nameService.lookUpName(
        { address: owner, network: ETHEREUM },
        false
      ),
      await nameService.lookUpName(
        { address: spender, network: ETHEREUM },
        false
      ),
    ])
  ).map((nameOnNetwork) => nameOnNetwork?.name)

  return {
    type: "EIP-2612",
    source: sourceName ?? spender,
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

export function getDistinctRecipentAddressesFromERC20Logs(
  logs: ERC20TransferLog[]
): string[] {
  return [...new Set([...logs.map(({ recipientAddress }) => recipientAddress)])]
}

export const getERC20LogsForAddresses = (
  logs: ERC20TransferLog[],
  addresses: string[]
): ERC20TransferLog[] => {
  const relevantAddresses = Object.fromEntries(
    addresses.map((address) => [address, true])
  )

  return logs.filter(
    (log) =>
      relevantAddresses[normalizeEVMAddress(log.recipientAddress)] ||
      relevantAddresses[normalizeEVMAddress(log.senderAddress)]
  )
}
