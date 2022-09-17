import { IDBFactory } from "fake-indexeddb"
import { ETHEREUM, OPTIMISM, POLYGON } from "../../../constants"
import {
  createAccountBalance,
  createAddressOnNetwork,
  createAnyEVMTransaction,
} from "../../../tests/factories"
import { ChainDatabase, createDB } from "../db"

describe("Chain Database ", () => {
  let db: ChainDatabase

  const account1 = createAddressOnNetwork()

  const account2 = createAddressOnNetwork({ network: POLYGON })

  beforeEach(() => {
    // Reset state of indexedDB
    indexedDB = new IDBFactory()
    db = createDB({ indexedDB })
  })

  describe("addAccountToTrack", () => {
    it("should correctly add accounts to track to indexedDB", async () => {
      expect(await db.getAccountsToTrack()).toHaveLength(0)
      await db.addAccountToTrack(account1)
      expect(await db.getAccountsToTrack()).toHaveLength(1)
      await db.addAccountToTrack(account2)
      const accountsToTrack = await db.getAccountsToTrack()
      expect(accountsToTrack).toEqual([account1, account2])
    })

    it("should not add the same account twice.", async () => {
      expect(await db.getAccountsToTrack()).toHaveLength(0)
      await db.addAccountToTrack(account1)
      expect(await db.getAccountsToTrack()).toHaveLength(1)
      await db.addAccountToTrack(account1)
      expect(await db.getAccountsToTrack()).toEqual([account1])
    })
  })
  describe("addBalance", () => {
    it("should correctly persist balances to indexedDB", async () => {
      expect((await db.table("balances").toArray()).length).toEqual(0)
      const accountBalance = createAccountBalance()
      await db.addBalance(accountBalance)
      const accountBalances = await db.table("balances").toArray()
      expect(accountBalances.length).toEqual(1)
      expect(accountBalances[0].address).toEqual(accountBalance.address)
    })
  })
  describe("addBlock", () => {
    it.todo("should correctly persist blocks to indexedDB") // Implementation should be similar to addBalance
  })
  describe("addOrUpdateTransaction", () => {
    it.todo("should correctly persist transactions to indexedDB")
    it.todo("should correctly update transactions in indexedDB")
  })
  describe("getAccountsToTrack", () => {
    it("should correctly retrieve persisted accounts", async () => {
      expect(await db.getAccountsToTrack()).toHaveLength(0)
      await db.addAccountToTrack(account1)
      expect(await db.getAccountsToTrack()).toHaveLength(1)
      await db.addAccountToTrack(account2)
      const accountsToTrack = await db.getAccountsToTrack()
      expect(accountsToTrack).toEqual([account1, account2])
    })
  })
  describe("getAllSavedTransactionHashes", () => {
    it.todo(
      "should return the hashes of all persisted transactions ordered by hash"
    )
  })
  describe("getBlock", () => {
    it.todo("should return a block if that block is in indexedDB")
    it.todo("should not return a block if that block is not in indexedDB") // check for both hash and network mismatch
  })
  describe("getChainIdsToTrack", () => {
    it("should return chainIds corresponding to the networks of accounts being tracked", async () => {
      await db.addAccountToTrack(account1)
      expect(await db.getChainIDsToTrack()).toEqual(new Set(ETHEREUM.chainID))
      await db.addAccountToTrack(account2)
      expect(await db.getChainIDsToTrack()).toEqual(
        new Set([ETHEREUM.chainID, POLYGON.chainID])
      )
    })
    it("should disallow duplicate chain ids", async () => {
      expect((await db.getChainIDsToTrack()) instanceof Set).toEqual(true)
    })
  })
  describe("getLatestAccountBalance", () => {
    it.todo(
      "should retrieve the most recent account balance corresponding to a given address, network, & asset persisted in indexedDB"
    )
    it.todo("should return null if no account balances are found")
  })
  describe("getLatestBlock", () => {
    it.todo("should retrieve the most recent block for a given network")
    it.todo(
      "should return null if the most recent block is older than 86 seconds"
    )
  })
  describe("getNetworkPendingTransactions", () => {
    it("should return all pending transactions", async () => {
      const pendingEthTx1 = createAnyEVMTransaction({
        network: ETHEREUM,
        blockHash: null,
      })

      const pendingEthTx2 = createAnyEVMTransaction({
        network: ETHEREUM,
        blockHash: null,
      })

      const completeEthTx = createAnyEVMTransaction({
        network: ETHEREUM,
      })

      const pendingOptimismTx1 = createAnyEVMTransaction({
        network: OPTIMISM,
        blockHash: null,
      })

      await db.addOrUpdateTransaction(pendingEthTx1, "alchemy")
      await db.addOrUpdateTransaction(pendingEthTx2, "alchemy")
      await db.addOrUpdateTransaction(completeEthTx, "alchemy")
      await db.addOrUpdateTransaction(pendingOptimismTx1, "alchemy")

      const ethPendingTransactions = await db.getNetworkPendingTransactions(
        ETHEREUM
      )

      const opPendingTransactions = await db.getNetworkPendingTransactions(
        OPTIMISM
      )

      // Should pick up pending transactions
      expect(ethPendingTransactions.length).toEqual(2)
      expect(
        ethPendingTransactions.find((tx) => tx.hash === pendingEthTx1.hash)
      ).toBeTruthy()
      expect(
        ethPendingTransactions.find((tx) => tx.hash === pendingEthTx2.hash)
      ).toBeTruthy()
      // Should not pick up complete transactions
      expect(
        ethPendingTransactions.find((tx) => tx.hash === completeEthTx.hash)
      ).toBeFalsy()
      // Should pick up pending transactions on different networks separately
      expect(opPendingTransactions.length).toEqual(1)
      expect(
        opPendingTransactions.find((tx) => tx.hash === pendingOptimismTx1.hash)
      ).toBeTruthy()
    })
  })
  describe("getNewestAccountAssetTransferLookup", () => {
    it.todo(
      "should correctly return the most recent asset transfer for a given addressNetwork"
    )
  })
  describe("getOldestAccountAssetTransferLookup", () => {
    it.todo(
      "should correctly return the oldest asset transfer for a given addressNetwork"
    )
  })
  describe("getTransaction", () => {
    describe("getBlock", () => {
      it.todo("should return a block if that block is in indexedDB")
      it.todo("should not return a block if that block is not in indexedDB") // check for both hash and network mismatch
    })
  })
  describe("recordAccountAssetTransferLookup", () => {
    it("should correctly persist accountAssetTransferLookups", async () => {
      const addressNetwork = createAddressOnNetwork()
      await db.recordAccountAssetTransferLookup(addressNetwork, 0n, 1n)

      const assetTransferLookups = await db
        .table("accountAssetTransferLookups")
        .toArray()
      expect(assetTransferLookups.length).toEqual(1)
      expect(assetTransferLookups[0].addressNetwork).toEqual(addressNetwork)
      expect(assetTransferLookups[0].startBlock).toEqual(0n)
      expect(assetTransferLookups[0].endBlock).toEqual(1n)
    })
  })
})
