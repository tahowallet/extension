import Ajv, { JTDDataType } from "ajv/dist/jtd"
import {
  AlchemyProvider,
  AlchemyWebSocketProvider,
} from "@ethersproject/providers"
import { logger, utils } from "ethers"

import { AssetTransfer, HexString, SmartContractFungibleAsset } from "../types"
import { ETH, ETHEREUM } from "../constants"

const ajv = new Ajv()

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

type AlchemyAssetTransferResponse = JTDDataType<typeof alchemyAssetTransferJTD>

const isValidAlchemyAssetTransferResponse =
  ajv.compile<AlchemyAssetTransferResponse>(alchemyAssetTransferJTD)

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

  return rpcResponses[0].transfers
    .concat(rpcResponses[1].transfers)
    .map((json: unknown) => {
      if (!isValidAlchemyAssetTransferResponse(json)) {
        logger.warn(
          "Alchemy asset transfer response didn't validate, did the API change?",
          json
        )
        return null
      }

      // TODO handle NFT asset lookup properly
      if (json.erc721TokenId) {
        return null
      }

      // we don't care about 0-value transfers
      // TODO handle nonfungible assets properly
      // TODO handle assets with a contract address and no name
      if (
        !json.rawContract ||
        !json.rawContract.value ||
        !json.rawContract.decimal ||
        !json.asset
      ) {
        return null
      }

      const asset = !json.rawContract.address
        ? {
            contractAddress: json.rawContract.address,
            decimals: Number(BigInt(json.rawContract.decimal)),
            symbol: json.asset,
            homeNetwork: ETHEREUM, // TODO is this true?
          }
        : ETH
      return {
        network: ETHEREUM, // TODO make this friendly across other networks
        assetAmount: {
          asset,
          amount: BigInt(json.rawContract.value),
        },
        txHash: json.hash,
        to: json.to,
        from: json.from,
        dataSource: "alchemy",
      } as AssetTransfer
    })
    .filter((t) => t)
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

type AlchemyTokenBalanceResponse = JTDDataType<typeof alchemyTokenBalanceJTD>

const isValidAlchemyTokenBalanceResponse =
  ajv.compile<AlchemyTokenBalanceResponse>(alchemyTokenBalanceJTD)

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
      json
    )
    return []
  }

  // TODO log balances with errors, consider returning an error type
  return json.tokenBalances
    .filter((b) => b.error === null && b.tokenBalance !== null)
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

type AlchemyTokenMetadataResponse = JTDDataType<typeof alchemyTokenMetadataJTD>

const isValidAlchemyTokenMetadataResponse =
  ajv.compile<AlchemyTokenMetadataResponse>(alchemyTokenMetadataJTD)

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
      logoURL: json.logo,
      tokenLists: [],
    },
    homeNetwork: ETHEREUM, // TODO make multi-network friendly
    contractAddress,
  }
}
