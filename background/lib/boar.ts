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
  isValidBoarAssetTransferResponse,
  isValidBoarTokenBalanceResponse,
  isValidBoarTokenMetadataResponse,
  ValidatedType,
} from "./validate"
import type SerialFallbackProvider from "../services/chain/serial-fallback-provider"
import { AddressOnNetwork } from "../accounts"
import { FeatureFlags, isEnabled } from "../features"
import type { ERC721Transfer, ScannedTransfers } from "../nfts"

// We can't use destructuring because webpack has to replace all instances of
// `process.env` variables in the bundled output. Each chain URL must be
// referenced explicitly so the bundler can inline the values.
// oxlint-disable-next-line prefer-destructuring
export const BOAR_RPC_URLS: Readonly<Record<string, string | undefined>> = {
  "1": process.env.BOAR_RPC_URL_ETHEREUM,
  "10": process.env.BOAR_RPC_URL_OPTIMISM,
  "137": process.env.BOAR_RPC_URL_POLYGON,
  "42161": process.env.BOAR_RPC_URL_ARBITRUM_ONE,
  "11155111": process.env.BOAR_RPC_URL_SEPOLIA,
  "31612": process.env.BOAR_RPC_URL_MEZO,
}

type BoarAssetTransfers = ValidatedType<typeof isValidBoarAssetTransferResponse>

/**
 * The ERC-721 transfer an Alchemy-compatible transfer entry describes, or
 * `undefined` if it describes something else.
 */
function erc721TransferFrom(
  transfer: BoarAssetTransfers["transfers"][number],
  network: EVMNetwork,
): ERC721Transfer | undefined {
  const tokenId = transfer.tokenId ?? transfer.erc721TokenId
  const contractAddress = transfer.rawContract?.address
  if (
    transfer.category !== "erc721" ||
    !tokenId ||
    !contractAddress ||
    !transfer.from ||
    !transfer.to
  ) {
    return undefined
  }

  // uniqueId looks like `<hash>:log:<index>`.
  const logIndex = Number(transfer.uniqueId?.split(":log:")[1] ?? 0)

  return {
    network,
    contractAddress,
    tokenId: BigInt(tokenId).toString(),
    from: transfer.from,
    to: transfer.to,
    txHash: transfer.hash,
    blockNumber: Number(BigInt(transfer.blockNum)),
    logIndex: Number.isNaN(logIndex) ? 0 : logIndex,
  }
}

/**
 * Sends an `alchemy_getAssetTransfers` request, returning its validated
 * response, or `undefined` if it didn't validate.
 */
async function sendAssetTransfersRequest(
  provider: SerialFallbackProvider,
  params: Record<string, unknown>,
): Promise<BoarAssetTransfers | undefined> {
  const rpcResponse: unknown = await provider.send(
    "alchemy_getAssetTransfers",
    [params],
  )
  if (isValidBoarAssetTransferResponse(rpcResponse)) {
    return rpcResponse
  }
  logger.warn(
    "Boar asset transfer response didn't validate, did the API change?",
    rpcResponse,
    isValidBoarAssetTransferResponse.errors,
  )
  return undefined
}

/**
 * The transfer categories looked up for an account; `internal` is only
 * served on Ethereum Mainnet and Sepolia.
 */
function transferCategories(network: EVMNetwork, withERC721: boolean) {
  return [
    "external",
    "erc20",
    ...(network.name === "Ethereum" ? ["internal"] : []),
    ...(withERC721 ? ["erc721"] : []),
  ]
}

/**
 * Use Boar's getAssetTransfers call to get historical transfers for an
 * account. With the NFT indexer on, ERC-721 transfers come back as
 * `nftTransfers` from the same call.
 *
 * Note that pagination isn't supported in this wrapper, so any responses after
 * 1k transfers will be dropped.
 *
 * @param provider a Boar RPC ethers provider
 * @param addressOnNetwork the address whose transfer history we're fetching
 *        and the network it should happen on; note that if the network does
 *        not match the network the provider is set up for, this will likely
 *        fail.
 * @param fromBlock the block height specifying how far in the past we want
 *        to look.
 */
export async function getAssetTransfers(
  provider: SerialFallbackProvider,
  addressOnNetwork: AddressOnNetwork,
  direction: "incoming" | "outgoing",
  fromBlock: number,
  toBlock?: number,
  order: "asc" | "desc" = "desc",
  maxCount = 25,
): Promise<ScannedTransfers> {
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

  const response = await sendAssetTransfersRequest(provider, {
    ...params,
    ...extraParams,
    category: transferCategories(
      network,
      isEnabled(FeatureFlags.SUPPORT_NFT_INDEXER),
    ),
  })
  const transfers = response?.transfers ?? []

  const nftTransfers = transfers.flatMap(
    (transfer) => erc721TransferFrom(transfer, network) ?? [],
  )

  const assetTransfers = transfers
    .map((transfer) => {
      // NFTs are handled above.
      if (transfer.erc721TokenId || transfer.category === "erc721") {
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
        dataSource: "boar",
      } as AssetTransfer
    })
    .filter((t): t is AssetTransfer => t !== null)

  return { assetTransfers, nftTransfers }
}

/** Transfers per page of {@link getERC721TransferPage}, Alchemy's most. */
export const ERC721_TRANSFERS_PER_PAGE = 1000

/**
 * One page of an account's ERC-721 transfers in one direction, newest first,
 * and the key of the next page, if there is one. Throws if the answer
 * doesn't validate.
 */
export async function getERC721TransferPage(
  provider: SerialFallbackProvider,
  addressOnNetwork: AddressOnNetwork,
  direction: "incoming" | "outgoing",
  pageKey?: string,
): Promise<{ nftTransfers: ERC721Transfer[]; pageKey?: string }> {
  const { address, network } = addressOnNetwork
  const response = await sendAssetTransfersRequest(provider, {
    fromBlock: "0x0",
    toBlock: "latest",
    maxCount: utils.hexValue(ERC721_TRANSFERS_PER_PAGE),
    order: "desc",
    category: ["erc721"],
    ...(direction === "incoming"
      ? { toAddress: address }
      : { fromAddress: address }),
    ...(pageKey === undefined ? {} : { pageKey }),
  })
  // An empty page with no key would read as the last one.
  if (response === undefined) {
    throw new Error(
      `chain ${network.chainID}: Boar's ERC-721 transfer page didn't validate.`,
    )
  }
  return {
    nftTransfers: response.transfers.flatMap(
      (transfer) => erc721TransferFrom(transfer, network) ?? [],
    ),
    pageKey: response.pageKey,
  }
}

/**
 * The block of an account's first incoming transfer of the kinds Alchemy
 * tracks, NFTs included, or `null` if it has none. The account held no NFTs
 * before it. Throws if the answer doesn't validate.
 */
export async function getFirstIncomingTransferBlock(
  provider: SerialFallbackProvider,
  { address, network }: AddressOnNetwork,
): Promise<number | null> {
  const response = await sendAssetTransfersRequest(provider, {
    fromBlock: "0x0",
    toBlock: "latest",
    maxCount: utils.hexValue(1),
    order: "asc",
    category: transferCategories(network, true),
    toAddress: address,
  })
  if (response === undefined) {
    throw new Error(
      `chain ${network.chainID}: Boar's first transfer response didn't validate.`,
    )
  }
  const [first] = response.transfers
  return first === undefined ? null : Number(BigInt(first.blockNum))
}

/**
 * Use Boar's getTokenBalances call to get balances for a particular address.
 *
 * @param provider a Boar RPC ethers provider
 * @param address the address whose balances we're fetching
 * @param tokens An optional list of hex-string contract addresses. If the list
 *        isn't provided, Boar will choose based on the top high-volume
 *        tokens on its platform
 */
export async function getTokenBalances(
  provider: SerialFallbackProvider,
  addressOnNetwork: AddressOnNetwork,
): Promise<SmartContractAmount[]> {
  const fetchAndValidate = async (address: string, pageKey?: string) => {
    const json: unknown = await provider.send("alchemy_getTokenBalances", [
      address,
      "erc20",
      ...(pageKey ? [{ pageKey }] : []),
    ])

    if (!isValidBoarTokenBalanceResponse(json)) {
      logger.warn(
        "Boar token balance response didn't validate, did the API change?",
        json,
        isValidBoarTokenBalanceResponse.errors,
      )
      return null
    }

    return json
  }

  type TokenBalance = ValidatedType<
    typeof isValidBoarTokenBalanceResponse
  >["tokenBalances"]

  const balances: TokenBalance = []

  type Awaited<P> = P extends Promise<infer V> ? V : P

  let currentPageKey
  let response: Awaited<ReturnType<typeof fetchAndValidate>>

  do {
    // oxlint-disable-next-line no-await-in-loop
    response = await fetchAndValidate(addressOnNetwork.address, currentPageKey)

    if (!response) {
      break
    }

    balances.push(...response.tokenBalances)

    currentPageKey = response.pageKey
  } while (currentPageKey)

  // TODO log balances with errors, consider returning an error type
  return (
    balances
      .filter(
        (
          b,
        ): b is TokenBalance[0] & {
          tokenBalance: NonNullable<TokenBalance[0]["tokenBalance"]>
        } =>
          (b.error === null || !("error" in b)) &&
          "tokenBalance" in b &&
          b.tokenBalance !== null,
      )
      // A hex value of 0x without any subsequent numbers generally means "no
      // value" (as opposed to 0) in Ethereum implementations, so filter it out
      // as effectively undefined.
      .filter(
        ({ tokenBalance }) =>
          // Do not filter out 0-balances here to account for cases when a users
          // spends all of their tokens (swap MAX of a token, bridge all tokens, etc..)
          tokenBalance !== "0x",
      )
      .map((tokenBalance) => {
        let balance = tokenBalance.tokenBalance
        if (balance.length > 66) {
          balance = balance.substring(0, 66)
        }
        return {
          smartContract: {
            contractAddress: tokenBalance.contractAddress,
            homeNetwork: addressOnNetwork.network,
          },
          amount: BigInt(balance),
        }
      })
  )
}

/**
 * Use Boar's getTokenMetadata call to get metadata for a token contract.
 *
 * @param provider a Boar RPC ethers provider
 * @param smartContract The information on the token smart contract whose
 *        metadata should be returned; note that the passed provider should be
 *        for the same network, or results are undefined.
 */
export async function getTokenMetadata(
  provider: SerialFallbackProvider,
  { contractAddress, homeNetwork }: SmartContract,
): Promise<SmartContractFungibleAsset> {
  const json: unknown = await provider.send("alchemy_getTokenMetadata", [
    contractAddress,
  ])
  if (!isValidBoarTokenMetadataResponse(json)) {
    logger.warn(
      "Boar token metadata response didn't validate, did the API change?",
      json,
      isValidBoarTokenMetadataResponse.errors,
    )
    throw new Error("Boar token metadata response didn't validate.")
  }
  return {
    decimals: json.decimals ?? 0,
    name: json.name,
    symbol: json.symbol,
    metadata: {
      ...(json.logo ? { logoURL: json.logo } : {}),
    },
    homeNetwork,
    contractAddress,
  }
}

/**
 * Parse a transaction as returned by a Boar provider subscription.
 */
export function transactionFromBoarWebsocketTransaction(
  websocketTx: unknown,
  network: EVMNetwork,
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
