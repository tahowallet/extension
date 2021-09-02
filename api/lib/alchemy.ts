import Ajv from "ajv/dist/jtd"
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
      const transferResponse = validateAlchemyAssetTransfer(json)
      if (!transferResponse) {
        console.warn(
          "Alchemy asset transfer response didn't validate, did the API change?",
          json
        )
        return null
      }
      const formattedTransfer: AlchemyAssetTransfer = {
        hash: json.hash,
        blockHeight: BigNumber.from(json.blockNum).toNumber(),
        category: json.category,
        from: json.from,
        to: json.to,
        value: null,
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
          formattedTransfer.value = BigNumber.from(
            formattedTransfer.rawContract.value
          ).toBigInt()
        }
      }
      return formattedTransfer
    })
    .filter((t) => t)
}
