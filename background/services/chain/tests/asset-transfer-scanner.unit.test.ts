import { describe, expect, it } from "bun:test"
import * as sinon from "sinon"
import { ETHEREUM } from "../../../constants"
import type { AssetTransfer } from "../../../assets"
import { createAddressOnNetwork } from "../../../tests/factories"
import AssetTransferScanner from "../asset-transfer-scanner"
import type AssetDataHelper from "../asset-data-helper"
import type { ChainDatabase } from "../db"

// The block height the scanner is told the chain is at, with the skip
// applied to derive the end of a recent lookup.
const BLOCK_HEIGHT = 1_000_000
const RECENT_END_BLOCK = BigInt(BLOCK_HEIGHT - 20)

function harness({
  supportsAlchemy,
  blockHeight = BLOCK_HEIGHT,
  oldestLookup = null,
  transfers = [],
  savedHashes = [],
}: {
  supportsAlchemy: boolean
  blockHeight?: number
  oldestLookup?: bigint | null
  transfers?: Partial<AssetTransfer>[]
  savedHashes?: string[]
}) {
  const db = {
    getOldestAccountAssetTransferLookup: sinon.stub().resolves(oldestLookup),
    recordAccountAssetTransferLookup: sinon.stub().resolves(),
    getAllSavedTransactionHashes: sinon.stub().resolves(savedHashes),
  }
  const assetData = {
    getAssetTransfers: sinon.stub().resolves(transfers),
  }
  const enqueued: [string, number][] = []
  const emitted: unknown[] = []
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
    enqueueTransactionLookup: (_, hash, __, priority) =>
      enqueued.push([hash, priority]),
    emitAssetTransfers: (_, assetTransfers) => emitted.push(assetTransfers),
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
    accounts,
    accountsToTrack,
    range,
  }
}

describe("AssetTransferScanner", () => {
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
      const { scanner, assetData } = harness({ supportsAlchemy: true })
      assetData.getAssetTransfers.rejects(new Error("NETWORK_ERROR"))

      await expect(
        scanner.scanRecentTransfersFor(
          createAddressOnNetwork({ network: ETHEREUM }),
        ),
      ).resolves.toBeUndefined()
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
    expect(enqueued.at(-1)).toEqual(["0x27", 1])
  })
})
