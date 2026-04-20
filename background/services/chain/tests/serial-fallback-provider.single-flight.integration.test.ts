import { JsonRpcProvider } from "@ethersproject/providers"
import Sinon, * as sinon from "sinon"
import { ETHEREUM } from "../../../constants"
import SerialFallbackProvider from "../serial-fallback-provider"
import {
  resetForTests as resetPerfMetricsForTests,
  snapshotAndReset,
} from "../../../lib/perf-metrics"

const sandbox = sinon.createSandbox()

/**
 * Promise that exposes its resolver, so a test can hold a request in-flight
 * and only release it once the coalescing assertion has been made.
 */
function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe("SerialFallbackProvider single-flight coalescing", () => {
  let fallbackProvider: SerialFallbackProvider
  let genericSendStub: Sinon.SinonStub
  let alchemySendStub: Sinon.SinonStub

  beforeEach(() => {
    resetPerfMetricsForTests()
    const mockGenericProvider = new JsonRpcProvider("fake-rpc-url")
    const mockAlchemyProvider = new JsonRpcProvider("fake-alchemy-url")
    genericSendStub = sandbox
      .stub(mockGenericProvider, "send")
      .callsFake(async () => "success")
    alchemySendStub = sandbox
      .stub(mockAlchemyProvider, "send")
      .callsFake(async () => "success")
    fallbackProvider = new SerialFallbackProvider(ETHEREUM.chainID, [
      { type: "generic", creator: () => mockGenericProvider },
      { type: "alchemy", creator: () => mockAlchemyProvider },
    ])
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("coalesces concurrent identical requests into a single provider call", async () => {
    const gate = deferred<string>()
    genericSendStub
      .withArgs("eth_getBlockByNumber")
      .callsFake(() => gate.promise)

    const first = fallbackProvider.send("eth_getBlockByNumber", ["0x1", false])
    const second = fallbackProvider.send("eth_getBlockByNumber", ["0x1", false])
    const third = fallbackProvider.send("eth_getBlockByNumber", ["0x1", false])

    // All three callers should be waiting on the single underlying promise.
    expect(
      genericSendStub.args.filter((args) => args[0] === "eth_getBlockByNumber")
        .length,
    ).toBe(1)

    gate.resolve("block")
    await expect(first).resolves.toBe("block")
    await expect(second).resolves.toBe("block")
    await expect(third).resolves.toBe("block")

    expect(
      genericSendStub.args.filter((args) => args[0] === "eth_getBlockByNumber")
        .length,
    ).toBe(1)

    const snapshot = snapshotAndReset()
    expect(
      snapshot.chains[ETHEREUM.chainID].providers[0].singleFlightCoalesces,
    ).toBe(2)
  })

  it("does not coalesce requests whose params differ", async () => {
    genericSendStub
      .withArgs("eth_getBlockByNumber")
      .callsFake(
        async (_method, params: unknown[]) => `block-${String(params[0])}`,
      )

    const [a, b] = await Promise.all([
      fallbackProvider.send("eth_getBlockByNumber", ["0x1", false]),
      fallbackProvider.send("eth_getBlockByNumber", ["0x2", false]),
    ])

    expect(a).toBe("block-0x1")
    expect(b).toBe("block-0x2")
    expect(
      genericSendStub.args.filter((args) => args[0] === "eth_getBlockByNumber")
        .length,
    ).toBe(2)
  })

  it("starts a fresh provider call after the shared promise settles", async () => {
    let callCount = 0
    genericSendStub.withArgs("eth_getBlockByNumber").callsFake(async () => {
      callCount += 1
      return `block-${callCount}`
    })

    const first = await fallbackProvider.send("eth_getBlockByNumber", [
      "0x1",
      false,
    ])
    const second = await fallbackProvider.send("eth_getBlockByNumber", [
      "0x1",
      false,
    ])

    // Sequential calls (not concurrent) each perform their own provider hit
    // for a method that is not in the read-through cache.
    expect(first).toBe("block-1")
    expect(second).toBe("block-2")
    expect(callCount).toBe(2)
  })

  it("does not coalesce eth_sendRawTransaction even with identical params", async () => {
    // eth_sendRawTransaction is always routed to the alchemy provider.
    let txCount = 0
    alchemySendStub.callsFake(async (method: string) => {
      if (method === "eth_sendRawTransaction") {
        txCount += 1
        return `tx-${txCount}`
      }
      return "success"
    })

    const [a, b] = await Promise.all([
      fallbackProvider.send("eth_sendRawTransaction", ["0xdeadbeef"]),
      fallbackProvider.send("eth_sendRawTransaction", ["0xdeadbeef"]),
    ])

    expect(a).toBe("tx-1")
    expect(b).toBe("tx-2")
    expect(txCount).toBe(2)
  })

  it("propagates a shared rejection to all followers and clears the in-flight slot", async () => {
    const gate = deferred<string>()
    let callCount = 0
    genericSendStub.callsFake(async (method: string) => {
      if (method === "eth_getBalance") {
        callCount += 1
        if (callCount === 1) {
          return gate.promise
        }
        return "0x42"
      }
      return "success"
    })

    const first = fallbackProvider.send("eth_getBalance", ["0xabc", "latest"])
    const second = fallbackProvider.send("eth_getBalance", ["0xabc", "latest"])

    // Reject with an error that routeRpcCall treats as a non-retryable,
    // uncategorized failure so it propagates directly to our callers.
    gate.reject(new Error("single-flight terminal failure"))

    await expect(first).rejects.toThrow("single-flight terminal failure")
    await expect(second).rejects.toThrow("single-flight terminal failure")

    // Now that the in-flight slot has been cleared, a subsequent call goes
    // to the provider again rather than inheriting the rejected promise.
    const third = await fallbackProvider.send("eth_getBalance", [
      "0xabc",
      "latest",
    ])
    expect(third).toBe("0x42")
    expect(callCount).toBe(2)
  })
})
