import { IDBFactory } from "fake-indexeddb"
import { ETHEREUM, OPTIMISM, POLYGON, ETH } from "../../../constants"
import {
  createAccountBalance,
  createAddressOnNetwork,
  createAnyEVMTransaction,
  createAnyEVMBlock,
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
      expect(accountsToTrack).toEqual(
        expect.arrayContaining([account1, account2]),
      )
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
    it("should correctly persist blocks to indexedDB", async () => {
      expect((await db.table("blocks").toArray()).length).toEqual(0)
      const block = createAnyEVMBlock()
      await db.addBlock(block)
      const blocks = await db.table("blocks").toArray()
      expect(blocks.length).toEqual(1)
    })
  })
  describe("addOrUpdateTransaction", () => {
    const addTransactionEth = createAnyEVMTransaction({
      network: ETHEREUM,
    })

    const addTransactionOpt = createAnyEVMTransaction({
      network: OPTIMISM,
    })
    it("should correctly persist transactions to indexedDB", async () => {
      await db.addOrUpdateTransaction(addTransactionEth, "alchemy")
      await db.addOrUpdateTransaction(addTransactionOpt, "alchemy")

      const getEthTransaction = await db.getTransaction(
        addTransactionEth.network,
        addTransactionEth.hash,
      )

      const getOptTransaction = await db.getTransaction(
        addTransactionOpt.network,
        addTransactionOpt.hash,
      )

      expect(getEthTransaction?.hash).toEqual(addTransactionEth.hash)
      expect(getOptTransaction?.hash).toEqual(addTransactionOpt.hash)
    })
    it("should correctly update transactions in indexedDB", async () => {
      await db.addOrUpdateTransaction(addTransactionEth, "alchemy")
      await db.addOrUpdateTransaction(addTransactionOpt, "alchemy")

      expect(addTransactionEth.gasPrice).toEqual(40300000000n)
      expect(addTransactionOpt.gasPrice).toEqual(40300000000n)

      const getEthTransaction = await db.getTransaction(
        addTransactionEth.network,
        addTransactionEth.hash,
      )

      const getOptTransaction = await db.getTransaction(
        addTransactionOpt.network,
        addTransactionOpt.hash,
      )

      expect(getEthTransaction).toBeTruthy()
      expect(getOptTransaction).toBeTruthy()

      const updateEth = createAnyEVMTransaction({
        network: ETHEREUM,
        hash: getEthTransaction?.hash,
        gasPrice: 40400000000n,
      })
      const updateOpt = createAnyEVMTransaction({
        network: OPTIMISM,
        hash: getOptTransaction?.hash,
        gasPrice: 40400000000n,
      })

      await db.addOrUpdateTransaction(updateEth, "alchemy")
      await db.addOrUpdateTransaction(updateOpt, "alchemy")
      expect(updateEth.gasPrice).toEqual(40400000000n)
      expect(updateOpt.gasPrice).toEqual(40400000000n)
    })
  })
  describe("getAccountsToTrack", () => {
    it("should correctly retrieve persisted accounts", async () => {
      expect(await db.getAccountsToTrack()).toHaveLength(0)
      await db.addAccountToTrack(account1)
      expect(await db.getAccountsToTrack()).toHaveLength(1)
      await db.addAccountToTrack(account2)
      const accountsToTrack = await db.getAccountsToTrack()

      expect(accountsToTrack).toEqual(
        expect.arrayContaining([account1, account2]),
      )
    })
  })
  describe("getAllSavedTransactionHashes", () => {
    it("should return the hashes of all persisted transactions ordered by hash", async () => {
      expect(await db.getAllSavedTransactionHashes()).toHaveLength(0)

      const savedTransaction1 = createAnyEVMTransaction({
        network: ETHEREUM,
      })
      const savedTransaction2 = createAnyEVMTransaction({
        network: ETHEREUM,
      })
      const savedTransaction3 = createAnyEVMTransaction({
        network: OPTIMISM,
      })
      const savedTransaction4 = createAnyEVMTransaction({
        network: OPTIMISM,
      })

      await db.addOrUpdateTransaction(savedTransaction1, "alchemy")
      await db.addOrUpdateTransaction(savedTransaction2, "alchemy")
      await db.addOrUpdateTransaction(savedTransaction3, "alchemy")
      await db.addOrUpdateTransaction(savedTransaction4, "alchemy")

      const allTransactions = await db.getAllSavedTransactionHashes()

      expect(allTransactions).toHaveLength(4)
      expect(allTransactions.filter((key) => !!key)).toHaveLength(4)
    })
  })
  describe("getBlock", () => {
    /* Creating two blocks. */
    it("should return a block if that block is in indexedDB", async () => {
      const block = createAnyEVMBlock()
      await db.addBlock(block)
      const persistedBlock = await db.getBlock(block.network, block.hash)
      expect(persistedBlock?.hash).toEqual(block.hash)
    })
    it("should not return a block if that block is not in indexedDB", async () => {
      const block2 = createAnyEVMBlock()
      const persistedBlock = await db.getBlock(block2.network, block2.hash)
      expect(persistedBlock).toEqual(null)
    })
  })
  describe("getChainIdsToTrack", () => {
    it("should return chainIds corresponding to the networks of accounts being tracked", async () => {
      await db.addAccountToTrack(account1)
      expect(await db.getChainIDsToTrack()).toEqual(new Set(ETHEREUM.chainID))
      await db.addAccountToTrack(account2)
      expect(await db.getChainIDsToTrack()).toEqual(
        new Set([ETHEREUM.chainID, POLYGON.chainID]),
      )
    })
    it("should disallow duplicate chain ids", async () => {
      expect((await db.getChainIDsToTrack()) instanceof Set).toEqual(true)
    })
  })
  describe("getLatestAccountBalance", () => {
    it("should retrieve the most recent account balance corresponding to a given address, network, & asset persisted in indexedDB", async () => {
      const accountBalance = createAccountBalance({
        assetAmount: {
          asset: ETH,
          amount: 4n,
        },
      })

      const accountBalance2 = createAccountBalance({
        assetAmount: {
          asset: ETH,
          amount: 10n,
        },
        retrievedAt: Date.now() - 10_000,
      })
      await db.addBalance(accountBalance)
      await db.addBalance(accountBalance2)
      const latest = await db.getLatestAccountBalance(
        accountBalance.address,
        accountBalance.network,
        ETH,
      )
      expect(latest?.assetAmount.amount).toEqual(4n)
    })
    it("should return null if no account balances are found", async () => {
      const accountBalance = createAccountBalance()
      // Explicitly don't save to DB
      const latest = await db.getLatestAccountBalance(
        accountBalance.address,
        accountBalance.network,
        ETH,
      )
      expect(latest).toBeNull()
    })
  })
  describe("getLatestBlock", () => {
    const block = createAnyEVMBlock({
      network: OPTIMISM,
    })
    it("should retrieve the most recent block for a given network", async () => {
      await db.addBlock(block)
      expect(await db.getLatestBlock(OPTIMISM)).toBeTruthy()
    })
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

      const ethPendingTransactions =
        await db.getNetworkPendingTransactions(ETHEREUM)

      const opPendingTransactions =
        await db.getNetworkPendingTransactions(OPTIMISM)

      // Should pick up pending transactions
      expect(ethPendingTransactions.length).toEqual(2)
      expect(
        ethPendingTransactions.find((tx) => tx.hash === pendingEthTx1.hash),
      ).toBeTruthy()
      expect(
        ethPendingTransactions.find((tx) => tx.hash === pendingEthTx2.hash),
      ).toBeTruthy()
      // Should not pick up complete transactions
      expect(
        ethPendingTransactions.find((tx) => tx.hash === completeEthTx.hash),
      ).toBeFalsy()
      // Should pick up pending transactions on different networks separately
      expect(opPendingTransactions.length).toEqual(1)
      expect(
        opPendingTransactions.find((tx) => tx.hash === pendingOptimismTx1.hash),
      ).toBeTruthy()
    })
  })
  describe("getNewestAccountAssetTransferLookup", () => {
    it("should correctly return the most recent asset transfer for a given addressNetwork", async () => {
      await db.recordAccountAssetTransferLookup(account1, 1n, 100n)
      await db.recordAccountAssetTransferLookup(account1, 101n, 200n)
      await db.recordAccountAssetTransferLookup(account1, 201n, 300n)
      const newest = await db.getNewestAccountAssetTransferLookup(account1)
      expect(newest?.toString()).toBe("300")
    })
  })
  describe("getOldestAccountAssetTransferLookup", () => {
    it("should correctly return the oldest asset transfer for a given addressNetwork", async () => {
      await db.recordAccountAssetTransferLookup(account2, 1n, 100n)
      await db.recordAccountAssetTransferLookup(account2, 101n, 200n)
      await db.recordAccountAssetTransferLookup(account2, 201n, 300n)
      const oldest = await db.getOldestAccountAssetTransferLookup(account2)
      expect(oldest).toEqual(1n)
    })
  })
  describe("getTransaction", () => {
    describe("getBlock", () => {
      const block = createAnyEVMBlock()
      const block2 = createAnyEVMBlock()
      it("should return a block if that block is in indexedDB", async () => {
        await db.addBlock(block)
        const persistedBlock = await db.getBlock(block.network, block.hash)
        expect(persistedBlock?.hash).toEqual(block.hash)
      })
      it("should not return a block if that block is not in indexedDB", async () => {
        const persistedBlock = await db.getBlock(block2.network, block2.hash)
        expect(persistedBlock).toEqual(null)
      })
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

  describe("addEVMNetwork", () => {
    it("Should correctly add a network, baseAsset, and rpcURL(s) when adding an evm network", async () => {
      await db.addEVMNetwork({
        chainName: "Foo",
        chainID: "12345",
        decimals: 18,
        symbol: "BAR",
        assetName: "Foocoin",
        rpcUrls: ["https://foo.com"],
        blockExplorerURL: "https://someurl.com",
      })

      expect(await db.getEVMNetworkByChainID("12345")).toBeTruthy()
      expect(
        (await db.getAllRpcUrls()).find((rpcUrl) =>
          rpcUrl.rpcUrls.includes("https://foo.com"),
        ),
      ).toBeTruthy()

      expect(await db.getBaseAssetForNetwork("12345")).toBeTruthy()
    })
  })
})
