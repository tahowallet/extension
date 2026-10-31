import type {
  TransactionReceipt,
  TransactionResponse,
} from "@ethersproject/providers"
import { SECOND } from "../../constants"
import logger from "../../lib/logger"
import type { AnyEVMTransaction, EVMNetwork } from "../../networks"
import type { HexString, UNIXTime } from "../../types"
import type { ChainDatabase, Transaction } from "./db"
import type NonceAllocator from "./nonce-allocator"
import {
  nextPendingTransactionState,
  PendingTransactionEffect,
  PendingTransactionEvent,
  pendingTransactionSnapshot,
  PendingTransactionSnapshot,
  pendingTransactionStateFor,
} from "./pending-transaction-machine"
import type SerialFallbackProvider from "./serial-fallback-provider"
import {
  enrichTransactionWithReceipt,
  transactionFromEthersTransaction,
} from "./utils"

export type TransactionSource = Transaction["dataSource"]

export type QueuedTxToRetrieve = {
  network: EVMNetwork
  hash: HexString
  firstSeen: UNIXTime
  /** When a lookup first found nothing, if the latest one did. */
  missingSince?: UNIXTime
}

/**
 * A queued lookup and its priority; higher priorities go first, and equal
 * ones keep their order.
 */
export type PriorityQueuedTxToRetrieve = {
  transaction: QueuedTxToRetrieve
  priority: number
}

// How often to look up the next queued transaction. Spacing lookups out keeps
// them from piling onto the user's machine and the endpoints' rate limits.
const LOOKUP_INTERVAL = 2 * SECOND

export type TransactionTrackerDependencies = {
  db: ChainDatabase
  providerFor: (network: EVMNetwork) => SerialFallbackProvider
  /** For cleanup that shouldn't fail when the chain is gone. */
  existingProviderFor: (
    network: EVMNetwork,
  ) => SerialFallbackProvider | undefined
  nonceAllocator: NonceAllocator
  /** Fetches, saves and emits a block. */
  getBlockData: (network: EVMNetwork, blockHash: string) => Promise<unknown>
  /** Emits a saved transaction. */
  emitTransaction: (transaction: AnyEVMTransaction) => Promise<void>
}

/** The state a lookup works on, and what it found. */
type Lookup = {
  queued: QueuedTxToRetrieve
  stored: Transaction | null
  found?: AnyEVMTransaction
  source?: TransactionSource
  /** The row as it was when marked dropped, if it was. */
  dropped?: Transaction
}

/**
 * Looks transactions up, a queued one at a time, and follows them until they
 * confirm, drop, or expire. Each step goes through the pending transaction
 * machine, starting from what is stored.
 */
export default class TransactionTracker {
  /**
   * Lookups waiting to run. Only the timer that drains it lives in memory;
   * pending transactions are queued again from the database on startup.
   */
  transactionsToRetrieve: PriorityQueuedTxToRetrieve[] = []

  transactionToRetrieveGranularTimer: ReturnType<typeof setInterval> | undefined

  /** Lookups under way, by chain ID and hash. */
  readonly #lookingUp = new Set<string>()

  constructor(private readonly dependencies: TransactionTrackerDependencies) {}

  enqueueLookup(
    network: EVMNetwork,
    hash: HexString,
    firstSeen: UNIXTime,
    priority = 0,
    missingSince?: UNIXTime,
  ): void {
    if (this.isLookupQueued(network, hash)) {
      return
    }

    const queued: PriorityQueuedTxToRetrieve = {
      transaction: { hash, network, firstSeen, missingSince },
      priority,
    }
    // @TODO Interleave initial transaction retrieval by network
    const index = this.transactionsToRetrieve.findIndex(
      ({ priority: existing }) => priority > existing,
    )
    if (index >= 0) {
      this.transactionsToRetrieve.splice(index, 0, queued)
    } else {
      this.transactionsToRetrieve.push(queued)
    }
  }

  isLookupQueued(network: EVMNetwork, hash: HexString): boolean {
    return this.transactionsToRetrieve.some(
      ({ transaction }) =>
        transaction.hash === hash &&
        transaction.network.chainID === network.chainID,
    )
  }

  dequeueLookup(network: EVMNetwork, hash: HexString): void {
    if (this.isLookupQueued(network, hash)) {
      this.transactionsToRetrieve = this.transactionsToRetrieve.filter(
        ({ transaction }) => transaction.hash !== hash,
      )
    }
  }

  /** Starts working through the queue, if it isn't already. */
  startLookups(): void {
    if (
      this.transactionToRetrieveGranularTimer !== undefined ||
      this.transactionsToRetrieve.length === 0
    ) {
      return
    }

    this.transactionToRetrieveGranularTimer = setInterval(() => {
      if (this.transactionsToRetrieve.length === 0) {
        clearInterval(this.transactionToRetrieveGranularTimer)
        this.transactionToRetrieveGranularTimer = undefined
        return
      }

      // TODO: balance getting txs between networks
      const { transaction } = this.transactionsToRetrieve[0]
      this.dequeueLookup(transaction.network, transaction.hash)
      this.lookUp(transaction).catch((error) =>
        logger.error(`Error looking up transaction ${transaction.hash}`, error),
      )
    }, LOOKUP_INTERVAL)
  }

  /**
   * Looks a queued transaction up and takes the step the pending transaction
   * machine says to.
   */
  async lookUp(queued: QueuedTxToRetrieve, now = Date.now()): Promise<void> {
    const { network, hash } = queued
    // Whatever happens next decides whether it is queued again.
    this.dequeueLookup(network, hash)

    // One lookup at a time per transaction; the one under way decides.
    const key = `${network.chainID}:${hash}`
    if (this.#lookingUp.has(key)) {
      return
    }
    this.#lookingUp.add(key)
    try {
      await this.#lookUp(queued, now)
    } finally {
      this.#lookingUp.delete(key)
    }
  }

  async #lookUp(queued: QueuedTxToRetrieve, now: number): Promise<void> {
    const { network, hash } = queued
    const stored = (await this.dependencies.db.getTransaction(
      network,
      hash,
    )) as Transaction | null
    const lookup: Lookup = { queued, stored }

    let snapshot = this.snapshotFor(queued, stored)
    if (snapshot.status === "done") {
      return
    }
    if (snapshot.value === "InMempool") {
      snapshot = await this.apply(lookup, snapshot, { type: "RECHECK_DUE" })
    }
    snapshot = await this.apply(lookup, snapshot, { type: "LOOKUP_DUE" })

    let result: TransactionResponse | null | undefined
    try {
      result = await this.dependencies.providerFor(network).getTransaction(hash)
    } catch (error) {
      logger.error(`Error retrieving transaction ${hash}`, error)
      await this.apply(lookup, snapshot, { type: "LOOKUP_FAILED", now })
      return
    }

    if (!result) {
      await this.apply(lookup, snapshot, { type: "NOT_FOUND", now })
      return
    }

    try {
      lookup.found = transactionFromEthersTransaction(result, network)
      lookup.source =
        this.dependencies
          .providerFor(network)
          .dataSourceFor("eth_getTransactionByHash", [hash]) ?? "generic-rpc"
      await this.apply(lookup, snapshot, {
        type: lookup.found.blockHash ? "FOUND_IN_BLOCK" : "FOUND_IN_MEMPOOL",
        now,
      })
    } catch (error) {
      // Saving what was found, or fetching its block or receipt, failed; the
      // lookup is retried like one that failed outright.
      logger.error(`Error handling transaction ${hash}`, error)
      await this.apply(lookup, snapshot, { type: "LOOKUP_FAILED", now })
    }
  }

  /** Where a lookup stands, rebuilt from the queue and the stored row. */
  snapshotFor(
    queued: QueuedTxToRetrieve,
    stored: Transaction | null,
  ): PendingTransactionSnapshot {
    const missingSince = queued.missingSince ?? stored?.missingSince
    const state = pendingTransactionStateFor(stored)
    return pendingTransactionSnapshot(
      // A block without a receipt yet is looked up again from the start.
      state === "InBlock" ? "Queued" : state,
      {
        chainID: queued.network.chainID,
        firstSeen: queued.firstSeen,
        missingSince,
      },
    )
  }

  /**
   * Follows a pending transaction until its receipt arrives, and queues a
   * lookup in case it never does.
   */
  watchForReceipt(network: EVMNetwork, transaction: AnyEVMTransaction): void {
    const provider = this.dependencies.providerFor(network)
    provider.once(transaction.hash, (receipt: TransactionReceipt) => {
      this.save(
        enrichTransactionWithReceipt(transaction, receipt),
        provider.dataSourceFor("eth_getTransactionReceipt", [
          transaction.hash,
        ]) ?? "generic-rpc",
      ).catch((error) =>
        logger.error(`Error saving receipt for ${transaction.hash}`, error),
      )
      this.dequeueLookup(network, transaction.hash)
    })

    this.enqueueLookup(network, transaction.hash, Date.now())
  }

  /** Saves a pending transaction seen by a subscription and follows it. */
  async handlePendingTransaction(
    transaction: AnyEVMTransaction,
  ): Promise<void> {
    try {
      const { network } = transaction
      this.dependencies.nonceAllocator.observeNonce(transaction)
      await this.save(
        transaction,
        this.dependencies.providerFor(network).subscriptionDataSource,
      )
      this.watchForReceipt(network, transaction)
    } catch (error) {
      logger.error(`Error saving tx: ${transaction}`, error)
    }
  }

  /**
   * A transaction from the database, or else from the chain, saved and
   * followed if it's still pending.
   */
  async getTransaction(
    network: EVMNetwork,
    hash: HexString,
  ): Promise<AnyEVMTransaction> {
    const stored = await this.dependencies.db.getTransaction(network, hash)
    if (stored) {
      return stored
    }
    const provider = this.dependencies.providerFor(network)
    const transaction = transactionFromEthersTransaction(
      await provider.getTransaction(hash),
      network,
    )

    if (!transaction.blockHash && !transaction.blockHeight) {
      this.watchForReceipt(network, transaction)
    }

    this.save(
      transaction,
      provider.dataSourceFor("eth_getTransactionByHash", [hash]) ??
        "generic-rpc",
    ).catch((error) => logger.error(`Error saving tx ${hash}`, error))
    return transaction
  }

  /**
   * Saves a transaction, merged over what is stored, and emits it. Errors
   * from either step are rethrown once both have been tried.
   */
  async save(
    transaction: AnyEVMTransaction,
    dataSource: TransactionSource,
  ): Promise<void> {
    const existing = await this.dependencies.db.getTransaction(
      transaction.network,
      transaction.hash,
    )
    // Keeps fields the stored transaction has pulled, e.g. from a receipt.
    const merged: AnyEVMTransaction & { missingSince?: UNIXTime } = {
      ...existing,
      ...transaction,
    }
    if (dataSource !== "local") {
      // The chain has just shown it, so it isn't missing any more.
      delete merged.missingSince
      this.transactionsToRetrieve.forEach(({ transaction: queued }) => {
        if (
          queued.hash === transaction.hash &&
          queued.network.chainID === transaction.network.chainID
        ) {
          queued.missingSince = undefined
        }
      })
    }

    let error: unknown = null
    try {
      await this.dependencies.db.addOrUpdateTransaction(merged, dataSource)
    } catch (err) {
      error = err
      logger.error(`Error saving tx ${merged}`, error)
    }
    try {
      await this.dependencies.emitTransaction(merged)
    } catch (err) {
      error = err
      logger.error(`Error emitting tx ${merged}`, error)
    }
    if (error) {
      throw error
    }
  }

  async apply(
    lookup: Lookup,
    snapshot: PendingTransactionSnapshot,
    event: PendingTransactionEvent,
  ): Promise<PendingTransactionSnapshot> {
    const { snapshot: next, effects } = nextPendingTransactionState(
      snapshot,
      event,
    )

    for (const effect of effects) {
      // oxlint-disable-next-line no-await-in-loop
      await this.perform(effect, lookup, snapshot, next)
    }

    if (effects.includes("fetchBlockAndReceipt")) {
      const receiptSaved = await this.fetchBlockAndReceipt(lookup)
      return this.apply(
        lookup,
        next,
        receiptSaved
          ? { type: "RECEIPT_SAVED" }
          : {
              type: "RECEIPT_MISSING",
              now: "now" in event ? event.now : Date.now(),
            },
      )
    }

    return next
  }

  private async perform(
    effect: PendingTransactionEffect,
    lookup: Lookup,
    previous: PendingTransactionSnapshot,
    next: PendingTransactionSnapshot,
  ): Promise<void> {
    const { queued, stored, found, source } = lookup
    const { network, hash, firstSeen } = queued
    const { db, nonceAllocator } = this.dependencies

    switch (effect) {
      case "saveFound":
        if (found !== undefined) {
          await this.save(found, source ?? "generic-rpc")
        }
        break
      case "persistMissingSince":
        if (previous.context.missingSince === undefined) {
          await db.setTransactionMissingSince(
            network,
            hash,
            next.context.missingSince,
          )
        }
        break
      case "clearMissingSince":
        if (previous.context.missingSince !== undefined) {
          await db.setTransactionMissingSince(network, hash, undefined)
        }
        break
      case "requeue":
        this.enqueueLookup(
          network,
          hash,
          firstSeen,
          0,
          next.context.missingSince,
        )
        break
      case "observeNonce":
        if (found !== undefined) {
          nonceAllocator.observeNonce(found)
        }
        break
      case "watchForReceipt":
        if (found !== undefined) {
          this.watchForReceipt(network, found)
        }
        break
      case "markDropped": {
        // Read again: a receipt may have been saved during the lookup.
        const current = (await db.getTransaction(
          network,
          hash,
        )) as Transaction | null
        if (current !== null && !("status" in current)) {
          logger.warn(
            `Tx hash ${hash} is found in our local registry but not on chain.`,
          )
          // oxlint-disable-next-line no-param-reassign
          lookup.dropped = current
          await this.save(
            {
              ...current,
              status: 0,
              error:
                "Transaction was in our local db but was not found on chain.",
              blockHash: null,
              blockHeight: null,
            },
            "local",
          )
        }
        break
      }
      case "releaseNonce":
        if (lookup.dropped !== undefined) {
          nonceAllocator.releaseNonce(lookup.dropped)
        }
        break
      case "unwatch":
        this.dependencies.existingProviderFor(network)?.off(hash)
        break
      case "dequeue":
        this.dequeueLookup(network, hash)
        break
      case "markExpired":
        if (stored !== null) {
          logger.warn(
            `Transaction ${hash} is too old to keep looking for it; treating it as expired.`,
          )
          // Keeps a status that is already there.
          await this.save(
            { status: 0, ...stored } as AnyEVMTransaction,
            "local",
          )
        }
        break
      default:
        break
    }
  }

  /** Saves the block and receipt for a mined transaction, if both are in. */
  private async fetchBlockAndReceipt({
    queued: { network, hash },
    found,
  }: Lookup): Promise<boolean> {
    if (found?.blockHash === undefined || found.blockHash === null) {
      return false
    }
    await this.dependencies.getBlockData(network, found.blockHash)

    const provider = this.dependencies.providerFor(network)
    const receipt = await provider.getTransactionReceipt(hash)
    if (!receipt) {
      return false
    }
    await this.save(
      enrichTransactionWithReceipt(found, receipt),
      provider.dataSourceFor("eth_getTransactionReceipt", [hash]) ??
        "generic-rpc",
    )
    return true
  }
}
