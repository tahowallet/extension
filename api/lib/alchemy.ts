import Ajv from "ajv/dist/jtd"
import {
  AlchemyProvider,
  AlchemyWebSocketProvider,
} from "@ethersproject/providers"
import { utils } from "ethers"

import { AssetTransfer } from "../types"
import { ETH, ETHEREUM } from "../constants"

// JSON Type Definition for the Alchemy assetTransfers API. See RFC 8927 or
// jsontypedef.com for more details
const alchemyAssetTransferJSONTypedef = {
  properties: {
    asset: { type: "string", nullable: true },
    hash: { type: "string" },
    blockNum: { type: "string" },
    category: { enum: ["token", "internal", "external"] },
    from: { type: "string", nullable: true },
    to: { type: "string", nullable: true },
    erc721TokenId: { type: "string", nullable: true },
  },
  optionalProperties: {
    rawContract: {
      properties: {
        address: { type: "string", nullable: true },
        decimal: { type: "string", nullable: true },
        value: { type: "string", nullable: true },
      },
    },
  },
  additionalProperties: true,
}

// The type corresponding to the above JTD. In an ideal world, these two
// wouldn't be duplicative, stemming from a single code generator.
type AlchemyAssetTransferResponse = {
  asset: string | null
  hash: string
  blockNum: string
  category: "token" | "internal" | "external"
  from: string | null
  to: string | null
  rawContract?: {
    address: string | null
    decimal: string | null
    value: string | null
  }
  erc721TokenId: string | null
}

function validateAlchemyAssetTransfer(
  json: unknown
): AlchemyAssetTransferResponse | null {
  const ajv = new Ajv()
  if (!ajv.validate(alchemyAssetTransferJSONTypedef, json)) {
    return null
  }
  return json as AlchemyAssetTransferResponse
}

/*
 * Use Alchemy's getAssetTransfers call to get historical transfers for an
 * account.
 *
 * Note that pagination isn't supported in this wrapper, so any responses after
 * 1k transfers will be dropped.
 *
 * More information https://docs.alchemy.com/alchemy/documentation/apis/enhanced-apis/transfers-api#alchemy_getassettransfers
 * @param provider - an Alchemy ethers provider
 * @param account - the account whose transfer history we're fetching
 * @param fromBlock - the block height specifying how far in the past we want
 *        to look.
 */
// eslint-disable-next-line import/prefer-default-export
export async function getAssetTransfers(
  provider: AlchemyProvider | AlchemyWebSocketProvider,
  account: string,
  fromBlock: number
): Promise<AssetTransfer[]> {
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
    .map((json: unknown) => {
      const transferResponse = validateAlchemyAssetTransfer(json)
      if (!transferResponse) {
        console.warn(
          "Alchemy asset transfer response didn't validate, did the API change?",
          json
        )
        return null
      }

      // TODO handle NFT asset lookup properly
      if (transferResponse.erc721TokenId) {
        return null
      }

      // we don't care about 0-value transfers
      // TODO handle nonfungible assets properly
      // TODO handle assets with a contract address and no name
      if (
        !transferResponse.rawContract ||
        !transferResponse.rawContract.value ||
        !transferResponse.rawContract.decimal ||
        !transferResponse.asset
      ) {
        return null
      }

      const asset = !transferResponse.rawContract.address
        ? {
            contractAddress: transferResponse.rawContract.address,
            decimals: Number(BigInt(transferResponse.rawContract.decimal)),
            symbol: transferResponse.asset,
            homeNetwork: ETHEREUM, // TODO is this true? asset lookup
          }
        : ETH
      return {
        network: ETHEREUM, // TODO make this friendly across other networks
        assetAmount: {
          asset,
          amount: BigInt(transferResponse.rawContract.value),
        },
        txHash: transferResponse.hash,
        to: transferResponse.to,
        from: transferResponse.from,
        dataSource: "alchemy",
      } as AssetTransfer
    })
    .filter((t) => t)
}
