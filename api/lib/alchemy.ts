import {
  AlchemyProvider,
  AlchemyWebSocketProvider,
} from "@ethersproject/providers"
import { BigNumber, utils } from "ethers"

export interface AlchemyAssetTransfer {
  hash: string
  blockHeight: number
  category: "token" | "internal" | "external"
  from: string | null
  to: string | null
  rawContract?: {
    address: string | null
    decimals: number | null
    value: BigInt | null
  }
  value: BigInt | null
  erc721TokenId: string | null
}

/*
 * Use Alchemy's getAssetTransfers call to get historical transfers for an
 * account.
 *
 * Note that pagination isn't supported, so any responses after 1k transfers
 * will be dropped.
 *
 * More information https://docs.alchemy.com/alchemy/documentation/apis/enhanced-apis/transfers-api#alchemy_getassettransfers
 * @param provider - an Alchemy ethers provider
 * @param account - the account whose transfer history we're fetching
 * @param fromBlock - the block height specifying how far in the past we want
 *        to look.
 */
export async function getAssetTransfers(
  provider: AlchemyProvider | AlchemyWebSocketProvider,
  account: string,
  fromBlock: number
): Promise<AlchemyAssetTransfer[]> {
  const params = {
    fromBlock: utils.hexValue(fromBlock),
    toBlock: "latest",
    // excludeZeroValue: false,
  }
  const rpcResponses = await Promise.all([
    provider.send("alchemy_getAssetTransfers", [
      {
        ...params,
        fromAddress: account,
      },
    ]),
    provider.send("alchemy_getAssetTransfers", [
      {
        ...params,
        toAddress: account,
      },
    ]),
  ])

  return rpcResponses[0].transfers
    .concat(rpcResponses[1].transfers)
    .map((json) => {
      const formattedTransfer: AlchemyAssetTransfer = {
        hash: json.hash,
        blockHeight: BigNumber.from(json.blockNum).toNumber(),
        category: json.category,
        from: json.from,
        to: json.to,
        // do our best to get a well-formed ETH amount in wei. Alchemy appears
        // to return the "correct" hex string value in the rawContract object if
        // this is a normal ETH send, but doesn't help us if it's eg a contract
        // interaction that also includes transaction value
        value:
          json.value !== null
            ? utils.parseUnits(json.value.toFixed(18), "ether").toBigInt()
            : null,
        erc721TokenId: json.erc721TokenId,
      }
      if (json.rawContract) {
        const contract = json.rawContract
        formattedTransfer.rawContract = {
          address: contract.address || null,
          value:
            contract.value !== null
              ? BigNumber.from(contract.value).toBigInt()
              : null,
          decimals: contract.decimal !== null ? Number(contract.decimal) : null,
        }
        if (
          contract.address === null &&
          formattedTransfer.rawContract.decimals === 18 &&
          formattedTransfer.rawContract.value
        ) {
          formattedTransfer.value = formattedTransfer.rawContract.value
        }
      }
      return formattedTransfer
    })
}
