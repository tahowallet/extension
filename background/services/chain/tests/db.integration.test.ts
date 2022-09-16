import { IDBFactory } from "fake-indexeddb"
import { POLYGON } from "../../../constants"
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
    it("Should correctly add balances to indexedDB", async () => {
      expect((await db.table("balances").toArray()).length).toEqual(0)
      const accountBalance = createAccountBalance()
      await db.addBalance(accountBalance)
      const accountBalances = await db.table("balances").toArray()
      expect(accountBalances).toEqual([accountBalance])
    })
  })
  xdescribe("addBlock", () => {
    // Use AnyEVMBlock factory
    // Implementation should be similar to addBalance test
  })
  xdescribe("addOrUpdateTransaction", () => {
    // Use AnyEVMTransaction factory
    // Test adding and updating separately
  })
  xdescribe("getAccountsToTrack", () => {})
  xdescribe("getAllSavedTransactionHashes", () => {})
  xdescribe("getBlock", () => {})
  xdescribe("getChainIdsToTrack", () => {})
  xdescribe("getLatestAccountBalance", () => {})
  xdescribe("getLatestBlock", () => {})
  xdescribe("getNetworkPendingTransactions", () => {})
  xdescribe("getNewestAccountAssetTransferLookup", () => {})
  xdescribe("getOldestAccountAssetTransferLookup", () => {})
  xdescribe("getTransaction", () => {})
  xdescribe("recordAccountAssetTransferLookup", () => {})
  xdescribe("removeAccountToTrack", () => {})
  xdescribe("removeAccountToTrack", () => {})
})
