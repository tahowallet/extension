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
    address: string
    decimals: number
    value: BigInt
  }
  value: number
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
        value: json.value,
        erc721TokenId: json.erc721TokenId,
      }
      // TODO parse rawContract properly
      if (json.rawContract) {
        formattedTransfer.rawContract = {
          address: json.rawContract.address,
          value: BigNumber.from(json.rawContract.value).toBigInt(),
          decimals: Number(json.rawContract.decimal),
        }
      }
      return formattedTransfer
    })
}
