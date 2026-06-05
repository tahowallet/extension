import { JsonRpcProvider } from "@ethersproject/providers"
import Sinon, * as sinon from "sinon"
import { ETHEREUM } from "../../../constants"
import SerialFallbackProvider from "../serial-fallback-provider"
import { CircuitBreaker } from "../circuit-breaker"
import {
  resetForTests as resetPerfMetricsForTests,
  snapshotAndReset,
} from "../../../lib/perf-metrics"

const sandbox = sinon.createSandbox()

/**
 * Force-trip the breaker for a specific provider index without waiting for
 * the real failure threshold to be crossed. Tests a narrow, observable piece
 * of behavior: that an open breaker redirects traffic to the next provider
 * and that a healthy breaker leaves routing unchanged.
 */
function tripBreakerOpen(
  provider: SerialFallbackProvider,
  providerIndex: number,
): CircuitBreaker {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/dot-notation
  const breaker: CircuitBreaker = (provider as any)["breakerFor"](providerIndex)
  for (let i = 0; i < 10; i += 1) {
    breaker.recordFailure()
  }
  return breaker
}

describe("SerialFallbackProvider circuit breaker integration", () => {
  let fallbackProvider: SerialFallbackProvider
  let genericSendStub: Sinon.SinonStub
  let alchemySendStub: Sinon.SinonStub

  beforeEach(() => {
    resetPerfMetricsForTests()
    const mockGenericProvider = new JsonRpcProvider("fake-rpc-url")
    const mockAlchemyProvider = new JsonRpcProvider("fake-alchemy-url")
    genericSendStub = sandbox
      .stub(mockGenericProvider, "send")
      .callsFake(async () => "generic")
    alchemySendStub = sandbox
      .stub(mockAlchemyProvider, "send")
      .callsFake(async () => "alchemy")
    fallbackProvider = new SerialFallbackProvider(ETHEREUM.chainID, [
      { type: "generic", creator: () => mockGenericProvider },
      { type: "boar", creator: () => mockAlchemyProvider },
    ])
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("skips an open-breaker provider and routes to the next provider", async () => {
    tripBreakerOpen(fallbackProvider, 0)

    const result = await fallbackProvider.send("eth_getBlockByNumber", [
      "0x1",
      false,
    ])

    expect(result).toBe("alchemy")
    // The generic provider should not have been called for eth_getBlockByNumber.
    expect(
      genericSendStub.args.filter((args) => args[0] === "eth_getBlockByNumber")
        .length,
    ).toBe(0)
    // Alchemy served it instead.
    expect(
      alchemySendStub.args.filter((args) => args[0] === "eth_getBlockByNumber")
        .length,
    ).toBeGreaterThan(0)
  })

  it("records the breaker transition to open in perf metrics", async () => {
    tripBreakerOpen(fallbackProvider, 0)
    const snapshot = snapshotAndReset()
    const primary = snapshot.chains[ETHEREUM.chainID].providers.find(
      (p) => p.providerIndex === 0,
    )!
    expect(primary.circuitBreakerOpens).toBe(1)
  })

  it("leaves routing unchanged when the breaker is closed", async () => {
    const result = await fallbackProvider.send("eth_getBlockByNumber", [
      "0x1",
      false,
    ])
    expect(result).toBe("generic")
  })
})
