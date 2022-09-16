import { IDBFactory } from "fake-indexeddb"
import { ETHEREUM, POLYGON } from "../../../constants"
import {
  createAccountBalance,
  createAddressOnNetwork,
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
      expect(accountBalances).toEqual([accountBalance])
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
      "Should return the hashes of all persisted transactions ordered by hash"
    )
  })
  describe("getBlock", () => {
    it.todo("Should return a block if that block is in indexedDB")
    it.todo("Should not return a block if that block is not in indexedDB") // check for both hash and network mismatch
  })
  describe("getChainIdsToTrack", () => {
    it("Should return chainIds corresponding to the networks of accounts being tracked", async () => {
      await db.addAccountToTrack(account1)
      expect(await db.getChainIDsToTrack()).toEqual(new Set(ETHEREUM.chainID))
      await db.addAccountToTrack(account2)
      expect(await db.getChainIDsToTrack()).toEqual(
        new Set([ETHEREUM.chainID, POLYGON.chainID])
      )
    })
    it("Should disallow duplicate chain ids", async () => {
      expect((await db.getChainIDsToTrack()) instanceof Set).toEqual(true)
    })
  })
  describe("getLatestAccountBalance", () => {
    it.todo(
      "Should retrieve the most recent account balance corresponding to a given address, network, & asset persisted in indexedDB"
    )
    it.todo("Should return null if no account balances are found")
  })
  xdescribe("getLatestBlock", () => {})
  xdescribe("getNetworkPendingTransactions", () => {})
  xdescribe("getNewestAccountAssetTransferLookup", () => {})
  xdescribe("getOldestAccountAssetTransferLookup", () => {})
  xdescribe("getTransaction", () => {})
  xdescribe("recordAccountAssetTransferLookup", () => {})
  xdescribe("removeAccountToTrack", () => {})
  xdescribe("removeAccountToTrack", () => {})
})
