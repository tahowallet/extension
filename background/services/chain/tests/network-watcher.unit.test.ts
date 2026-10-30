import { describe, expect, it } from "bun:test"
import * as sinon from "sinon"
import { ETHEREUM } from "../../../constants"
import {
  createAddressOnNetwork,
  makeEthersBlock,
} from "../../../tests/factories"
import type { ChainDatabase } from "../db"
import NetworkWatcher, { ACTIVITY_TIMEOUT_MS } from "../network-watcher"
import type SerialFallbackProvider from "../serial-fallback-provider"

function harness() {
  let now = 1_000_000_000
  const provider = {
    getBlock: sinon.stub().resolves(makeEthersBlock()),
    onPendingTransaction: sinon.stub().resolves(),
  }
  const db = { addBlock: sinon.stub().resolves() }
  const blocks: unknown[] = []
  const watcher = new NetworkWatcher({
    db: db as unknown as ChainDatabase,
    networkFor: (chainID) =>
      chainID === ETHEREUM.chainID ? ETHEREUM : undefined,
    providerFor: () => provider as unknown as SerialFallbackProvider,
    emitBlock: (block) => blocks.push(block),
    emitBlockPrices: () => {},
    onPendingTransaction: async () => {},
    now: () => now,
  })
  return {
    watcher,
    provider,
    db,
    blocks,
    advance: (ms: number) => {
      now += ms
    },
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("NetworkWatcher", () => {
  it("reads the latest block when it starts watching, as an Ethers block", async () => {
    const { watcher, db, blocks } = harness()

    watcher.watchNetwork(ETHEREUM.chainID)
    await flush()

    expect(watcher.isWatching(ETHEREUM.chainID)).toBe(true)
    expect(watcher.watchStateOf(ETHEREUM.chainID)).toBe("Idle")
    expect(db.addBlock.callCount).toBe(1)
    expect(blocks).toHaveLength(1)
  })

  it("logs a failed block poll rather than leaving it unhandled", async () => {
    const { watcher, provider, blocks } = harness()
    provider.getBlock.rejects(new Error("NETWORK_ERROR"))

    watcher.watchNetwork(ETHEREUM.chainID)
    await flush()

    expect(blocks).toEqual([])
  })

  it("watches a network once", () => {
    const { watcher, provider } = harness()

    watcher.watchNetwork(ETHEREUM.chainID)
    watcher.watchNetwork(ETHEREUM.chainID)

    expect(watcher.watchedChainIDs()).toEqual([ETHEREUM.chainID])
    expect(provider.getBlock.callCount).toBe(1)
  })

  it("subscribes watched accounts again when the provider is replaced", async () => {
    const { watcher, provider } = harness()
    const account = createAddressOnNetwork({ network: ETHEREUM })
    watcher.watchNetwork(ETHEREUM.chainID)
    await watcher.watchAccount(account)
    await watcher.watchAccount(account)

    watcher.providerReplaced(ETHEREUM.chainID)

    // Twice for watching, once for the replacement: duplicates collapse.
    expect(provider.onPendingTransaction.callCount).toBe(3)
  })

  it("forgets a network's accounts when it stops watching it", async () => {
    const { watcher } = harness()
    watcher.watchNetwork(ETHEREUM.chainID)
    await watcher.watchAccount(createAddressOnNetwork({ network: ETHEREUM }))

    watcher.stopWatchingNetwork(ETHEREUM.chainID)

    expect(watcher.isWatching(ETHEREUM.chainID)).toBe(false)
    expect(watcher.watchedAccounts()).toEqual([])
  })

  it("moves a network in use to Polling, and back to Idle once activity lapses", () => {
    const { watcher, advance } = harness()
    watcher.watchNetwork(ETHEREUM.chainID)

    watcher.markNetworkActivity(ETHEREUM.chainID)

    expect(watcher.watchStateOf(ETHEREUM.chainID)).toBe("Polling")
    expect(watcher.isNetworkActive(ETHEREUM.chainID)).toBe(true)
    advance(ACTIVITY_TIMEOUT_MS)
    expect(watcher.isNetworkActive(ETHEREUM.chainID)).toBe(false)
  })

  it("tells idle from never used", () => {
    const { watcher, advance } = harness()

    expect(watcher.isNetworkIdle(ETHEREUM.chainID)).toBe(false)
    expect(watcher.isAddressIdle("0xabc")).toBe(false)

    watcher.markNetworkActivity(ETHEREUM.chainID)
    watcher.markAddressActivity("0xabc")
    advance(ACTIVITY_TIMEOUT_MS + 1)

    expect(watcher.isNetworkIdle(ETHEREUM.chainID)).toBe(true)
    expect(watcher.isAddressIdle("0xabc")).toBe(true)
  })

  it("pauses a network that becomes unreachable", () => {
    const { watcher } = harness()
    watcher.watchNetwork(ETHEREUM.chainID)

    watcher.reachabilityChanged(ETHEREUM.chainID, "unreachable")

    expect(watcher.watchStateOf(ETHEREUM.chainID)).toBe(
      "PausedWhileUnreachable",
    )
  })
})
