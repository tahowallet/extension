import Ajv from "ajv/dist/jtd"
import {
  AlchemyProvider,
  AlchemyWebSocketProvider,
} from "@ethersproject/providers"
import { utils } from "ethers"

import { AssetTransfer, HexString } from "../types"
import { ETH, ETHEREUM } from "../constants"

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

function validateAlchemyAssetTransferResponse(
  json: unknown
): AlchemyAssetTransferResponse | null {
  const ajv = new Ajv()
  if (!ajv.validate(alchemyAssetTransferJTD, json)) {
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
      const transferResponse = validateAlchemyAssetTransferResponse(json)
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
            homeNetwork: ETHEREUM, // TODO is this true?
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
}

// The type of a validated token balance API response, corresponding to the
// above JTD.
type AlchemyTokenBalanceResponse = {
  address: string
  tokenBalances: {
    contractAddress: string
    error: string | null
    tokenBalance: string | null
  }[]
}

function validateAlchemyTokenBalanceResponse(
  json: unknown
): AlchemyTokenBalanceResponse | null {
  const ajv = new Ajv()
  if (!ajv.validate(alchemyTokenBalanceJTD, json)) {
    return null
  }
  return json as AlchemyTokenBalanceResponse
}

/*
 * Use Alchemy's getTokenBalances call to get balances for a particular address.
 *
 *
 * More information https://docs.alchemy.com/alchemy/documentation/enhanced-apis/token-api
 * @param provider - an Alchemy ethers provider
 * @param account - the account whose balances we're fetching
 * @param tokens - an optional list of hex-string contract addresses. If the list
 *                 isn't provided, Alchemy will choose based on the top 100
 *                 high-volume tokens on its platform
 */
export async function getTokenBalances(
  provider: AlchemyProvider | AlchemyWebSocketProvider,
  account: string,
  tokens?: HexString[]
): Promise<{ contractAddress: string; amount: bigint }[]> {
  const json: unknown = await provider.send("alchemy_getTokenBalances", [
    account,
    tokens || "DEFAULT_TOKENS",
  ])
  const tokenResponse = validateAlchemyTokenBalanceResponse(json)

  // TODO log balances with errors, consider returning an error type
  return tokenResponse.tokenBalances
    .filter((b) => b.error === null && b.tokenBalance !== null)
    .map((tokenBalance) => ({
      contractAddress: tokenBalance.contractAddress,
      amount: BigInt(tokenBalance.tokenBalance),
    }))
}
