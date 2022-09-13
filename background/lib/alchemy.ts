import {
  AlchemyProvider,
  AlchemyWebSocketProvider,
} from "@ethersproject/providers"
import { BigNumber, utils } from "ethers"

import logger from "./logger"
import { HexString } from "../types"
import {
  AssetTransfer,
  SmartContractAmount,
  SmartContractFungibleAsset,
} from "../assets"
import { AnyEVMTransaction, EVMNetwork, SmartContract } from "../networks"
import {
  isValidAlchemyAssetTransferResponse,
  isValidAlchemyTokenBalanceResponse,
  isValidAlchemyTokenMetadataResponse,
} from "./validate"
import { AddressOnNetwork } from "../accounts"
import { fetchWithTimeout } from "../utils/fetching"

// We can't use destructuring because webpack has to replace all instances of
// `process.env` variables in the bundled output
export const ALCHEMY_KEY = process.env.ALCHEMY_KEY // eslint-disable-line prefer-destructuring

/**
 * Use Alchemy's getAssetTransfers call to get historical transfers for an
 * account.
 *
 * Note that pagination isn't supported in this wrapper, so any responses after
 * 1k transfers will be dropped.
 *
 * More information https://docs.alchemy.com/alchemy/enhanced-apis/transfers-api
 * @param provider an Alchemy ethers provider
 * @param addressOnNetwork the address whose transfer history we're fetching
 *        and the network it should happen on; note that if the network does
 *        not match the network the provider is set up for, this will likely
 *        fail.
 * @param fromBlock the block height specifying how far in the past we want
 *        to look.
 */
export async function getAssetTransfers(
  provider: AlchemyProvider | AlchemyWebSocketProvider,
  addressOnNetwork: AddressOnNetwork,
  direction: "incoming" | "outgoing",
  fromBlock: number,
  toBlock?: number,
  order: "asc" | "desc" = "desc",
  maxCount = 1000
): Promise<AssetTransfer[]> {
  const { address: account, network } = addressOnNetwork

  const params = {
    fromBlock: utils.hexValue(fromBlock),
    toBlock: toBlock === undefined ? "latest" : utils.hexValue(toBlock),
    maxCount: utils.hexValue(maxCount),
    order,
    // excludeZeroValue: false,
  }

  const extraParams: { toAddress?: HexString; fromAddress?: HexString } = {}

  if (direction === "incoming") {
    extraParams.toAddress = account
  } else {
    extraParams.fromAddress = account
  }

  // Categories that are most important to us, supported both on Ethereum Mainnet and polygon
  // https://docs.alchemy.com/alchemy/enhanced-apis/transfers-api#alchemy_getassettransfers-ethereum-mainnet
  const category = ["external", "erc20"]

  if (addressOnNetwork.network.name === "Ethereum") {
    // "internal" is supported only on Ethereum Mainnet and Goerli atm
    // https://docs.alchemy.com/alchemy/enhanced-apis/transfers-api#alchemy_getassettransfers-testnets-and-layer-2s
    category.push("internal")
  }

  const rpcResponse = await provider.send("alchemy_getAssetTransfers", [
    {
      ...params,
      ...extraParams,
      category,
    },
  ])

  return [rpcResponse]
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

      const asset = transfer.rawContract.address
        ? {
            contractAddress: transfer.rawContract.address,
            decimals: Number(BigInt(transfer.rawContract.decimal)),
            symbol: transfer.asset,
            homeNetwork: network,
          }
        : addressOnNetwork.network.baseAsset
      return {
        network,
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

/**
 * Use Alchemy's getTokenBalances call to get balances for a particular address.
 *
 *
 * More information https://docs.alchemy.com/alchemy/documentation/enhanced-apis/token-api
 *
 * @param provider an Alchemy ethers provider
 * @param address the address whose balances we're fetching
 * @param tokens An optional list of hex-string contract addresses. If the list
 *        isn't provided, Alchemy will choose based on the top 100 high-volume
 *        tokens on its platform
 */
export async function getTokenBalances(
  provider: AlchemyProvider | AlchemyWebSocketProvider,
  { address, network }: AddressOnNetwork,
  tokens?: HexString[]
): Promise<SmartContractAmount[]> {
  const uniqueTokens = [...new Set(tokens ?? [])]

  const json: unknown = await provider.send("alchemy_getTokenBalances", [
    address,
    uniqueTokens.length > 0 ? uniqueTokens : "DEFAULT_TOKENS",
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
  return (
    json.tokenBalances
      .filter(
        (
          b
        ): b is typeof json["tokenBalances"][0] & {
          tokenBalance: Exclude<
            typeof json["tokenBalances"][0]["tokenBalance"],
            undefined | null
          >
        } =>
          (b.error === null || !("error" in b)) &&
          "tokenBalance" in b &&
          b.tokenBalance !== null
      )
      // A hex value of 0x without any subsequent numbers generally means "no
      // value" (as opposed to 0) in Ethereum implementations, so filter it out
      // as effectively undefined.
      .filter(({ tokenBalance }) => tokenBalance !== "0x")
      .map((tokenBalance) => {
        let balance = tokenBalance.tokenBalance
        if (balance.length > 66) {
          balance = balance.substring(0, 66)
        }
        return {
          smartContract: {
            contractAddress: tokenBalance.contractAddress,
            homeNetwork: network,
          },
          amount: BigInt(balance),
        }
      })
  )
}

/**
 * Use Alchemy's getTokenMetadata call to get metadata for a token contract on
 * Ethereum.
 *
 * More information https://docs.alchemy.com/alchemy/documentation/enhanced-apis/token-api
 *
 * @param provider an Alchemy ethers provider
 * @param smartContract The information on the token smart contract whose
 *        metadata should be returned; note that the passed provider should be
 *        for the same network, or results are undefined.
 */
export async function getTokenMetadata(
  provider: AlchemyProvider | AlchemyWebSocketProvider,
  { contractAddress, homeNetwork }: SmartContract
): Promise<SmartContractFungibleAsset | undefined> {
  const json: unknown = await provider.send("alchemy_getTokenMetadata", [
    contractAddress,
  ])
  if (!isValidAlchemyTokenMetadataResponse(json)) {
    logger.warn(
      "Alchemy token metadata response didn't validate, did the API change?",
      json,
      isValidAlchemyTokenMetadataResponse.errors
    )
    throw new Error("Alchemy token metadata response didn't validate.")
  }
  return {
    decimals: json.decimals,
    name: json.name,
    symbol: json.symbol,
    metadata: {
      tokenLists: [],
      ...(json.logo ? { logoURL: json.logo } : {}),
    },
    homeNetwork,
    contractAddress,
  }
}

/**
 * Parse a transaction as returned by an Alchemy provider subscription.
 */
export function transactionFromAlchemyWebsocketTransaction(
  websocketTx: unknown,
  network: EVMNetwork
): AnyEVMTransaction {
  // These are the props we expect here.
  const tx = websocketTx as {
    hash: string
    to: string
    from: string
    gas: string
    gasPrice: string
    maxFeePerGas: string | undefined | null
    maxPriorityFeePerGas: string | undefined | null
    input: string
    r: string
    s: string
    v: string
    nonce: string
    value: string
    blockHash: string | undefined | null
    blockHeight: string | undefined | null
    blockNumber: number | undefined | null
    type: string | undefined | null
  }

  return {
    hash: tx.hash,
    to: tx.to,
    from: tx.from,
    gasLimit: BigInt(tx.gas),
    gasPrice: BigInt(tx.gasPrice),
    maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : null,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
      ? BigInt(tx.maxPriorityFeePerGas)
      : null,
    input: tx.input,
    r: tx.r || undefined,
    s: tx.s || undefined,
    v: BigNumber.from(tx.v).toNumber(),
    nonce: Number(tx.nonce),
    value: BigInt(tx.value),
    blockHash: tx.blockHash ?? null,
    blockHeight: tx.blockNumber ?? null,
    type:
      tx.type !== undefined
        ? (BigNumber.from(tx.type).toNumber() as AnyEVMTransaction["type"])
        : 0,
    asset: network.baseAsset,
    network,
  }
}

export type AlchemyNFTItem = {
  error?: string
  media: { gateway?: string }[]
  id: {
    tokenId: string
  }
  contract: { address: string }
  title: string
  chainID: number
}

/**
 * Use Alchemy's getNFTs call to get a wallet's NFT holdings across collections.
 *
 * Note that pagination isn't supported in this wrapper, so any responses after
 * 100 NFTs will be dropped.
 *
 * More information https://docs.alchemy.com/reference/getnfts
 *
 * @param addressOnNetwork the address whose NFT portfolio we're fetching and
 *        the network it should happen on.
 */
export async function getNFTs({
  address,
  network,
}: AddressOnNetwork): Promise<AlchemyNFTItem[]> {
  // Today, only Polygon and Ethereum are supported
  if (!["Polygon", "Ethereum"].includes(network.name)) {
    return []
  }

  const requestUrl = new URL(
    `https://${
      network.name === "Polygon" ? "polygon-mainnet.g" : "eth-mainnet"
    }.alchemyapi.io/nft/v2/${ALCHEMY_KEY}/getNFTs/`
  )
  requestUrl.searchParams.set("owner", address)
  requestUrl.searchParams.set("filters[]", "SPAM")
  requestUrl.searchParams.set("pageSize", "100")

  // TODO validate data with ajv
  const result = await (await fetchWithTimeout(requestUrl.toString())).json()
  return result.ownedNfts
    .filter((nft: AlchemyNFTItem) => typeof nft.error === "undefined")
    .map((nft: AlchemyNFTItem) => ({ ...nft, chainID: network.chainID }))
}
