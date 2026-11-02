import { describe, expect, it } from "bun:test"
import type { RpcEndpoint } from "../../../networks"
import type SerialFallbackProvider from "../serial-fallback-provider"
import type { NetworkReachabilityState } from "../network-reachability"
import ProviderRegistry from "../provider-registry"

type FakeProvider = {
  endpoints: RpcEndpoint[]
  isDestroyed: boolean
  destroy: () => void
}

const STORED = [{ url: "https://stored.example" }]
const FIRST = [{ url: "https://first.example" }]
const SECOND = [{ url: "https://second.example" }]

type Gate = (endpoints: RpcEndpoint[]) => Promise<void>

/** A promise the test settles, and a way to tell it's being waited on. */
function gate() {
  let open: () => void = () => {}
  let reached: () => void = () => {}
  const opened = new Promise<void>((resolve) => {
    open = resolve
  })
  const waitedOn = new Promise<void>((resolve) => {
    reached = resolve
  })
  return {
    wait: () => {
      reached()
      return opened
    },
    open,
    waitedOn,
  }
}

function harness({
  beforeVerifying = async () => {},
  beforeSaving = async () => {},
}: {
  beforeVerifying?: Gate
  beforeSaving?: Gate
} = {}) {
  const saved = new Map<string, RpcEndpoint[]>()
  const removed: string[] = []
  const reachability: [string, NetworkReachabilityState][] = []
  const providers: FakeProvider[] = []

  const registry = new ProviderRegistry({
    createProvider: (_, endpoints) => {
      const provider: FakeProvider = {
        endpoints,
        isDestroyed: false,
        destroy() {
          provider.isDestroyed = true
        },
      }
      providers.push(provider)
      return provider as unknown as SerialFallbackProvider
    },
    verifyEndpoints: async (_, endpoints, signal) => {
      await beforeVerifying(endpoints)
      if (signal.aborted) {
        throw new Error("aborted")
      }
      if (endpoints.some(({ url }) => url.includes("bad"))) {
        throw new Error(`${endpoints[0].url} is unreachable`)
      }
    },
    saveEndpoints: async (chainID, endpoints) => {
      await beforeSaving(endpoints)
      saved.set(chainID, endpoints)
    },
    removeChain: async (chainID) => {
      removed.push(chainID)
    },
    onReachabilityChange: (chainID, status) =>
      reachability.push([chainID, status]),
  })

  const live = (chainID: string) =>
    registry.providerFor(chainID) as unknown as FakeProvider | undefined

  return { registry, saved, removed, reachability, providers, live }
}

describe("ProviderRegistry", () => {
  it("builds a provider when a chain starts, once", () => {
    const { registry, providers, live } = harness()

    registry.start("1", STORED)
    registry.start("1", FIRST)

    expect(providers).toHaveLength(1)
    expect(live("1")?.endpoints).toEqual(STORED)
    expect(registry.requireProviderFor("1")).toBe(
      live("1") as unknown as SerialFallbackProvider,
    )
  })

  it("throws, and keeps no chain, when a provider can't be built", () => {
    const registry = new ProviderRegistry({
      createProvider: () => {
        throw new Error("No RPC endpoints to build a provider for chain 1")
      },
      verifyEndpoints: async () => {},
      saveEndpoints: async () => {},
      removeChain: async () => {},
      onReachabilityChange: () => {},
    })

    expect(() => registry.start("1", [])).toThrow("No RPC endpoints")
    expect(registry.providerFor("1")).toBeUndefined()
    expect(registry.providersByChainID()).toEqual({})
  })

  it("treats hex and decimal chain IDs as the same chain", async () => {
    const { registry, providers, live } = harness()

    registry.start("0x1", STORED)
    registry.start("1", FIRST)

    expect(providers).toHaveLength(1)
    expect(live("0x1")).toBe(live("1"))
    expect(Object.keys(registry.providersByChainID())).toEqual(["1"])

    await registry.removeProvider("0x1")
    expect(registry.providerFor("1")).toBeUndefined()
  })

  it("throws when a provider is required for an unknown chain", () => {
    const { registry } = harness()

    expect(registry.providerFor("1")).toBeUndefined()
    expect(() => registry.requireProviderFor("1")).toThrow(
      "No provider for chain 1",
    )
  })

  it("lists live providers by chain", () => {
    const { registry } = harness()
    registry.start("1", STORED)
    registry.start("10", STORED)

    expect(Object.keys(registry.providersByChainID())).toEqual(["1", "10"])
  })

  it("verifies, saves, and swaps on an endpoint update", async () => {
    const { registry, saved, live, providers } = harness()
    registry.start("1", STORED)
    const replaced: [string, unknown][] = []
    registry.onProviderReplaced(({ chainID, previousProvider }) => {
      replaced.push([chainID, previousProvider])
    })

    await registry.updateEndpoints("1", FIRST)

    expect(saved.get("1")).toEqual(FIRST)
    expect(live("1")?.endpoints).toEqual(FIRST)
    expect(providers[0].isDestroyed).toBe(true)
    expect(replaced).toEqual([["1", providers[0]]])
  })

  it("rejects and keeps the old provider when an endpoint fails its check", async () => {
    const { registry, saved, live } = harness()
    registry.start("1", STORED)

    await expect(
      registry.updateEndpoints("1", [{ url: "https://bad.example" }]),
    ).rejects.toThrow("is unreachable")

    expect(saved.has("1")).toBe(false)
    expect(live("1")?.endpoints).toEqual(STORED)
  })

  // Problem 10: two overlapping saves used to interleave freely.
  it("ends with the newer endpoints when two updates overlap during the check", async () => {
    const slowCheck = gate()
    const { registry, saved, live } = harness({
      beforeVerifying: async (endpoints) => {
        if (endpoints === FIRST) {
          await slowCheck.wait()
        }
      },
    })
    registry.start("1", STORED)

    const first = registry.updateEndpoints("1", FIRST)
    await slowCheck.waitedOn
    const second = registry.updateEndpoints("1", SECOND)
    // The first check finishes after the second has taken over.
    slowCheck.open()
    await Promise.all([first, second])

    expect(saved.get("1")).toEqual(SECOND)
    expect(live("1")?.endpoints).toEqual(SECOND)
  })

  it("ends with the newer endpoints when an update arrives during a slow save", async () => {
    const slowSave = gate()
    const { registry, saved, live } = harness({
      beforeSaving: async (endpoints) => {
        if (endpoints === FIRST) {
          await slowSave.wait()
        }
      },
    })
    registry.start("1", STORED)

    const first = registry.updateEndpoints("1", FIRST)
    await slowSave.waitedOn
    const second = registry.updateEndpoints("1", SECOND)
    slowSave.open()
    await Promise.all([first, second])

    expect(saved.get("1")).toEqual(SECOND)
    expect(live("1")?.endpoints).toEqual(SECOND)
  })

  it("replaces a provider without checking or saving, and reports it reachable", async () => {
    const { registry, saved, live, reachability } = harness()
    registry.start("1", STORED)

    await registry.replaceProvider("1", FIRST)

    expect(saved.has("1")).toBe(false)
    expect(live("1")?.endpoints).toEqual(FIRST)
    expect(reachability).toEqual([["1", "reachable"]])
  })

  it("starts an unknown chain on replacement and reports it reachable", async () => {
    const { registry, live, reachability } = harness()

    await registry.replaceProvider("250", FIRST)

    expect(live("250")?.endpoints).toEqual(FIRST)
    expect(reachability).toEqual([["250", "reachable"]])
  })

  it("verifies and saves before starting an unknown chain on update", async () => {
    const { registry, saved, live } = harness()

    await registry.updateEndpoints("250", FIRST)

    expect(saved.get("250")).toEqual(FIRST)
    expect(live("250")?.endpoints).toEqual(FIRST)
  })

  it("destroys the provider, deletes the chain, and forgets it on removal", async () => {
    const { registry, removed, providers } = harness()
    registry.start("1", STORED)

    await registry.removeProvider("1")

    expect(providers[0].isDestroyed).toBe(true)
    expect(removed).toEqual(["1"])
    expect(registry.providerFor("1")).toBeUndefined()

    // A removed chain can be started again.
    registry.start("1", FIRST)
    expect(registry.providerFor("1")).toBeDefined()
  })

  it("still deletes the rows of a chain it never started", async () => {
    const { registry, removed } = harness()

    await registry.removeProvider("250")

    expect(removed).toEqual(["250"])
  })

  it("passes provider reachability reports on", () => {
    const reports: NetworkReachabilityState[] = []
    let report: (status: NetworkReachabilityState) => void = () => {}
    const registry = new ProviderRegistry({
      createProvider: (_, __, onReachabilityChange) => {
        report = onReachabilityChange
        return { destroy() {} } as unknown as SerialFallbackProvider
      },
      verifyEndpoints: async () => {},
      saveEndpoints: async () => {},
      removeChain: async () => {},
      onReachabilityChange: (_, status) => reports.push(status),
    })
    registry.start("1", STORED)

    report("unreachable")
    report("reachable")

    expect(reports).toEqual(["unreachable", "reachable"])
  })

  it("keeps notifying other listeners when one throws", async () => {
    const { registry } = harness()
    registry.start("1", STORED)
    const heard: string[] = []
    registry.onProviderReplaced(() => {
      throw new Error("listener failure")
    })
    const unsubscribe = registry.onProviderReplaced(({ chainID }) =>
      heard.push(chainID),
    )

    await registry.replaceProvider("1", FIRST)
    unsubscribe()
    await registry.replaceProvider("1", SECOND)

    expect(heard).toEqual(["1"])
  })
})
