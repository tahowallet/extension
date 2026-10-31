import { afterEach, describe, expect, it, jest } from "bun:test"
import * as sinon from "sinon"
import { ETHEREUM, POLYGON } from "../../../constants"
import type { EVMNetwork } from "../../../networks"
import type { ChainDatabase } from "../db"
import NetworkSettings from "../network-settings"
import type ProviderRegistry from "../provider-registry"

function harness(networks: EVMNetwork[] = [ETHEREUM, POLYGON]) {
  const db = {
    getAllEVMNetworks: sinon.stub().resolves(networks),
    getRpcEndpointsByChainId: sinon
      .stub()
      .resolves([{ url: "https://stored.example" }]),
    getAllCustomRpcUrls: sinon
      .stub()
      .resolves([{ chainID: "1", rpcUrls: ["https://flashbots.example"] }]),
    addCustomRpcUrl: sinon.stub().resolves(),
    removeCustomRpcUrl: sinon.stub().resolves(),
    getEVMNetworkByChainID: sinon.stub().resolves(ETHEREUM),
    setBlockExplorerUrl: sinon.stub().resolves(),
  }
  const provider = {
    setMethodSpecificEndpoints: sinon.stub(),
    clearMethodSpecificEndpoints: sinon.stub(),
  }
  const registry = {
    providerFor: sinon.stub().returns(provider),
    updateEndpoints: sinon.stub().resolves(),
  }
  const changes: EVMNetwork[][] = []
  const settings = new NetworkSettings(
    db as unknown as ChainDatabase,
    () => registry as unknown as ProviderRegistry,
    (next) => changes.push(next),
  )
  return { settings, db, provider, registry, changes }
}

describe("NetworkSettings", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("looks networks up by chain once refreshed, and reports the refresh", async () => {
    const { settings, changes } = harness()
    expect(settings.networkFor("1")).toBeUndefined()

    await settings.refreshSupportedNetworks()

    expect(settings.networkFor("0x1")).toBe(ETHEREUM)
    expect(settings.supportedNetworks()).toEqual([ETHEREUM, POLYGON])
    expect(changes).toEqual([[ETHEREUM, POLYGON]])
  })

  it("loads, sets, and clears method-specific endpoints", async () => {
    const { settings, db, provider } = harness()
    await settings.loadMethodSpecificEndpoints()
    expect(settings.methodSpecificRpcConfigFor("1")?.rpcUrls).toEqual([
      "https://flashbots.example",
    ])

    const config = {
      kind: "method-specific" as const,
      methods: ["eth_sendRawTransaction"],
      createTransport: () => {
        throw new Error("unused")
      },
    }
    await settings.setMethodSpecificEndpoints("10", "https://x.example", config)
    expect(db.addCustomRpcUrl.calledWith("10", "https://x.example")).toBe(true)
    expect(settings.methodSpecificRpcConfigFor("10")).toEqual({
      chainID: "10",
      rpcUrls: ["https://x.example"],
      supportedMethods: ["eth_sendRawTransaction"],
    })
    expect(provider.setMethodSpecificEndpoints.calledWith([config])).toBe(true)

    await settings.clearMethodSpecificEndpoints("10")
    expect(settings.methodSpecificRpcConfigFor("10")).toBeUndefined()
    expect(provider.clearMethodSpecificEndpoints.called).toBe(true)
  })

  it("refuses an empty endpoint list and unknown chains", async () => {
    const { settings, db } = harness()

    await expect(settings.setRpcEndpoints("1", [])).rejects.toThrow(
      "At least one RPC endpoint is required",
    )
    db.getEVMNetworkByChainID.resolves(undefined)
    await expect(
      settings.setRpcEndpoints("999", [{ url: "https://a.example" }]),
    ).rejects.toThrow("No network found")
  })

  it("refuses metadata edits on built-in networks before touching endpoints", async () => {
    const { settings, registry } = harness()

    await expect(
      settings.updateSettings("1", {
        rpcEndpoints: [{ url: "https://a.example" }],
        blockExplorerUrl: "https://scan.example",
        metadata: { chainName: "x", assetName: "x", symbol: "X", decimals: 18 },
      }),
    ).rejects.toThrow("Cannot edit metadata of built-in network")
    expect(registry.updateEndpoints.called).toBe(false)
  })

  it("checks only new http endpoints", async () => {
    const { settings } = harness()
    const fetchMock = jest.fn(async (_url: string) => ({
      json: async () => ({ result: "0x1" }),
    }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await settings.verifyNewEndpoints(
      "1",
      [
        { url: "https://stored.example" },
        { url: "https://new.example" },
        { url: "wss://socket.example" },
      ],
      new AbortController().signal,
    )

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://new.example",
    ])
  })

  it("stops checking when its signal is aborted", async () => {
    const { settings } = harness()
    globalThis.fetch = (async (_: string, { signal }: RequestInit) =>
      new Promise((_resolve, reject) => {
        if (signal?.aborted) {
          reject(new Error("aborted"))
        }
        signal?.addEventListener("abort", () => reject(new Error("aborted")))
      })) as unknown as typeof fetch
    const controller = new AbortController()

    const check = settings.verifyNewEndpoints(
      "1",
      [{ url: "https://new.example" }],
      controller.signal,
    )
    controller.abort()

    await expect(check).rejects.toMatchObject({
      failure: { kind: "unreachable", url: "https://new.example" },
    })
  })
})
