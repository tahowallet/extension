import { afterEach, describe, expect, it } from "bun:test"
import * as sinon from "sinon"
import { ETHEREUM } from "../../../constants"
import type { AssetTransfer } from "../../../assets"
import type { ERC721Transfer } from "../../../nfts"
import logger from "../../../lib/logger"
import { createAddressOnNetwork } from "../../../tests/factories"
import AssetTransferScanner from "../asset-transfer-scanner"
import { LogHistoryUnavailableError } from "../rpc/log-query-errors"
import type AssetDataHelper from "../asset-data-helper"
import type { ChainDatabase } from "../db"

// The block height the scanner is told the chain is at, with the skip
// applied to derive the end of a recent lookup.
const BLOCK_HEIGHT = 1_000_000
const RECENT_END_BLOCK = BigInt(BLOCK_HEIGHT - 20)

function harness({
  supportsAlchemy,
  servableMethods = ["alchemy_getAssetTransfers", "eth_getLogs"],
  blockHeight = BLOCK_HEIGHT,
  oldestLookup = null,
  transfers = [],
  nftTransfers = [],
  savedHashes = [],
}: {
  supportsAlchemy: boolean
  servableMethods?: string[]
  blockHeight?: number
  oldestLookup?: bigint | null
  transfers?: Partial<AssetTransfer>[]
  nftTransfers?: Partial<ERC721Transfer>[]
  savedHashes?: string[]
}) {
  const db = {
    getOldestAccountAssetTransferLookup: sinon.stub().resolves(oldestLookup),
    recordAccountAssetTransferLookup: sinon.stub().resolves(),
    getAllSavedTransactionHashes: sinon.stub().resolves(savedHashes),
  }
  const assetData = {
    getAssetTransfers: sinon
      .stub()
      .resolves({ assetTransfers: transfers, nftTransfers }),
  }
  const enqueued: [string, number][] = []
  const emitted: unknown[] = []
  const emittedNFTs: unknown[] = []
  const accounts = [
    createAddressOnNetwork({ network: ETHEREUM }),
    createAddressOnNetwork({ network: ETHEREUM }),
  ]
  const accountsToTrack = sinon.stub().resolves(accounts)
  const scanner = new AssetTransferScanner({
    db: db as unknown as ChainDatabase,
    assetData: assetData as unknown as AssetDataHelper,
    getBlockHeight: async () => blockHeight,
    accountsToTrack,
    isSupported: () => true,
    supportsAlchemyMethods: () => supportsAlchemy,
    canServeNow: (_, method) => servableMethods.includes(method),
    enqueueTransactionLookup: (_, hash, __, priority) =>
      enqueued.push([hash, priority]),
    emitAssetTransfers: (_, assetTransfers) => emitted.push(assetTransfers),
    emitNFTTransfers: (_, transfers) => emittedNFTs.push(transfers),
  })
  const range = () => {
    const [, startBlock, endBlock] = assetData.getAssetTransfers.firstCall.args
    return [BigInt(startBlock), BigInt(endBlock)]
  }
  return {
    scanner,
    db,
    assetData,
    enqueued,
    emitted,
    emittedNFTs,
    accounts,
    accountsToTrack,
    range,
  }
}

describe("AssetTransferScanner", () => {
  afterEach(() => sinon.restore())

  describe("recent transfers", () => {
    it("looks back the full transaction history window when the network has an Alchemy-capable endpoint", async () => {
      const { scanner, range } = harness({ supportsAlchemy: true })

      await scanner.scanRecentTransfersFor(
        createAddressOnNetwork({ network: ETHEREUM }),
      )

      const [startBlock, endBlock] = range()
      expect(endBlock).toEqual(RECENT_END_BLOCK)
      expect(endBlock - startBlock).toEqual(128000n)
    })

    it("looks back a much shorter window when transfers have to be scanned from logs", async () => {
      const { scanner, range } = harness({ supportsAlchemy: false })

      await scanner.scanRecentTransfersFor(
        createAddressOnNetwork({ network: ETHEREUM }),
      )

      const [startBlock, endBlock] = range()
      expect(endBlock).toEqual(RECENT_END_BLOCK)
      expect(endBlock - startBlock).toEqual(5000n)
    })

    it("never looks back past the genesis block", async () => {
      const { scanner, range } = harness({
        supportsAlchemy: true,
        blockHeight: 1000,
      })

      await scanner.scanRecentTransfersFor(
        createAddressOnNetwork({ network: ETHEREUM }),
      )

      expect(range()[0]).toEqual(0n)
    })

    it("scans every tracked account with the options given", async () => {
      const { scanner, assetData, accountsToTrack } = harness({
        supportsAlchemy: true,
      })

      await scanner.scanRecentTransfers({
        incomingOnly: true,
        activeAccountsOnly: true,
      })

      expect(accountsToTrack.calledWith({ activeAccountsOnly: true })).toBe(
        true,
      )
      expect(assetData.getAssetTransfers.callCount).toBe(2)
      expect(
        assetData.getAssetTransfers.args.every(
          ([, , , incomingOnly]) => incomingOnly === true,
        ),
      ).toBe(true)
    })

    it("logs rather than throws when a scan fails", async () => {
      const warn = sinon.stub(logger, "warn")
      const { scanner, assetData } = harness({ supportsAlchemy: true })
      assetData.getAssetTransfers.rejects(new Error("NETWORK_ERROR"))

      await expect(
        scanner.scanRecentTransfersFor(
          createAddressOnNetwork({ network: ETHEREUM }),
        ),
      ).resolves.toBeUndefined()
      expect(warn.callCount).toBe(1)
      expect(String(warn.firstCall.args[0])).toContain(
        "chain 1: couldn't load recent asset transfers in blocks 871980 to 999980",
      )
    })
  })

  describe("historic transfers", () => {
    it("asks for all remaining history at once when the network has an Alchemy-capable endpoint", async () => {
      const { scanner, range } = harness({
        supportsAlchemy: true,
        oldestLookup: 800_000n,
      })

      await scanner.scanHistoricTransfersFor(
        createAddressOnNetwork({ network: ETHEREUM }),
      )

      expect(range()).toEqual([0n, 800_000n])
    })

    it("walks history back one bounded chunk at a time when transfers have to be scanned from logs", async () => {
      const { scanner, range } = harness({
        supportsAlchemy: false,
        oldestLookup: 800_000n,
      })

      await scanner.scanHistoricTransfersFor(
        createAddressOnNetwork({ network: ETHEREUM }),
      )

      expect(range()).toEqual([795_000n, 800_000n])
    })

    it("stops at the genesis block on the final log-scanned chunk", async () => {
      const { scanner, range } = harness({
        supportsAlchemy: false,
        oldestLookup: 3000n,
      })

      await scanner.scanHistoricTransfersFor(
        createAddressOnNetwork({ network: ETHEREUM }),
      )

      expect(range()).toEqual([0n, 3000n])
    })

    it("logs a failed scan once, with its chain, account and range, rather than throwing", async () => {
      const warn = sinon.stub(logger, "warn")
      const { scanner, assetData } = harness({
        supportsAlchemy: false,
        oldestLookup: 800_000n,
      })
      const error = new Error("NETWORK_ERROR")
      assetData.getAssetTransfers.rejects(error)
      const account = createAddressOnNetwork({ network: ETHEREUM })

      await expect(
        scanner.scanHistoricTransfersFor(account),
      ).resolves.toBeUndefined()

      expect(warn.args).toEqual([
        [
          "chain 1: couldn't load historic asset transfers in blocks 795000 to 800000; trying again later.",
          { address: account.address },
          error,
        ],
      ])
    })

    it("stops quietly at history the endpoints no longer keep", async () => {
      const warn = sinon.stub(logger, "warn")
      const debug = sinon.stub(logger, "debug")
      const { scanner, assetData } = harness({
        supportsAlchemy: false,
        oldestLookup: 800_000n,
      })
      assetData.getAssetTransfers.rejects(
        new LogHistoryUnavailableError("1", 900_000),
      )

      await scanner.scanHistoricTransfersFor(
        createAddressOnNetwork({ network: ETHEREUM }),
      )

      expect(warn.called).toBe(false)
      expect(debug.args).toEqual([
        [
          "chain 1: no logs are kept before block 900000, so historic asset transfers stop there.",
        ],
      ])
    })

    it("does nothing once it has reached genesis", async () => {
      const { scanner, assetData } = harness({
        supportsAlchemy: false,
        oldestLookup: 0n,
      })

      await scanner.scanHistoricTransfersFor(
        createAddressOnNetwork({ network: ETHEREUM }),
      )

      expect(assetData.getAssetTransfers.called).toBe(false)
    })
  })

  describe("when every endpoint is cooling down", () => {
    it("skips recent and historic scans without a lookup or a warning", async () => {
      const { scanner, assetData } = harness({
        supportsAlchemy: false,
        servableMethods: [],
        oldestLookup: 500_000n,
      })
      const warn = sinon.stub(logger, "warn")

      await scanner.scanRecentTransfers()
      await scanner.scanHistoricTransfers()

      expect(assetData.getAssetTransfers.called).toBe(false)
      expect(warn.called).toBe(false)
    })

    it("still scans logs when only the Alchemy endpoint is cooling", async () => {
      const { scanner, assetData } = harness({
        supportsAlchemy: true,
        servableMethods: ["eth_getLogs"],
      })

      await scanner.scanRecentTransfersFor(
        createAddressOnNetwork({ network: ETHEREUM }),
      )

      expect(assetData.getAssetTransfers.calledOnce).toBe(true)
    })
  })

  it("records and emits what it found, and queues lookups for new transactions", async () => {
    const transfers = Array.from({ length: 28 }, (_, index) => ({
      txHash: `0x${index}`,
    }))
    const { scanner, db, emitted, enqueued } = harness({
      supportsAlchemy: true,
      transfers,
      savedHashes: ["0x0"],
    })

    await scanner.scanBlocks(
      createAddressOnNetwork({ network: ETHEREUM }),
      10n,
      20n,
    )

    expect(db.recordAccountAssetTransferLookup.firstCall.args.slice(1)).toEqual(
      [10n, 20n],
    )
    expect(emitted).toEqual([transfers])
    expect(enqueued).toHaveLength(27)
    expect(enqueued[0]).toEqual(["0x1", 0])
    // The first 26 transfers, by position, are looked up first.
    expect(enqueued.find(([hash]) => hash === "0x25")).toEqual(["0x25", 0])
    expect(enqueued.find(([hash]) => hash === "0x26")).toEqual(["0x26", 1])
    expect(enqueued.at(-1)).toEqual(["0x27", 1])
  })

  it("records only the blocks a lookup covered", async () => {
    const { scanner, db, assetData } = harness({ supportsAlchemy: true })
    assetData.getAssetTransfers.resolves({
      assetTransfers: [],
      nftTransfers: [],
      coveredFromBlock: 15,
    })

    await scanner.scanBlocks(
      createAddressOnNetwork({ network: ETHEREUM }),
      0n,
      20n,
    )

    // The rest is left for a later historic scan.
    expect(db.recordAccountAssetTransferLookup.firstCall.args.slice(1)).toEqual(
      [15n, 20n],
    )
  })

  it("emits ERC-721 transfers apart, without queueing their transactions", async () => {
    const nftTransfers = [{ txHash: "0xnft", tokenId: "7" }]
    const { scanner, emitted, emittedNFTs, enqueued } = harness({
      supportsAlchemy: false,
      nftTransfers,
    })

    await scanner.scanBlocks(
      createAddressOnNetwork({ network: ETHEREUM }),
      10n,
      20n,
    )

    expect(emitted).toEqual([[]])
    expect(emittedNFTs).toEqual([nftTransfers])
    expect(enqueued).toEqual([])
  })

  it("emits no ERC-721 transfers when a scan found none", async () => {
    const { scanner, emittedNFTs } = harness({ supportsAlchemy: false })

    await scanner.scanBlocks(
      createAddressOnNetwork({ network: ETHEREUM }),
      10n,
      20n,
    )

    expect(emittedNFTs).toEqual([])
  })
})
