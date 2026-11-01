import { SECOND } from "../../constants"
import { FeatureFlags, isEnabled } from "../../features"
import {
  getERC721TransferPage,
  getFirstIncomingTransferBlock,
} from "../../lib/boar"
import {
  getERC721TransfersViaLogs,
  learntMaxBlockRange,
} from "../../lib/erc20-transfer-logs"
import logger from "../../lib/logger"
import { normalizeEVMAddress } from "../../lib/utils"
import type { AddressOnNetwork } from "../../accounts"
import type { EVMNetwork } from "../../networks"
import type { ERC721Transfer } from "../../nfts"
import { LogHistoryUnavailableError } from "./rpc/log-query-errors"
import type { BlockRange, ChainDatabase, NFTLogScanCursor } from "./db"
import type SerialFallbackProvider from "./serial-fallback-provider"

/**
 * Blocks per step when the endpoints haven't said how many they allow;
 * Boar's `eth_getLogs` cap.
 */
export const NFT_LOG_SCAN_STEP_BLOCKS = 10_000

/**
 * Steps per chain per tick, shared by its accounts. Each step is two
 * `eth_getLogs` requests, so a tick a minute sends a chain at most ten.
 */
export const NFT_LOG_SCAN_STEPS_PER_TICK = 5

/** How long a tick keeps starting steps on a chain. */
export const NFT_LOG_SCAN_TICK_MS = 20 * SECOND

/**
 * Pages of Alchemy's ERC-721 transfers, a thousand each, fetched per
 * direction when an account's scan starts.
 */
export const NFT_PRIME_PAGES = 3

/** Blocks below the head left for nodes to catch up, as other scans do. */
const BLOCKS_TO_SKIP = 20

/** Failed lookups of an account's first transfer before scanning from genesis. */
const FIRST_TRANSFER_ATTEMPTS = 3

/** The lookups the scanner makes, replaceable in tests. */
export type NFTLogScanLookups = {
  viaLogs: typeof getERC721TransfersViaLogs
  page: typeof getERC721TransferPage
  firstTransferBlock: typeof getFirstIncomingTransferBlock
  maxBlockRange: typeof learntMaxBlockRange
}

const defaultLookups: NFTLogScanLookups = {
  viaLogs: getERC721TransfersViaLogs,
  page: getERC721TransferPage,
  firstTransferBlock: getFirstIncomingTransferBlock,
  maxBlockRange: learntMaxBlockRange,
}

export type NFTLogScannerDependencies = {
  db: Pick<ChainDatabase, "getNFTLogScanCursor" | "putNFTLogScanCursors">
  accountsToTrack: () => Promise<AddressOnNetwork[]>
  providerFor: (network: EVMNetwork) => SerialFallbackProvider | undefined
  getBlockHeight: (network: EVMNetwork) => Promise<number>
  emitNFTTransfers: (
    addressNetwork: AddressOnNetwork,
    nftTransfers: ERC721Transfer[],
  ) => void
  lookups?: NFTLogScanLookups
  now?: () => number
}

/** An account's cursor and what this tick found for it. */
type AccountScan = {
  addressNetwork: AddressOnNetwork
  cursor: NFTLogScanCursor
  found: ERC721Transfer[]
}

function cursorID(chainID: string, address: string): string {
  return `${chainID}:${normalizeEVMAddress(address)}`
}

/** Queues the blocks up to `head` the cursor hasn't reached. */
function withNewBlocks(
  cursor: NFTLogScanCursor,
  head: number,
): NFTLogScanCursor {
  if (head <= cursor.newestBlock) {
    return cursor
  }
  const [newest, ...rest] = cursor.pending
  const pending =
    newest?.toBlock === cursor.newestBlock
      ? [{ fromBlock: newest.fromBlock, toBlock: head }, ...rest]
      : [
          { fromBlock: cursor.newestBlock + 1, toBlock: head },
          ...cursor.pending,
        ]
  return { ...cursor, newestBlock: head, pending }
}

/** Drops the pending blocks before `earliest`. */
function withoutBlocksBefore(
  pending: BlockRange[],
  earliest: number,
): BlockRange[] {
  return pending.flatMap((range) =>
    range.toBlock < earliest
      ? []
      : [{ ...range, fromBlock: Math.max(range.fromBlock, earliest) }],
  )
}

/**
 * Finds ERC-721 transfers on Alchemy-capable networks from `Transfer` logs,
 * whose transfer API returns too few to see an account's whole NFT history.
 *
 * Each account starts with a few pages of Alchemy's ERC-721 transfers, then
 * scans logs down to the block it first received anything in, newest blocks
 * first. Ticks take a few steps per chain and keep where they got to, so a
 * long history is scanned over many ticks and restarts.
 */
export default class NFTLogScanner {
  private running: Promise<void> | undefined

  private readonly firstTransferFailures = new Map<string, number>()

  constructor(private readonly dependencies: NFTLogScannerDependencies) {}

  private get lookups(): NFTLogScanLookups {
    return this.dependencies.lookups ?? defaultLookups
  }

  private now(): number {
    return this.dependencies.now?.() ?? Date.now()
  }

  /**
   * Takes a tick's steps on every Alchemy-capable chain, with the NFT
   * indexer on. A tick called while one runs joins it.
   */
  async tick(): Promise<void> {
    if (!isEnabled(FeatureFlags.SUPPORT_NFT_INDEXER)) {
      return
    }
    this.running ??= this.tickChains().finally(() => {
      this.running = undefined
    })
    await this.running
  }

  private async tickChains(): Promise<void> {
    const { accountsToTrack, providerFor } = this.dependencies
    const byChain = new Map<string, Map<string, AddressOnNetwork>>()
    ;(await accountsToTrack()).forEach((addressNetwork) => {
      const { chainID } = addressNetwork.network
      if (providerFor(addressNetwork.network)?.supportsAlchemyMethods) {
        const accounts = byChain.get(chainID) ?? new Map()
        accounts.set(cursorID(chainID, addressNetwork.address), addressNetwork)
        byChain.set(chainID, accounts)
      }
    })
    await Promise.all(
      [...byChain].map(async ([chainID, accounts]) => {
        try {
          await this.tickChain([...accounts.values()])
        } catch (error) {
          logger.warn(
            `chain ${chainID}: couldn't scan for NFT transfers; trying again later.`,
            error,
          )
        }
      }),
    )
  }

  /** Whether the provider can take a request for the method now. */
  private static isServing(
    provider: SerialFallbackProvider,
    method: string,
  ): boolean {
    return provider.reachability === "reachable" && provider.canServeNow(method)
  }

  /**
   * Takes up to {@link NFT_LOG_SCAN_STEPS_PER_TICK} steps on one chain, one
   * account at a time in turn, then reports what they found and keeps the
   * cursors. At most one account's scan starts per tick.
   */
  private async tickChain(accounts: AddressOnNetwork[]): Promise<void> {
    const { db, getBlockHeight, providerFor } = this.dependencies
    const { network } = accounts[0]
    const provider = providerFor(network)
    if (
      provider === undefined ||
      !NFTLogScanner.isServing(provider, "eth_getLogs")
    ) {
      return
    }
    const head = (await getBlockHeight(network)) - BLOCKS_TO_SKIP

    const scans: AccountScan[] = []
    let started = false
    for (const addressNetwork of accounts) {
      const id = cursorID(network.chainID, addressNetwork.address)
      // oxlint-disable-next-line no-await-in-loop
      let cursor = await db.getNFTLogScanCursor(id)
      if (cursor === undefined && !started) {
        started = true
        // oxlint-disable-next-line no-await-in-loop
        cursor = await this.start(provider, addressNetwork, head)
      }
      if (cursor !== undefined) {
        scans.push({
          addressNetwork,
          cursor: withNewBlocks(cursor, head),
          found: [],
        })
      }
    }

    try {
      await this.takeSteps(provider, scans)
    } finally {
      scans.forEach(({ addressNetwork, found }) => {
        if (found.length > 0) {
          this.dependencies.emitNFTTransfers(addressNetwork, found)
        }
      })
      await db.putNFTLogScanCursors(scans.map(({ cursor }) => cursor))
    }
  }

  private async takeSteps(
    provider: SerialFallbackProvider,
    scans: AccountScan[],
  ): Promise<void> {
    const deadline = this.now() + NFT_LOG_SCAN_TICK_MS
    let waiting = scans.filter(({ cursor }) => cursor.pending.length > 0)
    let turn = 0
    let steps = 0
    while (
      waiting.length > 0 &&
      steps < NFT_LOG_SCAN_STEPS_PER_TICK &&
      this.now() < deadline &&
      NFTLogScanner.isServing(provider, "eth_getLogs")
    ) {
      const scan = waiting[turn % waiting.length]
      // oxlint-disable-next-line no-await-in-loop
      const stepped = await this.step(provider, scan)
      steps += 1
      if (!stepped) {
        return
      }
      if (scan.cursor.pending.length === 0) {
        waiting = waiting.filter((other) => other !== scan)
      } else {
        turn += 1
      }
    }
  }

  /**
   * Scans the newest step's worth of an account's pending blocks. Returns
   * false if the scan failed for a reason other than pruned history.
   */
  private async step(
    provider: SerialFallbackProvider,
    scan: AccountScan,
  ): Promise<boolean> {
    const { cursor, addressNetwork } = scan
    const [range, ...rest] = cursor.pending
    const stepBlocks = Math.min(
      this.lookups.maxBlockRange(provider) ?? NFT_LOG_SCAN_STEP_BLOCKS,
      NFT_LOG_SCAN_STEP_BLOCKS,
    )
    const stepFrom = Math.max(range.fromBlock, range.toBlock - stepBlocks + 1)
    try {
      const transfers = await this.lookups.viaLogs(
        provider,
        addressNetwork,
        stepFrom,
        range.toBlock,
      )
      scan.found.push(...transfers)
      scan.cursor = {
        ...cursor,
        pending:
          stepFrom > range.fromBlock
            ? [{ fromBlock: range.fromBlock, toBlock: stepFrom - 1 }, ...rest]
            : rest,
      }
      return true
    } catch (error) {
      if (error instanceof LogHistoryUnavailableError) {
        logger.debug(
          `chain ${cursor.chainID}: no logs are kept before block ${error.earliestBlock}, so the NFT log scan stops there.`,
        )
        scan.cursor = {
          ...cursor,
          pending: withoutBlocksBefore(cursor.pending, error.earliestBlock),
        }
        return true
      }
      logger.warn(
        `chain ${cursor.chainID}: couldn't scan blocks ${stepFrom} to ${range.toBlock} for NFT transfers; trying again later.`,
        { address: addressNetwork.address },
        error,
      )
      return false
    }
  }

  /**
   * Starts an account's scan: reports a few pages of Alchemy's ERC-721
   * transfers and queues the blocks from its first transfer to `head`.
   * Without a first transfer it only scans new blocks. Returns nothing if
   * the first transfer couldn't be found and is worth asking again.
   */
  private async start(
    provider: SerialFallbackProvider,
    addressNetwork: AddressOnNetwork,
    head: number,
  ): Promise<NFTLogScanCursor | undefined> {
    const { chainID } = addressNetwork.network
    const id = cursorID(chainID, addressNetwork.address)
    if (!NFTLogScanner.isServing(provider, "alchemy_getAssetTransfers")) {
      return undefined
    }

    let floor: number
    try {
      floor =
        (await this.lookups.firstTransferBlock(provider, addressNetwork)) ??
        head + 1
    } catch (error) {
      const failures = (this.firstTransferFailures.get(id) ?? 0) + 1
      this.firstTransferFailures.set(id, failures)
      logger.warn(
        `chain ${chainID}: couldn't find the first transfer to scan NFT logs from.`,
        { address: addressNetwork.address },
        error,
      )
      if (failures < FIRST_TRANSFER_ATTEMPTS) {
        return undefined
      }
      floor = 0
    }
    this.firstTransferFailures.delete(id)

    await this.prime(provider, addressNetwork)

    return {
      id,
      chainID,
      account: normalizeEVMAddress(addressNetwork.address),
      newestBlock: head,
      pending: floor <= head ? [{ fromBlock: floor, toBlock: head }] : [],
    }
  }

  /** Reports up to {@link NFT_PRIME_PAGES} pages of transfers each way. */
  private async prime(
    provider: SerialFallbackProvider,
    addressNetwork: AddressOnNetwork,
  ): Promise<void> {
    await Promise.all(
      (["incoming", "outgoing"] as const).map(async (direction) => {
        let pageKey: string | undefined
        try {
          for (let page = 0; page < NFT_PRIME_PAGES; page += 1) {
            // oxlint-disable-next-line no-await-in-loop
            const result = await this.lookups.page(
              provider,
              addressNetwork,
              direction,
              pageKey,
            )
            if (result.nftTransfers.length > 0) {
              this.dependencies.emitNFTTransfers(
                addressNetwork,
                result.nftTransfers,
              )
            }
            pageKey = result.pageKey
            if (pageKey === undefined) {
              return
            }
          }
        } catch (error) {
          logger.warn(
            `chain ${addressNetwork.network.chainID}: couldn't load ${direction} NFT transfers from Alchemy; the log scan will find them.`,
            { address: addressNetwork.address },
            error,
          )
        }
      }),
    )
  }
}
