import {
  EIP1193_ERROR_CODES,
  ProviderTransport,
} from "@tallyho/provider-bridge-shared"
import TahoWindowProvider from "../index"

/** A transport that goes nowhere; these tests drive the provider directly. */
const inertTransport = (): ProviderTransport => ({
  postMessage: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  origin: "https://dapp.example.com",
})

const providerOnChain = (chainId: string, connected: boolean) => {
  const provider = new TahoWindowProvider(inertTransport())
  provider.chainId = chainId
  provider.connected = connected
  return provider
}

describe("TahoWindowProvider chain reachability", () => {
  it("reports a disconnect from the chain rather than from everything", () => {
    const provider = providerOnChain("0x1", true)
    const disconnects: unknown[] = []
    provider.on("disconnect", (error) => disconnects.push(error))

    provider.handleChainReachabilityChange("0x1", false)

    // 4901, not 4900: other chains are still being served, and a page told we
    // are disconnected from all of them would give up on requests we could
    // still answer.
    expect(disconnects).toEqual([EIP1193_ERROR_CODES.chainDisconnected])
    expect(provider.isConnected()).toBe(false)
  })

  it("reports the reconnection", () => {
    const provider = providerOnChain("0x1", false)
    const connects: unknown[] = []
    provider.on("connect", (info) => connects.push(info))

    provider.handleChainReachabilityChange("0x1", true)

    expect(connects).toEqual([{ chainId: "0x1" }])
    expect(provider.isConnected()).toBe(true)
  })

  it("says nothing about a chain this page is not on", () => {
    const provider = providerOnChain("0x1", true)
    const events: string[] = []
    provider.on("disconnect", () => events.push("disconnect"))
    provider.on("connect", () => events.push("connect"))

    provider.handleChainReachabilityChange("0xa", false)

    expect(events).toEqual([])
    expect(provider.isConnected()).toBe(true)
  })

  it("compares chains by value rather than by spelling", () => {
    // The background sends a canonical hex chain ID; a page may have set a
    // differently padded one.
    const provider = providerOnChain("0x01", true)
    const events: string[] = []
    provider.on("disconnect", () => events.push("disconnect"))

    provider.handleChainReachabilityChange("0x1", false)

    expect(events).toEqual(["disconnect"])
  })

  it("does not repeat itself while nothing has changed", () => {
    const provider = providerOnChain("0x1", true)
    const events: string[] = []
    provider.on("disconnect", () => events.push("disconnect"))

    provider.handleChainReachabilityChange("0x1", false)
    provider.handleChainReachabilityChange("0x1", false)
    provider.handleChainReachabilityChange("0x1", false)

    expect(events).toEqual(["disconnect"])
  })
})
