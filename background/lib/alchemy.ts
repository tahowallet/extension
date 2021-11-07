import {
  AlchemyProvider,
  AlchemyWebSocketProvider,
} from "@ethersproject/providers"
import { utils } from "ethers"

import logger from "./logger"
import { HexString } from "../types"
import { AssetTransfer, SmartContractFungibleAsset } from "../assets"
import { ETH } from "../constants"
import { jtdValidatorFor } from "./validation"
import { getEthereumNetwork } from "./utils"

// JSON Type Definition for the Alchemy assetTransfers API.
// https://docs.alchemy.com/alchemy/documentation/enhanced-apis/transfers-api
//
// See RFC 8927 or jsontypedef.com to learn more about JTD.
const alchemyAssetTransferJTD = {
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
} as const

const alchemyGetAssetTransfersJTD = {
  properties: {
    transfers: {
      elements: alchemyAssetTransferJTD,
    },
  },
} as const

const isValidAlchemyAssetTransferResponse = jtdValidatorFor(
  alchemyGetAssetTransfersJTD
)

/**
 * Use Alchemy's getAssetTransfers call to get historical transfers for an
 * account.
 *
 * Note that pagination isn't supported in this wrapper, so any responses after
 * 1k transfers will be dropped.
 *
 * More information https://docs.alchemy.com/alchemy/documentation/apis/enhanced-apis/transfers-api#alchemy_getassettransfers
 * @param provider an Alchemy ethers provider
 * @param account the account whose transfer history we're fetching
 * @param fromBlock the block height specifying how far in the past we want
 *        to look.
 */
export async function getAssetTransfers(
  provider: AlchemyProvider | AlchemyWebSocketProvider,
  account: string,
  fromBlock: number,
  toBlock?: number
): Promise<AssetTransfer[]> {
  const params = {
    fromBlock: utils.hexValue(fromBlock),
    toBlock: toBlock === undefined ? "latest" : utils.hexValue(toBlock),
    // excludeZeroValue: false,
  }

  // TODO handle partial failure
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

  return rpcResponses
    .flatMap((jsonResponse: unknown) => {
      if (isValidAlchemyAssetTransferResponse(jsonResponse)) {
        return jsonResponse.transfers
      }

      logger.warn(
        "Alchemy asset transfer response didn't validate, did the API change?",
        jsonResponse,
        isValidAlchemyAssetTransferResponse.errors
      )
      return []
    })
    .map((transfer) => {
      // TODO handle NFT asset lookup properly
      if (transfer.erc721TokenId) {
        return null
      }

      // we don't care about 0-value transfers
      // TODO handle nonfungible assets properly
      // TODO handle assets with a contract address and no name
      if (
        !transfer.rawContract ||
        !transfer.rawContract.value ||
        !transfer.rawContract.decimal ||
        !transfer.asset
      ) {
        return null
      }

      const asset = !transfer.rawContract.address
        ? {
            contractAddress: transfer.rawContract.address,
            decimals: Number(BigInt(transfer.rawContract.decimal)),
            symbol: transfer.asset,
            homeNetwork: getEthereumNetwork(), // TODO internally track the current network instead of relying on the .env file
          }
        : ETH

      return {
        network: getEthereumNetwork(), // TODO make this friendly across other networks
        assetAmount: {
          asset,
          amount: BigInt(transfer.rawContract.value),
        },
        txHash: transfer.hash,
        to: transfer.to,
        from: transfer.from,
        dataSource: "alchemy",
      } as AssetTransfer
    })
    .filter((t): t is AssetTransfer => t !== null)
}

// JSON Type Definition for the Alchemy token balance API.
// https://docs.alchemy.com/alchemy/documentation/enhanced-apis/token-api
//
// See RFC 8927 or jsontypedef.com for more detail to learn more about JTD.
const alchemyTokenBalanceJTD = {
  properties: {
    address: { type: "string" },
    tokenBalances: {
      elements: {
        properties: {
          contractAddress: { type: "string" },
          error: { type: "string", nullable: true },
          tokenBalance: { type: "string", nullable: true },
        },
      },
    },
  },
  additionalProperties: false,
} as const

const isValidAlchemyTokenBalanceResponse = jtdValidatorFor(
  alchemyTokenBalanceJTD
)

/**
 * Use Alchemy's getTokenBalances call to get balances for a particular address.
 *
 *
 * More information https://docs.alchemy.com/alchemy/documentation/enhanced-apis/token-api
 *
 * @param provider an Alchemy ethers provider
 * @param account the account whose balances we're fetching
 * @param tokens An optional list of hex-string contract addresses. If the list
 *        isn't provided, Alchemy will choose based on the top 100 high-volume
 *        tokens on its platform
 */
export async function getTokenBalances(
  provider: AlchemyProvider | AlchemyWebSocketProvider,
  account: HexString,
  tokens?: HexString[]
): Promise<{ contractAddress: string; amount: bigint }[]> {
  const json: unknown = await provider.send("alchemy_getTokenBalances", [
    account,
    tokens || "DEFAULT_TOKENS",
  ])
  if (!isValidAlchemyTokenBalanceResponse(json)) {
    logger.warn(
      "Alchemy token balance response didn't validate, did the API change?",
      json,
      isValidAlchemyTokenBalanceResponse.errors
    )
    return []
  }

  // TODO log balances with errors, consider returning an error type
  return json.tokenBalances
    .filter(
      (
        b
      ): b is typeof json["tokenBalances"][0] & {
        tokenBalance: Exclude<
          typeof json["tokenBalances"][0]["tokenBalance"],
          null
        >
      } => b.error === null && b.tokenBalance !== null
    )
    .map((tokenBalance) => ({
      contractAddress: tokenBalance.contractAddress,
      amount:
        tokenBalance.tokenBalance === "0x"
          ? BigInt(0)
          : BigInt(tokenBalance.tokenBalance),
    }))
}

// JSON Type Definition for the Alchemy token metadata API.
// https://docs.alchemy.com/alchemy/documentation/enhanced-apis/token-api#alchemy_gettokenmetadata
//
// See RFC 8927 or jsontypedef.com for more detail to learn more about JTD.
const alchemyTokenMetadataJTD = {
  properties: {
    decimals: { type: "uint32" },
    name: { type: "string" },
    symbol: { type: "string" },
    logo: { type: "string", nullable: true },
  },
  additionalProperties: false,
} as const

const isValidAlchemyTokenMetadataResponse = jtdValidatorFor(
  alchemyTokenMetadataJTD
)

/**
 * Use Alchemy's getTokenMetadata call to get metadata for a token contract on
 * Ethereum.
 *
 * More information https://docs.alchemy.com/alchemy/documentation/enhanced-apis/token-api
 *
 * @param provider an Alchemy ethers provider
 * @param contractAddress the address of the token smart contract whose
 *        metadata should be returned
 */
export async function getTokenMetadata(
  provider: AlchemyProvider | AlchemyWebSocketProvider,
  contractAddress: HexString
): Promise<SmartContractFungibleAsset | null> {
  const json: unknown = await provider.send("alchemy_getTokenMetadata", [
    contractAddress,
  ])
  if (!isValidAlchemyTokenMetadataResponse(json)) {
    logger.warn(
      "Alchemy token metadata response didn't validate, did the API change?",
      json
    )
    return null
  }
  return {
    decimals: json.decimals,
    name: json.name,
    symbol: json.symbol,
    metadata: {
      tokenLists: [],
      ...(json.logo ? { logoURL: json.logo } : {}),
    },
    homeNetwork: getEthereumNetwork(), // TODO make multi-network friendly
    contractAddress,
  }
}
