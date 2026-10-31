import logger from "../../lib/logger"
import type { AddressOnNetwork } from "../../accounts"
import type { AssetTransfer } from "../../assets"
import type { EVMNetwork } from "../../networks"
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
const BLOCKS_PER_TRANSFER_LOG_SCAN = 5000

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
}

/**
 * Finds asset transfers for tracked accounts, recent ones on alarms and
 * older ones a block range at a time, and queues their transactions for
 * lookup.
 */
export default class AssetTransferScanner {
  constructor(
    private readonly dependencies: AssetTransferScannerDependencies,
  ) {}

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

  /** Scans one account's recent blocks; failures are logged. */
  async scanRecentTransfersFor(
    addressNetwork: AddressOnNetwork,
    { incomingOnly = false }: { incomingOnly?: boolean } = {},
  ): Promise<void> {
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
    const fromBlock = Math.max(0, blockHeight - blocksToLookBack)

    try {
      await this.scanBlocks(
        addressNetwork,
        BigInt(fromBlock),
        BigInt(blockHeight),
        { incomingOnly },
      )
    } catch (error) {
      logger.error(
        "Failed to load recent asset transfers",
        addressNetwork,
        error,
      )
    }
  }

  /**
   * Scans the blocks before the oldest one scanned so far for an account.
   * Networks without Alchemy's transfer lookups move back one bounded chunk
   * per call, since each scan there is many `eth_getLogs` requests.
   */
  async scanHistoricTransfersFor(
    addressNetwork: AddressOnNetwork,
  ): Promise<void> {
    const { db, getBlockHeight, supportsAlchemyMethods } = this.dependencies
    const oldest =
      (await db.getOldestAccountAssetTransferLookup(addressNetwork)) ??
      BigInt(await getBlockHeight(addressNetwork.network))

    if (oldest === 0n) {
      return
    }

    const chunkSize = BigInt(BLOCKS_PER_TRANSFER_LOG_SCAN)
    const startBlock =
      supportsAlchemyMethods(addressNetwork.network) || oldest <= chunkSize
        ? 0n
        : oldest - chunkSize

    await this.scanBlocks(addressNetwork, startBlock, oldest)
  }

  /**
   * Finds an account's transfers in a block range, records the range as
   * scanned, emits the transfers, and queues lookups for their transactions.
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

    const assetTransfers = await assetData.getAssetTransfers(
      addressNetwork,
      Number(startBlock),
      Number(endBlock),
      incomingOnly,
    )

    await db.recordAccountAssetTransferLookup(
      addressNetwork,
      startBlock,
      endBlock,
    )

    this.dependencies.emitAssetTransfers(addressNetwork, assetTransfers)

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
