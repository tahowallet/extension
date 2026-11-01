import type { Filter, Log } from "@ethersproject/abstract-provider"
import { utils } from "ethers"

import { AddressOnNetwork } from "../accounts"
import { AssetTransfer, SmartContractFungibleAsset } from "../assets"
import { EVMLog } from "../networks"
import type SerialFallbackProvider from "../services/chain/serial-fallback-provider"
import {
  advertisedBlockRangeLimit,
  suggestedBlockRange,
} from "../services/chain/rpc/log-query-errors"
import { ERC20_INTERFACE, parseLogsForERC20Transfers } from "./erc20"
import logger from "./logger"
import { normalizeEVMAddress } from "./utils"

/**
 * The topic hash of the standard ERC-20
 * `Transfer(address indexed from, address indexed to, uint256 value)` event,
 * derived from the shared ERC-20 interface rather than hardcoded.
 */
export const ERC20_TRANSFER_TOPIC = ERC20_INTERFACE.getEventTopic("Transfer")

/**
 * The smallest block range this module halves down to when an endpoint
 * refuses a range without saying how wide a range it allows. Below twice
 * this many blocks the error propagates, as it's unlikely to be about the
 * range.
 *
 * Callers scan in 5000-block passes (see `BLOCKS_PER_TRANSFER_LOG_SCAN`), and
 * halving 5000 walks 2500, 1250, 625, 313, 157, which clears the 500- and
 * 1000-block caps common among public endpoints.
 */
export const MINIMUM_LOG_BLOCK_RANGE = 100

/** What a provider's endpoints have said about log queries this session. */
type LogQueryLimits = {
  /** The widest range they advertised. */
  maxBlockRange?: number
}

const limitsByProvider = new WeakMap<object, LogQueryLimits>()

function limitsFor(provider: SerialFallbackProvider): LogQueryLimits {
  let limits = limitsByProvider.get(provider)
  if (limits === undefined) {
    limits = {}
    limitsByProvider.set(provider, limits)
  }
  return limits
}

/**
 * The widest block range a provider's endpoints advertised for log queries
 * this session, if any did.
 */
export function learntMaxBlockRange(
  provider: SerialFallbackProvider,
): number | undefined {
  return limitsByProvider.get(provider)?.maxBlockRange
}

/**
 * Fetch logs matching the passed topics between `fromBlock` and `toBlock`
 * (both inclusive), adapting to providers that reject wide ranges.
 *
 * A range wider than the provider's endpoints have advertised is fetched in
 * chunks of that size. When an endpoint refuses a range and says how wide a
 * range it allows, or suggests one, the range is fetched in chunks of that
 * size, and an advertised limit is kept for later scans. Otherwise the range
 * is halved, down to {@link MINIMUM_LOG_BLOCK_RANGE}. Chunks are fetched one
 * at a time so a provider already refusing requests isn't sent more.
 */
async function getLogsWithAdaptiveRange(
  provider: SerialFallbackProvider,
  topics: Filter["topics"],
  fromBlock: number,
  toBlock: number,
): Promise<Log[]> {
  const limits = limitsFor(provider)
  const blockCount = toBlock - fromBlock + 1

  const inChunksOf = async (size: number): Promise<Log[]> => {
    const logs: Log[] = []
    for (let start = fromBlock; start <= toBlock; start += size) {
      // oxlint-disable-next-line no-await-in-loop
      const chunk = await getLogsWithAdaptiveRange(
        provider,
        topics,
        start,
        Math.min(start + size - 1, toBlock),
      )
      logs.push(...chunk)
    }
    return logs
  }

  if (limits.maxBlockRange !== undefined && blockCount > limits.maxBlockRange) {
    return inChunksOf(limits.maxBlockRange)
  }

  try {
    return await provider.getLogs({ topics, fromBlock, toBlock })
  } catch (error) {
    const advertised = advertisedBlockRangeLimit(error)
    if (advertised !== undefined && advertised < blockCount) {
      if (
        limits.maxBlockRange === undefined ||
        advertised < limits.maxBlockRange
      ) {
        limits.maxBlockRange = advertised
        logger.debug(
          `chain ${provider.chainID}: eth_getLogs allows at most ${advertised} blocks; using that from now on.`,
        )
      }
      return inChunksOf(advertised)
    }

    const suggested = suggestedBlockRange(error)
    if (suggested !== undefined && suggested < blockCount) {
      return inChunksOf(suggested)
    }

    // Only split while both halves would stay at or above the minimum chunk
    // size; below that, treat the error as a real failure.
    if (blockCount < MINIMUM_LOG_BLOCK_RANGE * 2) {
      throw error
    }

    logger.debug(
      `chain ${provider.chainID}: eth_getLogs failed for blocks ${fromBlock} to ${toBlock}; halving the range.`,
    )
    return inChunksOf(Math.ceil(blockCount / 2))
  }
}

/**
 * Convert an ethers log into the Taho {@link EVMLog} shape understood by
 * {@link parseLogsForERC20Transfers}.
 */
function evmLogFromEthersLog({ address, data, topics }: Log): EVMLog {
  return { contractAddress: address, data, topics }
}

/**
 * Discover ERC-20 transfer activity for an account using only standard
 * `eth_getLogs` calls. This is the fallback used on networks whose RPC
 * endpoints do not support Alchemy's enhanced `alchemy_getAssetTransfers` API;
 * the resulting `AssetTransfer`s are shaped identically to the ones produced by
 * `getAssetTransfers` in `lib/boar.ts`, so downstream consumers---token
 * discovery in the indexing service and transaction backfill in the chain
 * service---behave the same way.
 *
 * Two important differences from the Alchemy-backed version:
 *
 * - Only ERC-20 `Transfer` events are captured. Native asset transfers,
 *   whether external (a plain value-bearing transaction) or internal (value
 *   moved by a contract call), emit no logs and are therefore *not* returned
 *   here. Callers that need native transfers must source them elsewhere.
 * - The `name`/`symbol`/`decimals` of the transferred asset are not knowable
 *   from a log alone, so they are left empty/zero. The asset carries its
 *   `contractAddress` and `homeNetwork`, which is what consumers use to look
 *   real metadata up---the indexing service resolves metadata by contract
 *   address via `addTokenToTrackByContract`, and the chain service only uses
 *   the transfer's `txHash`. The field set otherwise matches the ERC-20 branch
 *   of the Boar implementation (`lib/boar.ts` lines 122-140).
 *
 * Note that cost grows with the width of the block range: each network round
 * trip covers a range that the provider is willing to serve, so a very wide
 * range can fan out into many sequential requests. Ranges are not truncated,
 * on the theory that a slow correct answer beats a fast incomplete one, but
 * callers should prefer bounded ranges.
 *
 * @param provider the provider to run `eth_getLogs` against; must be connected
 *        to the same network as `addressOnNetwork`, or results are undefined.
 * @param addressOnNetwork the address whose transfer activity we're looking up
 *        and the network to look it up on.
 * @param fromBlock the inclusive block height to start looking at.
 * @param toBlock the inclusive block height to stop looking at.
 * @param incomingOnly if true, only transfers *to* the address are looked up,
 *        halving the number of requests.
 */
export async function getAssetTransfersViaLogs(
  provider: SerialFallbackProvider,
  addressOnNetwork: AddressOnNetwork,
  fromBlock: number,
  toBlock: number,
  incomingOnly = false,
): Promise<AssetTransfer[]> {
  const { address, network } = addressOnNetwork

  // Indexed address topics are 32-byte left-padded; normalize first so casing
  // can't trip up providers that compare topics as raw strings.
  const paddedAddress = utils.hexZeroPad(normalizeEVMAddress(address), 32)

  const incomingLogs = await getLogsWithAdaptiveRange(
    provider,
    [ERC20_TRANSFER_TOPIC, null, paddedAddress],
    fromBlock,
    toBlock,
  )

  const outgoingLogs = incomingOnly
    ? []
    : await getLogsWithAdaptiveRange(
        provider,
        [ERC20_TRANSFER_TOPIC, paddedAddress],
        fromBlock,
        toBlock,
      )

  logger.debug(
    "Found",
    incomingLogs.length,
    "incoming and",
    outgoingLogs.length,
    "outgoing ERC-20 transfer logs for",
    address,
    "on chain",
    network.chainID,
    "between blocks",
    fromBlock,
    "and",
    toBlock,
  )

  // A transfer from an address to itself matches both queries; de-duplicate by
  // the unique (transaction hash, log index) pair so it's only counted once.
  const seenLogIds = new Set<string>()

  return [...incomingLogs, ...outgoingLogs].flatMap((log) => {
    const logId = `${log.transactionHash}-${log.logIndex}`

    if (seenLogIds.has(logId)) {
      return []
    }
    seenLogIds.add(logId)

    // Parse one log at a time; undecodable logs are dropped by the parser, and
    // parsing in isolation keeps each decoded transfer paired with the log it
    // came from.
    const [transfer] = parseLogsForERC20Transfers([evmLogFromEthersLog(log)])

    if (transfer === undefined) {
      logger.debug(
        "Skipping ERC-20 transfer log that could not be decoded in tx",
        log.transactionHash,
        "at log index",
        log.logIndex,
      )
      return []
    }

    const asset: SmartContractFungibleAsset = {
      contractAddress: transfer.contractAddress,
      decimals: 0,
      name: "",
      symbol: "",
      homeNetwork: network,
    }

    const assetTransfer: AssetTransfer = {
      network,
      assetAmount: {
        asset,
        amount: transfer.amount,
      },
      txHash: log.transactionHash,
      to: transfer.recipientAddress,
      from: transfer.senderAddress,
      dataSource: "local",
    }

    return [assetTransfer]
  })
}
