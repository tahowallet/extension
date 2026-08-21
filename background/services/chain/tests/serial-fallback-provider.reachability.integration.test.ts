import { JsonRpcProvider } from "@ethersproject/providers"
import Sinon, * as sinon from "sinon"
import { ETHEREUM } from "../../../constants"
import SerialFallbackProvider from "../serial-fallback-provider"
import { NetworkReachabilityState } from "../network-reachability"

const sandbox = sinon.createSandbox()

/**
 * Long enough to clear the tracker's success floor. The tests move the clock
 * rather than waiting, so the exact value only has to be comfortably past it.
 */
const PAST_THE_FLOOR_MS = 60_000

/** A rejection the provider's error classifier reads as a network error. */
const networkError = () => new Error("NETWORK_ERROR: endpoint is dark")

/**
 * Drives a send to completion whether it resolves or rejects. Every test here
 * is about what the provider concluded, not about what the caller saw, and
 * the callers this stands in for — balance fetching, block watching, gas
 * polling — all swallow the error the same way.
 */
async function attempt(
  provider: SerialFallbackProvider,
  method: string,
  params: unknown[] = [],
): Promise<void> {
  await provider.send(method, params).catch(() => undefined)
}

describe("SerialFallbackProvider reachability integration", () => {
  let clock: sinon.SinonFakeTimers
  let reported: NetworkReachabilityState[]
  let primarySend: Sinon.SinonStub
  let fallbackSend: Sinon.SinonStub

  // Only `Date` is faked. The provider's own reconnect and cache-cleanup
  // timers, and the backoff waits inside its failover paths, have to keep
  // running on the real clock for a send to get anywhere at all.
  const freezeDate = () =>
    sandbox.useFakeTimers({ now: 1_700_000_000_000, toFake: ["Date"] })

  beforeEach(() => {
    clock = freezeDate()
    reported = []
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe("a walk with two stored endpoints", () => {
    let provider: SerialFallbackProvider

    beforeEach(() => {
      const primary = new JsonRpcProvider("fake-primary-url")
      const fallback = new JsonRpcProvider("fake-fallback-url")
      primarySend = sandbox.stub(primary, "send")
      fallbackSend = sandbox.stub(fallback, "send")

      provider = new SerialFallbackProvider(
        ETHEREUM.chainID,
        [
          { type: "generic", creator: () => primary },
          { type: "generic", creator: () => fallback },
        ],
        (next) => reported.push(next),
      )
    })

    afterEach(() => {
      provider.destroy()
    })

    it("stays reachable while one endpoint still answers", async () => {
      primarySend.rejects(networkError())
      fallbackSend.resolves("0x1")

      // However long the primary stays down, the walk always finds the
      // fallback, so the chain was never out of reach.
      for (let i = 0; i < 4; i += 1) {
        clock.tick(PAST_THE_FLOOR_MS)
        // eslint-disable-next-line no-await-in-loop
        await attempt(provider, "eth_getBlockByNumber", ["0x1", false])
      }

      expect(provider.reachability).toBe("reachable")
      expect(reported).toEqual([])
    })

    it("stays reachable through a single exhausted walk", async () => {
      primarySend.rejects(networkError())
      fallbackSend.rejects(networkError())

      clock.tick(PAST_THE_FLOOR_MS)
      await attempt(provider, "eth_getBlockByNumber", ["0x1", false])

      expect(provider.reachability).toBe("reachable")
      expect(reported).toEqual([])
    })

    it("reports unreachable once every endpoint has been exhausted twice past the floor", async () => {
      primarySend.rejects(networkError())
      fallbackSend.rejects(networkError())

      await attempt(provider, "eth_getBlockByNumber", ["0x1", false])
      expect(provider.reachability).toBe("reachable")

      clock.tick(PAST_THE_FLOOR_MS)
      await attempt(provider, "eth_getBlockByNumber", ["0x2", false])

      expect(provider.reachability).toBe("unreachable")
      expect(reported).toEqual(["unreachable"])
    })

    it("reports the outage once rather than once per failed call", async () => {
      primarySend.rejects(networkError())
      fallbackSend.rejects(networkError())

      for (let i = 0; i < 6; i += 1) {
        clock.tick(PAST_THE_FLOOR_MS)
        // eslint-disable-next-line no-await-in-loop
        await attempt(provider, "eth_getBlockByNumber", [`0x${i}`, false])
      }

      expect(provider.reachability).toBe("unreachable")
      expect(reported).toEqual(["unreachable"])
    })

    it("recovers on the first endpoint that answers again", async () => {
      primarySend.rejects(networkError())
      fallbackSend.rejects(networkError())

      await attempt(provider, "eth_getBlockByNumber", ["0x1", false])
      clock.tick(PAST_THE_FLOOR_MS)
      await attempt(provider, "eth_getBlockByNumber", ["0x2", false])
      expect(provider.reachability).toBe("unreachable")

      primarySend.resolves("0x3")
      await attempt(provider, "eth_getBlockByNumber", ["0x3", false])

      expect(provider.reachability).toBe("reachable")
      expect(reported).toEqual(["unreachable", "reachable"])
    })

    it("says nothing at all once it has been destroyed", async () => {
      primarySend.rejects(networkError())
      fallbackSend.rejects(networkError())

      await attempt(provider, "eth_getBlockByNumber", ["0x1", false])
      clock.tick(PAST_THE_FLOOR_MS)

      provider.destroy()
      await attempt(provider, "eth_getBlockByNumber", ["0x2", false])

      // The chain now belongs to whatever provider replaced this one; a
      // retired instance reporting on it would fight its successor.
      expect(reported).toEqual([])
    })
  })

  describe("a chain served by a Taho-managed endpoint", () => {
    let provider: SerialFallbackProvider
    let managedSend: Sinon.SinonStub

    beforeEach(() => {
      const managed = new JsonRpcProvider("fake-managed-url")
      const stored = new JsonRpcProvider("fake-stored-url")
      managedSend = sandbox.stub(managed, "send")
      fallbackSend = sandbox.stub(stored, "send")

      // Mirrors production: the managed endpoint heads the walk and is also
      // held separately for the methods that must route through it.
      provider = new SerialFallbackProvider(
        ETHEREUM.chainID,
        [
          { type: "boar", creator: () => managed },
          { type: "generic", creator: () => stored },
        ],
        (next) => reported.push(next),
      )
    })

    afterEach(() => {
      provider.destroy()
    })

    it("counts a success on the managed path, which no circuit breaker sees", async () => {
      // Everything the walk carries fails; the managed-only methods do not.
      // This is the hole a breaker-based verdict falls into — the managed path
      // never touches a breaker, so its successes would go unnoticed.
      managedSend.withArgs("eth_getBlockByNumber").rejects(networkError())
      fallbackSend.withArgs("eth_getBlockByNumber").rejects(networkError())
      managedSend.withArgs("eth_getLogs").resolves([])

      await attempt(provider, "eth_getBlockByNumber", ["0x1", false])
      clock.tick(PAST_THE_FLOOR_MS)
      await attempt(provider, "eth_getBlockByNumber", ["0x2", false])
      expect(provider.reachability).toBe("unreachable")

      await attempt(provider, "eth_getLogs", [{ fromBlock: "0x1" }])

      expect(provider.reachability).toBe("reachable")
      expect(reported).toEqual(["unreachable", "reachable"])
    })
  })
})
