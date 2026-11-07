import logger from "../../lib/logger"
import { LogHistoryUnavailableError } from "./rpc/log-query-errors"
import type { AddressOnNetwork } from "../../accounts"
import type { AssetTransfer } from "../../assets"
import type { EVMNetwork } from "../../networks"
import type { ERC721Transfer } from "../../nfts"
import type { HexString, UNIXTime } from "../../types"
import type AssetDataHelper from "./asset-data-helper"
import type { ChainDatabase } from "./db"

// The number of blocks to query at a time for historic asset transfers.
// Unfortunately there's no "right" answer here that works well across different
// people's account histories. If the number is too large relative to a
// frequently used account, the first call will time out and waste provider
// resources... resulting in an exponential backoff. If it's too small,
// transaction history will appear "slow" to show up for newly imported
// accounts.
const BLOCKS_FOR_TRANSACTION_HISTORY = 128000

// The number of blocks to query at a time on networks with no Alchemy-capable
// endpoint, where asset transfers are discovered by scanning ERC-20 `Transfer`
// logs (see `lib/erc20-transfer-logs.ts`) instead of by a single enhanced-API
// call.
//
// The two paths price block ranges completely differently. Alchemy's transfer
// API answers any range in one request, so the range width above costs the
// same as a narrow one. `eth_getLogs`, on the other hand, is capped per
// request by every endpoint that serves it---10,000 blocks is a common
// limit---so a range wider than the cap is rejected, halved, and retried until
// the pieces fit, turning one logical lookup into dozens or thousands of
// requests. Keeping each scan comfortably under the usual caps keeps it at one
// request per direction, and the recurring recent/historic alarms below are
// what extend coverage over time.
export const BLOCKS_PER_TRANSFER_LOG_SCAN = 5000

// The number of blocks before the current block height to start looking for
// asset transfers. This is important to allow nodes like Erigon and
// OpenEthereum with tracing to catch up to where we are.
const BLOCKS_TO_SKIP_FOR_TRANSACTION_HISTORY = 20

// Transfers whose transactions are looked up first, per account. Accounts
// keep the order they were added in.
const TRANSACTIONS_WITH_PRIORITY_MAX_COUNT = 25

export type AssetTransferScannerDependencies = {
  db: ChainDatabase
  assetData: AssetDataHelper
  getBlockHeight: (network: EVMNetwork) => Promise<number>
  accountsToTrack: (options: {
    activeAccountsOnly: boolean
  }) => Promise<AddressOnNetwork[]>
  isSupported: (network: EVMNetwork) => boolean
  /** Whether a network can serve Alchemy's transfer lookups. */
  supportsAlchemyMethods: (network: EVMNetwork) => boolean
  /** Whether a network has an endpoint for the method that isn't cooling. */
  canServeNow: (network: EVMNetwork, method: string) => boolean
  /** Whether every endpoint for the method has refused it within a day. */
  refusesEverywhere: (network: EVMNetwork, method: string) => boolean
  enqueueTransactionLookup: (
    network: EVMNetwork,
    hash: HexString,
    firstSeen: UNIXTime,
    priority: number,
  ) => void
  emitAssetTransfers: (
    addressNetwork: AddressOnNetwork,
    assetTransfers: AssetTransfer[],
  ) => void
  emitNFTTransfers: (
    addressNetwork: AddressOnNetwork,
    nftTransfers: ERC721Transfer[],
  ) => void
}

/**
 * Logs a scan that failed, once, where the scan is handled. History the
 * endpoints no longer keep is where a backwards scan stops, not a failure.
 */
function logScanFailure(
  kind: "recent" | "historic",
  { address, network }: AddressOnNetwork,
  range: { startBlock: bigint; endBlock: bigint } | undefined,
  error: unknown,
): void {
  if (error instanceof LogHistoryUnavailableError) {
    logger.debug(
      `chain ${network.chainID}: no logs are kept before block ${error.earliestBlock}, so ${kind} asset transfers stop there.`,
    )
    return
  }
  const blocks =
    range === undefined
      ? ""
      : ` in blocks ${range.startBlock} to ${range.endBlock}`
  logger.warn(
    `chain ${network.chainID}: couldn't load ${kind} asset transfers${blocks}; trying again later.`,
    { address },
    error,
  )
}

/**
 * Finds asset transfers for tracked accounts, recent ones on alarms and
 * older ones a block range at a time, and queues their transactions for
 * lookup.
 */
export default class AssetTransferScanner {
  // Chains whose endpoints all refuse log queries, so they've been told so.
  private readonly chainsRefusingLogs = new Set<string>()

  constructor(
    private readonly dependencies: AssetTransferScannerDependencies,
  ) {}

  /**
   * Checks whether a network's transfers can only come from log queries that
   * every one of its endpoints refuses, as on Rootstock, whose public nodes
   * answer that `eth_getLogs` doesn't exist. Asking again would only fail
   * every account the same way on every scan, so scans skip the network and
   * this is logged once.
   *
   * Note that this lifts once the network has an endpoint that hasn't
   * refused, such as a custom RPC added for it, or a day after its endpoints
   * refused, when they're asked again.
   */
  private refusesLogScans({ network }: AddressOnNetwork): boolean {
    const { supportsAlchemyMethods, refusesEverywhere } = this.dependencies
    const { chainID } = network
    if (
      supportsAlchemyMethods(network) ||
      !refusesEverywhere(network, "eth_getLogs")
    ) {
      this.chainsRefusingLogs.delete(chainID)
      return false
    }
    if (!this.chainsRefusingLogs.has(chainID)) {
      this.chainsRefusingLogs.add(chainID)
      logger.info(
        `chain ${chainID}: every endpoint refuses eth_getLogs, so asset transfers aren't scanned until its endpoints change or a day passes.`,
      )
    }
    return true
  }

  /** Scans recent blocks for every tracked account. */
  async scanRecentTransfers({
    incomingOnly = false,
    activeAccountsOnly = false,
  }: {
    incomingOnly?: boolean
    activeAccountsOnly?: boolean
  } = {}): Promise<void> {
    const accounts = await this.dependencies.accountsToTrack({
      activeAccountsOnly,
    })
    await Promise.allSettled(
      accounts.map((addressNetwork) =>
        this.scanRecentTransfersFor(addressNetwork, { incomingOnly }),
      ),
    )
  }

  /** Extends every tracked account's scanned history further back. */
  async scanHistoricTransfers(): Promise<void> {
    const accounts = await this.dependencies.accountsToTrack({
      activeAccountsOnly: false,
    })
    await Promise.allSettled(
      accounts.map((addressNetwork) =>
        this.scanHistoricTransfersFor(addressNetwork),
      ),
    )
  }

  /**
   * Whether the network has an endpoint that can look up transfers now.
   * When every endpoint is cooling down, or refuses the log queries a scan
   * needs (see {@link refusesLogScans}), a scan would only pile up failures.
   */
  private canScanNow(addressNetwork: AddressOnNetwork, kind: string): boolean {
    if (this.refusesLogScans(addressNetwork)) {
      return false
    }
    const { network } = addressNetwork
    const { supportsAlchemyMethods, canServeNow } = this.dependencies
    const canScan =
      (supportsAlchemyMethods(network) &&
        canServeNow(network, "alchemy_getAssetTransfers")) ||
      canServeNow(network, "eth_getLogs")

    if (!canScan) {
      logger.debug(
        `chain ${network.chainID}: no endpoint can serve transfer lookups right now; skipping this ${kind} scan.`,
      )
    }
    return canScan
  }

  /** Scans one account's recent blocks; failures are logged. */
  async scanRecentTransfersFor(
    addressNetwork: AddressOnNetwork,
    { incomingOnly = false }: { incomingOnly?: boolean } = {},
  ): Promise<void> {
    if (!this.canScanNow(addressNetwork, "recent")) {
      return
    }

    const blockHeight =
      (await this.dependencies.getBlockHeight(addressNetwork.network)) -
      BLOCKS_TO_SKIP_FOR_TRANSACTION_HISTORY
    // A wide window is one enhanced-API call, but many `eth_getLogs` calls; see
    // BLOCKS_PER_TRANSFER_LOG_SCAN.
    const blocksToLookBack = this.dependencies.supportsAlchemyMethods(
      addressNetwork.network,
    )
      ? BLOCKS_FOR_TRANSACTION_HISTORY
      : BLOCKS_PER_TRANSFER_LOG_SCAN
    const startBlock = BigInt(Math.max(0, blockHeight - blocksToLookBack))
    const endBlock = BigInt(blockHeight)

    try {
      await this.scanBlocks(addressNetwork, startBlock, endBlock, {
        incomingOnly,
      })
    } catch (error) {
      if (!this.refusesLogScans(addressNetwork)) {
        logScanFailure(
          "recent",
          addressNetwork,
          { startBlock, endBlock },
          error,
        )
      }
    }
  }

  /**
   * Scans the blocks before the oldest one scanned so far for an account.
   * Networks without Alchemy's transfer lookups move back one bounded chunk
   * per call, since each scan there is many `eth_getLogs` requests.
   * Failures are logged.
   */
  async scanHistoricTransfersFor(
    addressNetwork: AddressOnNetwork,
  ): Promise<void> {
    const { db, getBlockHeight, supportsAlchemyMethods } = this.dependencies
    if (!this.canScanNow(addressNetwork, "historic")) {
      return
    }

    let range: { startBlock: bigint; endBlock: bigint } | undefined
    try {
      const oldest =
        (await db.getOldestAccountAssetTransferLookup(addressNetwork)) ??
        BigInt(await getBlockHeight(addressNetwork.network))

      if (oldest === 0n) {
        return
      }

      const chunkSize = BigInt(BLOCKS_PER_TRANSFER_LOG_SCAN)
      range = {
        startBlock:
          supportsAlchemyMethods(addressNetwork.network) || oldest <= chunkSize
            ? 0n
            : oldest - chunkSize,
        endBlock: oldest,
      }

      await this.scanBlocks(addressNetwork, range.startBlock, range.endBlock)
    } catch (error) {
      if (!this.refusesLogScans(addressNetwork)) {
        logScanFailure("historic", addressNetwork, range, error)
      }
    }
  }

  /**
   * Finds an account's transfers in a block range, records the range as
   * scanned, emits the transfers, and queues lookups for the transactions of
   * fungible ones.
   */
  async scanBlocks(
    addressNetwork: AddressOnNetwork,
    startBlock: bigint,
    endBlock: bigint,
    { incomingOnly = false }: { incomingOnly?: boolean } = {},
  ): Promise<void> {
    const { db, assetData, isSupported } = this.dependencies
    if (!isSupported(addressNetwork.network)) {
      logger.error(
        `Asset transfer check not supported on network ${JSON.stringify(
          addressNetwork.network,
        )}`,
      )
    }

    const { assetTransfers, nftTransfers, coveredFromBlock } =
      await assetData.getAssetTransfers(
        addressNetwork,
        Number(startBlock),
        Number(endBlock),
        incomingOnly,
      )

    // Only record the blocks that were actually scanned, so that a later
    // scan picks up the rest of the range.
    await db.recordAccountAssetTransferLookup(
      addressNetwork,
      coveredFromBlock === undefined ? startBlock : BigInt(coveredFromBlock),
      endBlock,
    )

    this.dependencies.emitAssetTransfers(addressNetwork, assetTransfers)
    if (nftTransfers.length > 0) {
      this.dependencies.emitNFTTransfers(addressNetwork, nftTransfers)
    }

    const firstSeen = Date.now()
    const savedTransactionHashes = new Set(
      await db.getAllSavedTransactionHashes(),
    )
    assetTransfers.forEach(({ txHash }, index) => {
      if (!savedTransactionHashes.has(txHash)) {
        this.dependencies.enqueueTransactionLookup(
          addressNetwork.network,
          txHash,
          firstSeen,
          index <= TRANSACTIONS_WITH_PRIORITY_MAX_COUNT ? 0 : 1,
        )
      }
    })
  }
}
