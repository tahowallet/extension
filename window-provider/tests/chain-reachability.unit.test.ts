import {
  EIP1193_ERROR_CODES,
  PortListenerFn,
  ProviderTransport,
} from "@tallyho/provider-bridge-shared"
import TahoWindowProvider from "../index"

type SentMessage = { id: string }

/**
 * A transport that records what the provider sends and hands back the
 * listeners it registered, so a response can be delivered as the bridge would
 * deliver it.
 */
function recordingTransport() {
  const sent: SentMessage[] = []
  const listeners: PortListenerFn[] = []

  const transport: ProviderTransport = {
    postMessage: (data: unknown) => {
      sent.push(data as SentMessage)
    },
    addEventListener: (listener: PortListenerFn) => {
      listeners.push(listener)
    },
    removeEventListener: () => {},
    origin: "https://dapp.example.com",
  }

  return {
    transport,
    sent,
    respondTo: (id: string, result: unknown) =>
      listeners.forEach((listener) =>
        listener({ id, jsonrpc: "2.0", result } as unknown),
      ),
  }
}

function providerOnChain(chainId: string) {
  const recorder = recordingTransport()
  const provider = new TahoWindowProvider(recorder.transport)
  provider.chainId = chainId

  const events: { name: string; payload: unknown }[] = []
  provider.on("connect", (payload) => events.push({ name: "connect", payload }))
  provider.on("disconnect", (payload) =>
    events.push({ name: "disconnect", payload }),
  )

  return { provider, events, ...recorder }
}

describe("TahoWindowProvider chain reachability", () => {
  it("reports a disconnect from the chain rather than from everything", () => {
    const { provider, events } = providerOnChain("0x1")

    provider.handleChainReachabilityChange("0x1", false)

    // 4901, not 4900: other chains are still being served, and a page told we
    // are disconnected from all of them would give up on requests we could
    // still answer.
    expect(events).toEqual([
      { name: "disconnect", payload: EIP1193_ERROR_CODES.chainDisconnected },
    ])
    expect(provider.isConnected()).toBe(false)
  })

  it("reports the reconnection", () => {
    const { provider, events } = providerOnChain("0x1")

    provider.handleChainReachabilityChange("0x1", false)
    provider.handleChainReachabilityChange("0x1", true)

    expect(events.map(({ name }) => name)).toEqual(["disconnect", "connect"])
    expect(provider.isConnected()).toBe(true)
  })

  it("says nothing about a chain this page is not on", () => {
    const { provider, events } = providerOnChain("0x1")

    provider.handleChainReachabilityChange("0xa", false)

    expect(events).toEqual([])
  })

  it("compares chains by value rather than by spelling", () => {
    // The background sends a canonical hex chain ID; a page may have set a
    // differently padded one.
    const { provider, events } = providerOnChain("0x01")

    provider.handleChainReachabilityChange("0x1", false)

    expect(events.map(({ name }) => name)).toEqual(["disconnect"])
  })

  it("does not repeat itself while nothing has changed", () => {
    const { provider, events } = providerOnChain("0x1")

    provider.handleChainReachabilityChange("0x1", false)
    provider.handleChainReachabilityChange("0x1", false)
    provider.handleChainReachabilityChange("0x1", false)

    expect(events.map(({ name }) => name)).toEqual(["disconnect"])
  })

  it("stays disconnected while an answered request comes back", async () => {
    const { provider, events, sent, respondTo } = providerOnChain("0x1")

    provider.handleChainReachabilityChange("0x1", false)

    // Any resolved request marks the provider connected, meaning only that the
    // extension is alive. That must not undo a chain-level disconnect, or the
    // page sees connect and disconnect alternating while the chain is still
    // dark.
    const pending = provider.request({ method: "eth_blockNumber" })
    respondTo(sent[sent.length - 1].id, "0x1")
    await expect(pending).resolves.toBe("0x1")

    expect(events.map(({ name }) => name)).toEqual(["disconnect"])
    expect(provider.isConnected()).toBe(false)
  })

  it("connects on the first answered request when the chain is fine", async () => {
    const { provider, events, sent, respondTo } = providerOnChain("0x1")

    const pending = provider.request({ method: "eth_blockNumber" })
    respondTo(sent[sent.length - 1].id, "0x1")
    await pending

    expect(events.map(({ name }) => name)).toEqual(["connect"])
    expect(provider.isConnected()).toBe(true)
  })
})
