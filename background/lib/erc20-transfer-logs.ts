import type { Filter, Log } from "@ethersproject/abstract-provider"
import { utils } from "ethers"

import { AddressOnNetwork } from "../accounts"
import { AssetTransfer, SmartContractFungibleAsset } from "../assets"
import { EVMLog } from "../networks"
import type SerialFallbackProvider from "../services/chain/serial-fallback-provider"
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
 * The smallest block range this module will request from a provider. When an
 * `eth_getLogs` call fails, the requested range is halved and retried, but
 * never past the point where a half would be smaller than this many blocks;
 * at that point the underlying error is allowed to propagate, as the failure
 * is unlikely to be a range-size problem.
 *
 * The value has to be low enough that halving can actually get under the
 * range caps real endpoints advertise. Callers scan in 5000-block passes (see
 * `BLOCKS_PER_TRANSFER_LOG_SCAN`), and halving 5000 walks 2500 → 1250 → 625 →
 * 313 → 157; splitting stops once a half would fall below this floor, so a
 * floor of 100 lets chunks reach ~156 blocks. That clears the 500- and
 * 1000-block caps that are common among public endpoints. A floor of 1000
 * stopped at ~1250-block chunks, which such an endpoint rejects every time —
 * and since the caller retries the identical range on the next alarm, those
 * endpoints could never make progress at all.
 */
export const MINIMUM_LOG_BLOCK_RANGE = 100

/**
 * Fetch logs matching the passed topics between `fromBlock` and `toBlock`
 * (both inclusive), adapting to providers that reject wide ranges.
 *
 * The full range is attempted first. If the provider throws for any reason---
 * be it an explicit block range limit, a too-many-results error, or a
 * timeout---the range is split in half and each half is fetched sequentially,
 * recursively. Halves are fetched one at a time rather than in parallel to
 * avoid amplifying load on a provider that is already refusing requests.
 *
 * Splitting stops once halving would produce a chunk smaller than
 * {@link MINIMUM_LOG_BLOCK_RANGE} blocks, at which point the provider error
 * propagates to the caller.
 */
async function getLogsWithAdaptiveRange(
  provider: SerialFallbackProvider,
  topics: Filter["topics"],
  fromBlock: number,
  toBlock: number,
): Promise<Log[]> {
  try {
    return await provider.getLogs({ topics, fromBlock, toBlock })
  } catch (error) {
    const blockCount = toBlock - fromBlock + 1

    // Only split while both halves would stay at or above the minimum chunk
    // size; below that, treat the error as a real failure.
    if (blockCount < MINIMUM_LOG_BLOCK_RANGE * 2) {
      throw error
    }

    const midBlock = fromBlock + Math.floor((toBlock - fromBlock) / 2)

    logger.debug(
      "Failed to fetch ERC-20 transfer logs for block range",
      fromBlock,
      "-",
      toBlock,
      "; splitting range in half and retrying.",
      error,
    )

    const firstHalf = await getLogsWithAdaptiveRange(
      provider,
      topics,
      fromBlock,
      midBlock,
    )
    const secondHalf = await getLogsWithAdaptiveRange(
      provider,
      topics,
      midBlock + 1,
      toBlock,
    )

    return [...firstHalf, ...secondHalf]
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
