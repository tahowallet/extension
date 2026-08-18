import { JsonRpcProvider } from "@ethersproject/providers"
import Sinon, * as sinon from "sinon"
import { ETHEREUM } from "../../../constants"
import SerialFallbackProvider from "../serial-fallback-provider"

const sandbox = sinon.createSandbox()

/**
 * Runs one of the periodic reconnect passes the constructor's interval timer
 * drives, without waiting out the interval.
 */
const runReconnectPass = async (
  provider: SerialFallbackProvider,
  pass:
    | "attemptToReconnectToPrimaryCustomProvider"
    | "attemptToReconnectToPrimaryCapabilityProviders",
): Promise<void> =>
  // Accessing a private method
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (provider as any)[pass]()

const stubProvider = (url: string, send: Sinon.SinonStub): JsonRpcProvider => {
  const provider = new JsonRpcProvider(url)
  sandbox.replace(provider, "send", send)
  return provider
}

describe("SerialFallbackProvider provider reuse", () => {
  let genericSendStub: Sinon.SinonStub
  let genericProvider: JsonRpcProvider

  beforeEach(() => {
    genericSendStub = sandbox.stub().resolves("generic")
    genericProvider = stubProvider("http://generic.example", genericSendStub)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("creates each custom endpoint's provider once across repeated failovers", async () => {
    const primaryCustom = stubProvider(
      "http://custom-primary.example",
      sandbox.stub().rejects(new Error("bad response")),
    )
    const fallbackCustom = stubProvider(
      "http://custom-fallback.example",
      sandbox.stub().resolves("custom-fallback"),
    )
    const primaryCreator = sandbox.stub().returns(primaryCustom)
    const fallbackCreator = sandbox.stub().returns(fallbackCustom)

    const provider = new SerialFallbackProvider(ETHEREUM.chainID, [
      { type: "generic", creator: () => genericProvider },
      { type: "custom", supportedMethods: [], creator: primaryCreator },
      { type: "custom", supportedMethods: [], creator: fallbackCreator },
    ])

    await expect(
      provider.send("eth_getBlockByNumber", ["0x1", false]),
    ).resolves.toEqual("custom-fallback")

    expect(primaryCreator.callCount).toEqual(1)
    expect(fallbackCreator.callCount).toEqual(1)

    // Drop back to the primary custom endpoint the way the periodic reconnect
    // does, then fail over to the fallback again.
    await runReconnectPass(
      provider,
      "attemptToReconnectToPrimaryCustomProvider",
    )

    await expect(
      provider.send("eth_getBlockByNumber", ["0x2", false]),
    ).resolves.toEqual("custom-fallback")

    // Neither flip nor the drop back may open a new connection: each endpoint
    // is still served by the single provider its creator produced.
    expect(primaryCreator.callCount).toEqual(1)
    expect(fallbackCreator.callCount).toEqual(1)
  })

  it("creates each capability endpoint's provider once across repeated failovers", async () => {
    const primaryAlchemy = stubProvider(
      "http://alchemy-primary.example",
      sandbox.stub().rejects(new Error("bad response")),
    )
    const fallbackAlchemy = stubProvider(
      "http://alchemy-fallback.example",
      sandbox.stub().resolves("alchemy-fallback"),
    )
    const primaryCreator = sandbox.stub().returns(primaryAlchemy)
    const fallbackCreator = sandbox.stub().returns(fallbackAlchemy)

    const provider = new SerialFallbackProvider(ETHEREUM.chainID, [
      { type: "generic", creator: () => genericProvider },
      {
        type: "generic",
        capabilities: ["alchemy_"],
        creator: primaryCreator,
      },
      {
        type: "generic",
        capabilities: ["alchemy_"],
        creator: fallbackCreator,
      },
    ])

    await expect(
      provider.send("alchemy_getAssetTransfers", [{ fromBlock: "0x1" }]),
    ).resolves.toEqual("alchemy-fallback")

    expect(primaryCreator.callCount).toEqual(1)
    expect(fallbackCreator.callCount).toEqual(1)

    await runReconnectPass(
      provider,
      "attemptToReconnectToPrimaryCapabilityProviders",
    )

    await expect(
      provider.send("alchemy_getAssetTransfers", [{ fromBlock: "0x2" }]),
    ).resolves.toEqual("alchemy-fallback")

    expect(primaryCreator.callCount).toEqual(1)
    expect(fallbackCreator.callCount).toEqual(1)
  })

  it("replaces the custom providers wholesale when the endpoint list changes", () => {
    const firstCustom = stubProvider(
      "http://custom-first.example",
      sandbox.stub().resolves("first"),
    )
    const secondCustom = stubProvider(
      "http://custom-second.example",
      sandbox.stub().resolves("second"),
    )
    const firstCreator = sandbox.stub().returns(firstCustom)
    const secondCreator = sandbox.stub().returns(secondCustom)

    const provider = new SerialFallbackProvider(ETHEREUM.chainID, [
      { type: "generic", creator: () => genericProvider },
      { type: "custom", supportedMethods: [], creator: firstCreator },
    ])

    const teardown = sandbox.spy(firstCustom, "removeAllListeners")

    provider.addCustomProviders([
      { type: "custom", supportedMethods: [], creator: secondCreator },
    ])

    // The provider cached for the old list is torn down rather than left
    // holding a connection nothing will use again.
    expect(teardown.called).toBe(true)
    expect(secondCreator.callCount).toEqual(1)
  })

  it("stops its periodic timers and drops listeners when destroyed", () => {
    const clock = sandbox.useFakeTimers({
      toFake: ["setInterval", "clearInterval"],
    })

    const customProvider = stubProvider(
      "http://custom.example",
      sandbox.stub().resolves("custom"),
    )

    const provider = new SerialFallbackProvider(ETHEREUM.chainID, [
      { type: "generic", creator: () => genericProvider },
      { type: "custom", supportedMethods: [], creator: () => customProvider },
    ])

    const genericTeardown = sandbox.spy(genericProvider, "removeAllListeners")
    const customTeardown = sandbox.spy(customProvider, "removeAllListeners")

    // The reconnect and cache-cleanup intervals are pending until destroyed.
    expect(clock.countTimers()).toBeGreaterThan(0)

    provider.destroy()

    expect(clock.countTimers()).toEqual(0)
    expect(genericTeardown.called).toBe(true)
    expect(customTeardown.called).toBe(true)
  })
})
