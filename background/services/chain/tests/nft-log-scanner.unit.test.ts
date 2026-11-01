import * as sinon from "sinon"
import { ETHEREUM, POLYGON } from "../../../constants"
import { storage as flagStorage } from "../../../features"
import logger from "../../../lib/logger"
import type { AddressOnNetwork } from "../../../accounts"
import type { EVMNetwork } from "../../../networks"
import type { ERC721Transfer } from "../../../nfts"
import { createAddressOnNetwork } from "../../../tests/factories"
import type { NFTLogScanCursor } from "../db"
import NFTLogScanner, {
  NFT_LOG_SCAN_STEP_BLOCKS,
  NFT_LOG_SCAN_STEPS_PER_TICK,
  NFT_PRIME_PAGES,
  NFTLogScanLookups,
} from "../nft-log-scanner"
import { LogHistoryUnavailableError } from "../rpc/log-query-errors"
import type SerialFallbackProvider from "../serial-fallback-provider"

const HEAD = 1_000_020
// The newest block scanned, with the head's last 20 blocks left alone.
const NEWEST = HEAD - 20

const transfer = (txHash: string, blockNumber = NEWEST): ERC721Transfer =>
  ({ txHash, tokenId: "1", blockNumber }) as ERC721Transfer

const STEP = NFT_LOG_SCAN_STEP_BLOCKS

/** A tick's steps down from `toBlock`, a step's blocks at a time. */
const stepsDownFrom = (toBlock: number, count = NFT_LOG_SCAN_STEPS_PER_TICK) =>
  Array.from(
    { length: count },
    (_, index) =>
      [toBlock - (index + 1) * STEP + 1, toBlock - index * STEP] as const,
  )

function harness({
  accounts = [createAddressOnNetwork({ network: ETHEREUM })],
  firstTransferBlock = 0,
  alchemyNetworks = [ETHEREUM],
  cursors = new Map<string, NFTLogScanCursor>(),
}: {
  accounts?: AddressOnNetwork[]
  firstTransferBlock?: number | null
  alchemyNetworks?: EVMNetwork[]
  cursors?: Map<string, NFTLogScanCursor>
} = {}) {
  const db = {
    getNFTLogScanCursor: async (id: string) => cursors.get(id),
    putNFTLogScanCursors: async (rows: NFTLogScanCursor[]) => {
      rows.forEach((row) => cursors.set(row.id, structuredClone(row)))
    },
  }
  const providers = new Map(
    [ETHEREUM, POLYGON].map((network) => [
      network.chainID,
      {
        chainID: network.chainID,
        supportsAlchemyMethods: alchemyNetworks.includes(network),
        reachability: "reachable",
        canServeNow: sinon.stub().returns(true),
      },
    ]),
  )
  const lookups = {
    viaLogs: sinon.stub().resolves([]),
    // Pages that reach nothing, leaving the whole history to the logs.
    page: sinon.stub().resolves({ nftTransfers: [], pageKey: "more" }),
    firstTransferBlock: sinon.stub().resolves(firstTransferBlock),
    maxBlockRange: sinon.stub().returns(undefined),
  }
  const emitted: [AddressOnNetwork, ERC721Transfer[]][] = []
  let head = HEAD
  const accountsToTrack = sinon.stub().callsFake(async () => accounts)
  const scanner = new NFTLogScanner({
    db,
    accountsToTrack,
    providerFor: (network) =>
      providers.get(network.chainID) as unknown as SerialFallbackProvider,
    getBlockHeight: async () => head,
    emitNFTTransfers: (account, transfers) =>
      emitted.push([account, transfers]),
    lookups: lookups as unknown as NFTLogScanLookups,
  })
  const ranges = () =>
    lookups.viaLogs.args.map(([, , from, to]) => [from, to] as const)
  return {
    scanner,
    cursors,
    providers,
    lookups,
    emitted,
    accounts,
    accountsToTrack,
    ranges,
    setHead: (next: number) => {
      head = next
    },
  }
}

describe("NFTLogScanner", () => {
  const sandbox = sinon.createSandbox()

  beforeEach(() => flagStorage.set("SUPPORT_NFT_INDEXER", "true"))

  afterEach(() => {
    flagStorage.delete("SUPPORT_NFT_INDEXER")
    sandbox.restore()
  })

  it("does nothing with the NFT indexer off", async () => {
    flagStorage.delete("SUPPORT_NFT_INDEXER")
    const { scanner, accountsToTrack, lookups, cursors } = harness()

    await scanner.tick()

    expect(accountsToTrack.called).toBe(false)
    expect(lookups.firstTransferBlock.called).toBe(false)
    expect(lookups.viaLogs.called).toBe(false)
    expect(cursors.size).toBe(0)
  })

  it("leaves networks without Alchemy's API to the asset transfer scan", async () => {
    const { scanner, lookups, cursors } = harness({ alchemyNetworks: [] })

    await scanner.tick()

    expect(lookups.viaLogs.called).toBe(false)
    expect(cursors.size).toBe(0)
  })

  describe("starting an account", () => {
    it("primes with pages of Alchemy's transfers, then scans from its first transfer", async () => {
      const { scanner, lookups, emitted, cursors, accounts } = harness({
        firstTransferBlock: 900_000,
      })
      lookups.page.callsFake(async (_, __, direction, pageKey) => ({
        nftTransfers: [transfer(`${direction}-${pageKey ?? "first"}`, 950_000)],
        pageKey: direction === "incoming" ? `after-${pageKey ?? 0}` : undefined,
      }))

      await scanner.tick()

      const incoming = lookups.page.args.filter(
        ([, , direction]) => direction === "incoming",
      )
      expect(incoming).toHaveLength(NFT_PRIME_PAGES)
      expect(
        lookups.page.args.filter(([, , direction]) => direction === "outgoing"),
      ).toHaveLength(1)
      expect(emitted).toHaveLength(NFT_PRIME_PAGES + 1)

      const [cursor] = cursors.values()
      expect(cursor.account).toBe(accounts[0].address.toLowerCase())
      expect(cursor.newestBlock).toBe(NEWEST)
      expect(cursor.pending).toEqual([
        {
          fromBlock: 900_000,
          toBlock: 950_000 - NFT_LOG_SCAN_STEPS_PER_TICK * STEP,
        },
        { fromBlock: 950_001, toBlock: NEWEST },
      ])
    })

    it("only scans new blocks for an account nothing was ever sent to", async () => {
      const { scanner, lookups, cursors, setHead, ranges } = harness({
        firstTransferBlock: null,
      })

      await scanner.tick()
      expect(lookups.viaLogs.called).toBe(false)
      expect([...cursors.values()][0].pending).toEqual([])

      setHead(HEAD + 5)
      await scanner.tick()
      expect(ranges()).toEqual([[NEWEST + 1, NEWEST + 5]])
    })

    it("asks for the first transfer again before scanning from genesis", async () => {
      sandbox.stub(logger, "warn")
      const { scanner, lookups, cursors } = harness()
      lookups.firstTransferBlock.rejects(new Error("boom"))

      await scanner.tick()
      await scanner.tick()
      expect(cursors.size).toBe(0)
      expect(lookups.page.called).toBe(false)

      await scanner.tick()
      expect([...cursors.values()][0].pending.at(-1)?.fromBlock).toBe(0)
    })

    it("starts one account per chain per tick", async () => {
      const { scanner, lookups } = harness({
        accounts: [
          createAddressOnNetwork({ network: ETHEREUM }),
          createAddressOnNetwork({ network: ETHEREUM }),
        ],
      })

      await scanner.tick()
      expect(lookups.firstTransferBlock.callCount).toBe(1)

      await scanner.tick()
      expect(lookups.firstTransferBlock.callCount).toBe(2)
    })
  })

  describe("ordering history around Alchemy's pages", () => {
    const pagesReaching =
      (oldest: { incoming?: number; outgoing?: number }) =>
      async (_: unknown, __: unknown, direction: "incoming" | "outgoing") => {
        const block = oldest[direction]
        return block === undefined
          ? { nftTransfers: [transfer(direction, NEWEST - 10)] }
          : { nftTransfers: [transfer(direction, block)], pageKey: "more" }
      }

    it("only scans new blocks when the pages held every transfer", async () => {
      const { scanner, lookups, cursors, setHead, ranges } = harness({
        firstTransferBlock: 900_000,
      })
      lookups.page.callsFake(pagesReaching({}))

      await scanner.tick()
      expect(lookups.viaLogs.called).toBe(false)
      expect([...cursors.values()][0].pending).toEqual([])

      setHead(HEAD + 5)
      await scanner.tick()
      expect(ranges()).toEqual([[NEWEST + 1, NEWEST + 5]])
    })

    it("only scans new blocks when Alchemy has no transfers", async () => {
      const { scanner, lookups, cursors } = harness({
        firstTransferBlock: 900_000,
      })
      lookups.page.resolves({ nftTransfers: [] })

      await scanner.tick()

      expect(lookups.viaLogs.called).toBe(false)
      expect([...cursors.values()][0].pending).toEqual([])
    })

    it("scans the whole history, newest first, when Alchemy fails", async () => {
      sandbox.stub(logger, "warn")
      const { scanner, lookups, ranges } = harness({
        firstTransferBlock: 900_000,
      })
      lookups.page.rejects(new Error("boom"))

      await scanner.tick()

      expect(ranges()).toEqual(stepsDownFrom(NEWEST))
    })

    it("scans below capped pages first, then the blocks they covered", async () => {
      const { scanner, lookups, cursors, ranges } = harness({
        firstTransferBlock: 900_000,
      })
      lookups.page.callsFake(pagesReaching({ incoming: 950_000 }))

      await scanner.tick()
      // The oldest block reached is scanned again, as a page can end in it.
      expect(ranges()).toEqual(stepsDownFrom(950_000))
      expect([...cursors.values()][0].pending).toEqual([
        { fromBlock: 900_000, toBlock: 900_000 },
        { fromBlock: 950_001, toBlock: NEWEST },
      ])

      lookups.viaLogs.resetHistory()
      await scanner.tick()
      expect(ranges()).toEqual([
        [900_000, 900_000],
        ...stepsDownFrom(NEWEST, NFT_LOG_SCAN_STEPS_PER_TICK - 1),
      ])
    })

    it("scans below whichever direction's pages reached less far", async () => {
      const { scanner, lookups, cursors } = harness({
        firstTransferBlock: 900_000,
      })
      lookups.page.callsFake(
        pagesReaching({ incoming: 950_000, outgoing: 970_000 }),
      )

      await scanner.tick()

      expect([...cursors.values()][0].pending).toEqual([
        {
          fromBlock: 900_000,
          toBlock: 970_000 - NFT_LOG_SCAN_STEPS_PER_TICK * STEP,
        },
        { fromBlock: 970_001, toBlock: NEWEST },
      ])
    })

    it("scans new blocks before the history below the pages", async () => {
      const { scanner, lookups, setHead, ranges } = harness({
        firstTransferBlock: 900_000,
      })
      lookups.page.callsFake(pagesReaching({ outgoing: 950_000 }))
      await scanner.tick()
      lookups.viaLogs.resetHistory()

      setHead(HEAD + 100)
      await scanner.tick()

      expect(ranges().slice(0, 2)).toEqual([
        [NEWEST + 1, NEWEST + 100],
        [900_000, 900_000],
      ])
      expect(ranges()[2]).toEqual([NEWEST - STEP + 1, NEWEST])
    })

    it("resumes a saved cursor in its order without starting again", async () => {
      const [account] = [createAddressOnNetwork({ network: ETHEREUM })]
      const id = `${ETHEREUM.chainID}:${account.address.toLowerCase()}`
      const cursors = new Map<string, NFTLogScanCursor>([
        [
          id,
          {
            id,
            chainID: ETHEREUM.chainID,
            account: account.address.toLowerCase(),
            newestBlock: NEWEST,
            pending: [
              { fromBlock: 900_000, toBlock: 915_000 },
              { fromBlock: 950_001, toBlock: NEWEST },
            ],
          },
        ],
      ])
      const { scanner, lookups, ranges } = harness({
        accounts: [account],
        cursors,
      })

      await scanner.tick()

      expect(lookups.firstTransferBlock.called).toBe(false)
      expect(lookups.page.called).toBe(false)
      expect(ranges()).toEqual([
        [905_001, 915_000],
        [900_000, 905_000],
        ...stepsDownFrom(NEWEST, 3),
      ])
    })
  })

  describe("pacing", () => {
    it("takes a tick's steps, newest blocks first, a step's blocks at a time", async () => {
      const { scanner, ranges } = harness()

      await scanner.tick()

      expect(ranges()).toEqual(stepsDownFrom(NEWEST))
    })

    it("steps the widest range the endpoints allow, if narrower", async () => {
      const { scanner, lookups, ranges } = harness()
      lookups.maxBlockRange.returns(2_000)

      await scanner.tick()

      expect(ranges()[0]).toEqual([NEWEST - 1_999, NEWEST])
    })

    it("shares a chain's steps between its accounts in turn", async () => {
      const accounts = [
        createAddressOnNetwork({ network: ETHEREUM }),
        createAddressOnNetwork({ network: ETHEREUM }),
      ]
      const { scanner, lookups } = harness({ accounts })
      await scanner.tick()
      lookups.viaLogs.resetHistory()

      await scanner.tick()

      const scanned = lookups.viaLogs.args.map(
        ([, { address }]) => address as string,
      )
      expect(scanned).toHaveLength(NFT_LOG_SCAN_STEPS_PER_TICK)
      expect(scanned.slice(0, 2).sort()).toEqual(
        accounts.map(({ address }) => address).sort(),
      )
    })

    it("scans new blocks before older history", async () => {
      const { scanner, setHead, ranges, lookups } = harness()
      await scanner.tick()
      lookups.viaLogs.resetHistory()

      setHead(HEAD + 100)
      await scanner.tick()

      expect(ranges()[0]).toEqual([NEWEST + 1, NEWEST + 100])
      expect(ranges()[1][1]).toBe(
        NEWEST - NFT_LOG_SCAN_STEPS_PER_TICK * NFT_LOG_SCAN_STEP_BLOCKS,
      )
    })

    it("reports a tick's transfers once per account", async () => {
      const { scanner, lookups, emitted } = harness()
      lookups.viaLogs.callsFake(async (_, __, from: number) => [
        transfer(`0x${from.toString(16)}`),
      ])

      await scanner.tick()

      expect(emitted).toHaveLength(1)
      expect(emitted[0][1]).toHaveLength(NFT_LOG_SCAN_STEPS_PER_TICK)
    })

    it("joins a tick that is still running", async () => {
      const { scanner, accountsToTrack } = harness()

      await Promise.all([scanner.tick(), scanner.tick()])

      expect(accountsToTrack.callCount).toBe(1)
    })

    it("waits while the chain is unreachable or Boar cools down", async () => {
      const { scanner, providers, lookups } = harness()
      const provider = providers.get(ETHEREUM.chainID)!
      provider.reachability = "unreachable"
      await scanner.tick()

      provider.reachability = "reachable"
      provider.canServeNow.returns(false)
      await scanner.tick()

      expect(lookups.firstTransferBlock.called).toBe(false)
      expect(lookups.viaLogs.called).toBe(false)
    })

    it("stops a chain's tick at a failed step and retries it next tick", async () => {
      sandbox.stub(logger, "warn")
      const { scanner, lookups, ranges } = harness()
      lookups.viaLogs.onSecondCall().rejects(new Error("rate limited"))

      await scanner.tick()
      expect(ranges()).toHaveLength(2)

      await scanner.tick()
      expect(ranges()[2]).toEqual(ranges()[1])
    })
  })

  it("stops at the earliest block the endpoints keep", async () => {
    const { scanner, lookups, cursors } = harness()
    lookups.viaLogs.onFirstCall().resolves([])
    lookups.viaLogs
      .onSecondCall()
      .rejects(new LogHistoryUnavailableError(ETHEREUM.chainID, NEWEST - 5_000))

    await scanner.tick()

    expect(lookups.viaLogs.callCount).toBe(2)
    expect([...cursors.values()][0].pending).toEqual([])
  })
})
