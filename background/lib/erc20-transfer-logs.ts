import type { Filter, Log } from "@ethersproject/abstract-provider"
import { utils } from "ethers"

import { AddressOnNetwork } from "../accounts"
import { AssetTransfer, SmartContractFungibleAsset } from "../assets"
import { EVMLog } from "../networks"
import type { ERC721Transfer, ScannedTransfers } from "../nfts"
import type SerialFallbackProvider from "../services/chain/serial-fallback-provider"
import {
  advertisedBlockRangeLimit,
  earliestAvailableBlock,
  isLogRangeRefusal,
  isMethodNotFoundError,
  isPrunedHistoryError,
  LogHistoryUnavailableError,
  LogScanPausedError,
  MINIMUM_LOG_BLOCK_RANGE,
  suggestedBlockRange,
} from "../services/chain/rpc/log-query-errors"
import { AdaptiveSize } from "./adaptive-size"
import { ERC20_INTERFACE, parseLogsForERC20Transfers } from "./erc20"
import { parseERC721TransferLog } from "./erc721"
import logger from "./logger"
import { normalizeEVMAddress } from "./utils"

/**
 * The topic hash of the standard ERC-20
 * `Transfer(address indexed from, address indexed to, uint256 value)` event,
 * derived from the shared ERC-20 interface rather than hardcoded.
 */
export const ERC20_TRANSFER_TOPIC = ERC20_INTERFACE.getEventTopic("Transfer")

export { MINIMUM_LOG_BLOCK_RANGE }

/** What a provider's endpoints have said about log queries this session. */
type LogQueryLimits = {
  /**
   * The widest block range the endpoints accept, whether advertised or
   * learned from failures.
   */
  range: AdaptiveSize
  /** The earliest block they still keep logs for. */
  earliestBlock?: number
}

const limitsByProvider = new WeakMap<object, LogQueryLimits>()

function limitsFor(provider: SerialFallbackProvider): LogQueryLimits {
  let limits = limitsByProvider.get(provider)
  if (limits === undefined) {
    limits = {
      range: new AdaptiveSize(
        `chain ${provider.chainID}: eth_getLogs`,
        "blocks",
        MINIMUM_LOG_BLOCK_RANGE,
      ),
    }
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
  return limitsByProvider.get(provider)?.range.max
}

/**
 * The earliest block a provider's endpoints said they keep logs for this
 * session, if any did.
 */
export function learntEarliestLogBlock(
  provider: SerialFallbackProvider,
): number | undefined {
  return limitsByProvider.get(provider)?.earliestBlock
}

/**
 * Fetch logs matching the passed topics between `fromBlock` and `toBlock`
 * (both inclusive), adapting to providers that reject wide ranges.
 *
 * The range is sized by the provider's {@link AdaptiveSize}. A range wider
 * than its endpoints have advertised, or wider than one that previously timed
 * out, is fetched in chunks that fit. A refused range is retried at the width
 * the refusal names, or otherwise in halves down to
 * {@link MINIMUM_LOG_BLOCK_RANGE}. Rate limits, range complaints that mean no
 * range would be served (see {@link isLogRangeRefusal}) and endpoints that
 * don't serve `eth_getLogs` at all are thrown rather than split.
 * Chunks are fetched one at a time so a provider that is already refusing
 * requests isn't sent more of them.
 *
 * Before each request, if the chain can't take log queries right now, the
 * scan stops with a {@link LogScanPausedError}.
 *
 * Pruned history works the same way: the earliest block an endpoint keeps is
 * remembered, the range starts there, and a range entirely before it throws
 * {@link LogHistoryUnavailableError}. When the endpoint doesn't say which
 * block is earliest, the range asked for is taken as too old.
 */
async function getLogsWithAdaptiveRange(
  provider: SerialFallbackProvider,
  topics: Filter["topics"],
  fromBlock: number,
  toBlock: number,
): Promise<Log[]> {
  if (
    provider.reachability === "unreachable" ||
    !provider.canServeNow("eth_getLogs")
  ) {
    throw new LogScanPausedError(provider.chainID)
  }

  const limits = limitsFor(provider)
  const { earliestBlock } = limits
  if (earliestBlock !== undefined && fromBlock < earliestBlock) {
    if (toBlock < earliestBlock) {
      throw new LogHistoryUnavailableError(provider.chainID, earliestBlock)
    }
    return getLogsWithAdaptiveRange(provider, topics, earliestBlock, toBlock)
  }

  const blockCount = toBlock - fromBlock + 1

  const inChunksOf = async (size: number): Promise<Log[]> => {
    const logs: Log[] = []
    let unavailable: LogHistoryUnavailableError | undefined
    let served = false
    for (let start = fromBlock; start <= toBlock; start += size) {
      try {
        // oxlint-disable-next-line no-await-in-loop
        const chunk = await getLogsWithAdaptiveRange(
          provider,
          topics,
          start,
          Math.min(start + size - 1, toBlock),
        )
        logs.push(...chunk)
        served = true
      } catch (error) {
        // Later chunks may be recent enough.
        if (!(error instanceof LogHistoryUnavailableError)) {
          throw error
        }
        unavailable = error
      }
    }
    if (unavailable !== undefined && !served) {
      throw unavailable
    }
    return logs
  }

  if (limits.range.max !== undefined && !limits.range.fits(blockCount)) {
    return inChunksOf(limits.range.max)
  }

  try {
    return await provider.getLogs({ topics, fromBlock, toBlock })
  } catch (error) {
    if (isPrunedHistoryError(error)) {
      const earliest = earliestAvailableBlock(error) ?? toBlock + 1
      // An earliest block within what was asked for can't explain the error.
      if (earliest <= fromBlock) {
        throw error
      }
      limits.earliestBlock = Math.max(limits.earliestBlock ?? 0, earliest)
      logger.debug(
        `chain ${provider.chainID}: eth_getLogs keeps no logs before block ${limits.earliestBlock}; starting there from now on.`,
      )
      return getLogsWithAdaptiveRange(provider, topics, fromBlock, toBlock)
    }

    // The provider has already asked its other endpoints, and a narrower
    // range would be refused the same way, as would any range by an endpoint
    // without `eth_getLogs`. Note that the limit a refusal names isn't learned
    // either, since learned limits narrow every endpoint.
    if (isLogRangeRefusal(error, blockCount) || isMethodNotFoundError(error)) {
      throw error
    }
    const retrySize = limits.range.retrySizeAfter(error, blockCount, {
      advertised: advertisedBlockRangeLimit(error),
      suggested: suggestedBlockRange(error),
    })
    if (retrySize === undefined) {
      throw error
    }
    return inChunksOf(retrySize)
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
 * An account's `Transfer` logs in a block range, incoming then outgoing. A
 * transfer from the account to itself matches both queries and is returned
 * once.
 */
async function getTransferLogs(
  provider: SerialFallbackProvider,
  { address, network }: AddressOnNetwork,
  fromBlock: number,
  toBlock: number,
  incomingOnly: boolean,
): Promise<Log[]> {
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
    "outgoing transfer logs for",
    address,
    "on chain",
    network.chainID,
    "between blocks",
    fromBlock,
    "and",
    toBlock,
  )

  // De-duplicate by the unique (transaction hash, log index) pair.
  const seenLogIds = new Set<string>()
  return [...incomingLogs, ...outgoingLogs].filter((log) => {
    const logId = `${log.transactionHash}-${log.logIndex}`
    if (seenLogIds.has(logId)) {
      return false
    }
    seenLogIds.add(logId)
    return true
  })
}

/**
 * Discover ERC-20 and ERC-721 transfer activity for an account using only
 * standard `eth_getLogs` calls. This is the fallback used on networks whose
 * RPC endpoints do not support Alchemy's enhanced `alchemy_getAssetTransfers`
 * API; the resulting `AssetTransfer`s are shaped identically to the ones
 * produced by `getAssetTransfers` in `lib/boar.ts`, so downstream
 * consumers---token discovery in the indexing service and transaction
 * backfill in the chain service---behave the same way.
 *
 * ERC-20 and ERC-721 `Transfer` share a topic hash, so the same queries find
 * both. Logs with three topics are ERC-20 transfers, and logs with four, whose
 * last topic is the token ID, are ERC-721 transfers, returned as
 * `nftTransfers`.
 *
 * Two important differences from the Alchemy-backed version:
 *
 * - Only `Transfer` events are captured. Native asset transfers, whether
 *   external (a plain value-bearing transaction) or internal (value moved by a
 *   contract call), emit no logs and are therefore *not* returned here.
 *   Callers that need native transfers must source them elsewhere.
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
): Promise<ScannedTransfers> {
  const { network } = addressOnNetwork
  const logs = await getTransferLogs(
    provider,
    addressOnNetwork,
    fromBlock,
    toBlock,
    incomingOnly,
  )

  const assetTransfers: AssetTransfer[] = []
  const nftTransfers: ERC721Transfer[] = []

  logs.forEach((log) => {
    if (log.topics.length === 4) {
      const nftTransfer = parseERC721TransferLog(log, network)
      if (nftTransfer !== undefined) {
        nftTransfers.push(nftTransfer)
      }
      return
    }

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
      return
    }

    const asset: SmartContractFungibleAsset = {
      contractAddress: transfer.contractAddress,
      decimals: 0,
      name: "",
      symbol: "",
      homeNetwork: network,
    }

    assetTransfers.push({
      network,
      assetAmount: {
        asset,
        amount: transfer.amount,
      },
      txHash: log.transactionHash,
      to: transfer.recipientAddress,
      from: transfer.senderAddress,
      dataSource: "local",
    })
  })

  return { assetTransfers, nftTransfers }
}

/**
 * Discover only an account's ERC-721 transfers from `Transfer` logs, for
 * networks whose ERC-20 transfers come from Alchemy's API. The queries are
 * those of {@link getAssetTransfersViaLogs}; logs with three topics, ERC-20
 * transfers, are dropped.
 */
export async function getERC721TransfersViaLogs(
  provider: SerialFallbackProvider,
  addressOnNetwork: AddressOnNetwork,
  fromBlock: number,
  toBlock: number,
): Promise<ERC721Transfer[]> {
  const logs = await getTransferLogs(
    provider,
    addressOnNetwork,
    fromBlock,
    toBlock,
    false,
  )
  return logs.flatMap(
    (log) => parseERC721TransferLog(log, addressOnNetwork.network) ?? [],
  )
}
