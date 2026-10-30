import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import * as sinon from "sinon"
import { ETHEREUM, MINUTE, OPTIMISM, SECOND } from "../../../constants"
import type { AnyEVMTransaction, EVMNetwork } from "../../../networks"
import {
  createAnyEVMTransaction,
  createTransactionsToRetrieve,
} from "../../../tests/factories"
import { createDB, ChainDatabase } from "../db"
import NonceAllocator from "../nonce-allocator"
import type SerialFallbackProvider from "../serial-fallback-provider"
import TransactionTracker from "../transaction-tracker"

const T0 = 1_800_000_000_000
const BASE: EVMNetwork = { ...OPTIMISM, name: "Base", chainID: "8453" }

const mined = (transaction: AnyEVMTransaction, blockHash: string) => ({
  hash: transaction.hash,
  blockHash,
  blockNumber: 100,
  from: transaction.from,
  to: transaction.to,
  nonce: transaction.nonce,
  gasLimit: { toBigInt: () => 21000n },
  gasPrice: { toBigInt: () => 1n },
  value: { toBigInt: () => 0n },
  data: "0x",
  chainId: Number(transaction.network.chainID),
  type: 0,
})

function harness() {
  const db = createDB({ autoOpen: true }) as ChainDatabase
  const provider = {
    getTransaction: sinon.stub().resolves(null),
    getTransactionReceipt: sinon.stub().resolves(null),
    dataSourceFor: sinon.stub().returns("generic-rpc"),
    subscriptionDataSource: "boar",
    once: sinon.stub(),
    off: sinon.stub(),
  }
  const nonceAllocator = new NonceAllocator(
    () => provider as unknown as SerialFallbackProvider,
  )
  const released = sinon.spy(nonceAllocator, "releaseNonce")
  const observed = sinon.spy(nonceAllocator, "observeNonce")
  const emitted: AnyEVMTransaction[] = []
  const blocks: string[] = []
  const tracker = new TransactionTracker({
    db,
    providerFor: () => provider as unknown as SerialFallbackProvider,
    existingProviderFor: () => provider as unknown as SerialFallbackProvider,
    nonceAllocator,
    getBlockData: async (_, blockHash) => {
      blocks.push(blockHash)
    },
    emitTransaction: async (transaction) => {
      emitted.push(transaction)
    },
  })

  const store = async (network: EVMNetwork) => {
    const transaction = createAnyEVMTransaction({
      network,
      blockHash: null,
      blockHeight: null,
    })
    await db.addOrUpdateTransaction(transaction, "local")
    return transaction
  }
  const stored = async (transaction: AnyEVMTransaction) =>
    (await db.getTransaction(transaction.network, transaction.hash)) as
      | (AnyEVMTransaction & {
          status?: number
          missingSince?: number
          dataSource?: string
        })
      | null
  const queued = (transaction: AnyEVMTransaction) =>
    tracker.transactionsToRetrieve.find(
      ({ transaction: { hash } }) => hash === transaction.hash,
    )?.transaction
  const lookUp = (
    transaction: AnyEVMTransaction,
    now: number,
    missingSince?: number,
  ) =>
    tracker.lookUp(
      {
        network: transaction.network,
        hash: transaction.hash,
        firstSeen: T0,
        missingSince,
      },
      now,
    )

  return {
    db,
    provider,
    tracker,
    released,
    observed,
    emitted,
    blocks,
    store,
    stored,
    queued,
    lookUp,
  }
}

describe("TransactionTracker", () => {
  describe("the lookup timer", () => {
    let clock: sinon.SinonFakeTimers
    let tracker: TransactionTracker
    let lookUp: sinon.SinonStub

    beforeEach(() => {
      clock = sinon.useFakeTimers()
      tracker = harness().tracker
      lookUp = sinon.stub(tracker, "lookUp").resolves()
    })

    afterEach(() => {
      clock.restore()
    })

    it("doesn't start with an empty queue", () => {
      const setInterval = sinon.spy(global, "setInterval")
      tracker.startLookups()
      clock.tick(2 * SECOND)

      expect(setInterval.called).toBe(false)
      expect(lookUp.callCount).toBe(0)
      setInterval.restore()
    })

    it("isn't started twice by repeated alarms", () => {
      tracker.transactionsToRetrieve = createTransactionsToRetrieve(100)

      tracker.startLookups()
      const timer = tracker.transactionToRetrieveGranularTimer
      clock.tick(60 * SECOND)
      tracker.startLookups()

      expect(tracker.transactionToRetrieveGranularTimer).toBe(timer)
    })

    it("looks up one transaction every two seconds, taking it off the queue", () => {
      tracker.transactionsToRetrieve = createTransactionsToRetrieve(100)

      tracker.startLookups()
      clock.tick(98 * 2 * SECOND)

      expect(lookUp.callCount).toBe(98)
      expect(tracker.transactionsToRetrieve).toHaveLength(2)
    })

    it("stops once the queue is empty", () => {
      tracker.transactionsToRetrieve = createTransactionsToRetrieve(100)

      tracker.startLookups()
      clock.tick(100 * 2 * SECOND)
      expect(lookUp.callCount).toBe(100)
      clock.tick(2 * SECOND)

      expect(tracker.transactionToRetrieveGranularTimer).toBeUndefined()
    })
  })

  describe("the queue", () => {
    it("keeps priority order and doesn't queue a hash twice", () => {
      const { tracker } = harness()
      tracker.enqueueLookup(ETHEREUM, "0x1", T0)
      tracker.enqueueLookup(ETHEREUM, "0x2", T0, 1)
      tracker.enqueueLookup(ETHEREUM, "0x1", T0, 5)

      expect(
        tracker.transactionsToRetrieve.map(
          ({ transaction }) => transaction.hash,
        ),
      ).toEqual(["0x2", "0x1"])
      expect(tracker.isLookupQueued(ETHEREUM, "0x1")).toBe(true)

      tracker.dequeueLookup(ETHEREUM, "0x1")
      expect(tracker.isLookupQueued(ETHEREUM, "0x1")).toBe(false)
    })
  })

  describe("the drop rule", () => {
    it("requeues a first miss and saves when it started", async () => {
      const { store, lookUp, queued, stored, released } = harness()
      const transaction = await store(OPTIMISM)

      await lookUp(transaction, T0)

      expect(queued(transaction)?.missingSince).toBe(T0)
      expect((await stored(transaction))?.missingSince).toBe(T0)
      expect((await stored(transaction))?.status).toBeUndefined()
      expect(released.called).toBe(false)
    })

    it.each([
      ["without a public mempool", OPTIMISM, 2 * MINUTE],
      ["with one", ETHEREUM, 15 * MINUTE],
    ])(
      "on a chain %s, waits just inside the grace and drops just past it",
      async (_, network, grace) => {
        const { store, lookUp, queued, stored, released, provider } = harness()
        const transaction = await store(network)

        await lookUp(transaction, T0 + grace, T0)
        expect(queued(transaction)?.missingSince).toBe(T0)
        expect(released.called).toBe(false)

        await lookUp(transaction, T0 + grace + 1, T0)
        expect((await stored(transaction))?.status).toBe(0)
        expect(queued(transaction)).toBeUndefined()
        expect(released.callCount).toBe(1)
        expect(provider.off.calledWith(transaction.hash)).toBe(true)

        // A dropped transaction is final.
        await lookUp(transaction, T0 + grace + 2, T0)
        expect(released.callCount).toBe(1)
      },
    )

    it("survives a restart mid-grace", async () => {
      const { store, lookUp, db, stored } = harness()
      const transaction = await store(OPTIMISM)
      await lookUp(transaction, T0)

      // After a restart, the lookup is queued again from the stored row.
      const [row] = await db.getNetworkPendingTransactions(OPTIMISM)
      expect(row.missingSince).toBe(T0)
      await lookUp(transaction, T0 + 2 * MINUTE + 1, row.missingSince)

      expect((await stored(transaction))?.status).toBe(0)
    })

    it("confirms a Base transaction missing once, then mined", async () => {
      const { store, lookUp, provider, stored, released, blocks, queued } =
        harness()
      const transaction = await store(BASE)
      await lookUp(transaction, T0)

      provider.getTransaction.resolves(mined(transaction, "0xb10c"))
      provider.getTransactionReceipt.resolves({
        status: 1,
        gasUsed: { toBigInt: () => 21000n },
        effectiveGasPrice: { toBigInt: () => 1n },
        blockHash: "0xb10c",
        blockNumber: 100,
        logs: [],
      })
      await lookUp(transaction, T0 + 4 * SECOND, T0)

      const saved = await stored(transaction)
      expect(saved?.status).toBe(1)
      expect(saved?.missingSince).toBeUndefined()
      expect(blocks).toEqual(["0xb10c"])
      expect(released.called).toBe(false)
      expect(queued(transaction)).toBeUndefined()
    })

    it("follows a missing transaction that turns up in the mempool", async () => {
      const { store, lookUp, provider, stored, observed, queued } = harness()
      const transaction = await store(ETHEREUM)
      await lookUp(transaction, T0)

      provider.getTransaction.resolves({
        ...mined(transaction, ""),
        blockHash: null,
        blockNumber: null,
      })
      await lookUp(transaction, T0 + MINUTE, T0)

      expect((await stored(transaction))?.missingSince).toBeUndefined()
      expect((await stored(transaction))?.dataSource).toBe("generic-rpc")
      expect(observed.called).toBe(true)
      expect(provider.once.calledWith(transaction.hash)).toBe(true)
      expect(queued(transaction)?.missingSince).toBeUndefined()
    })

    it("retries failed lookups for ten hours, then expires without releasing the nonce", async () => {
      const { store, lookUp, provider, stored, queued, tracker, released } =
        harness()
      const transaction = await store(OPTIMISM)
      provider.getTransaction.rejects(new Error("NETWORK_ERROR"))

      await lookUp(transaction, T0 + 10 * 60 * MINUTE)
      expect(queued(transaction)).toBeDefined()

      tracker.transactionsToRetrieve = []
      await lookUp(transaction, T0 + 10 * 60 * MINUTE + 1)

      expect((await stored(transaction))?.status).toBe(0)
      expect(queued(transaction)).toBeUndefined()
      expect(released.called).toBe(false)
    })
  })

  describe("sources", () => {
    it("saves what a subscription saw with the subscription's source", async () => {
      const { tracker, stored, observed } = harness()
      const transaction = createAnyEVMTransaction({
        network: ETHEREUM,
        blockHash: null,
        blockHeight: null,
      })

      await tracker.handlePendingTransaction(transaction)

      expect((await stored(transaction))?.dataSource).toBe("boar")
      expect(observed.calledWith(transaction)).toBe(true)
    })
  })
})
