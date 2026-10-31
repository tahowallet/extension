import { JsonRpcProvider } from "@ethersproject/providers"
import Sinon, * as sinon from "sinon"
import { ETHEREUM, MEZO, OPTIMISM } from "../../../constants"
import SerialFallbackProvider from "../serial-fallback-provider"
import { NetworkReachabilityState } from "../network-reachability"
import {
  resetForTests as resetPerfMetricsForTests,
  snapshotAndReset,
} from "../../../lib/perf-metrics"

const sandbox = sinon.createSandbox()

type Stubbed = { provider: JsonRpcProvider; send: Sinon.SinonStub }

const stubbed = (name: string): Stubbed => {
  const provider = new JsonRpcProvider(`http://${name}.example`)
  const send = sandbox.stub(provider, "send").callsFake(async () => name)
  return { provider, send }
}

const callsFor = (stub: Sinon.SinonStub, method: string) =>
  stub.args.filter((args) => args[0] === method).length

const withStatus = (message: string, status: number) =>
  Object.assign(new Error(message), { status })

describe("SerialFallbackProvider characterization", () => {
  afterEach(() => {
    sandbox.restore()
  })

  describe("routing precedence", () => {
    let managed: Stubbed
    let standard: Stubbed
    let alchemyCapable: Stubbed
    let methodSpecific: Stubbed

    beforeEach(() => {
      managed = stubbed("managed")
      standard = stubbed("standard")
      alchemyCapable = stubbed("alchemy")
      methodSpecific = stubbed("method-specific")
    })

    const providerFor = (chainID: string, methods?: string[]) =>
      new SerialFallbackProvider(chainID, [
        { kind: "managed", createTransport: () => managed.provider },
        { kind: "standard", createTransport: () => standard.provider },
        {
          kind: "standard",
          capabilities: ["alchemy_", "qn_"],
          createTransport: () => alchemyCapable.provider,
        },
        {
          kind: "method-specific",
          methods: methods ?? ["eth_sendRawTransaction"],
          createTransport: () => methodSpecific.provider,
        },
      ])

    it.each([
      // Method-specific endpoints beat everything for their methods.
      [ETHEREUM.chainID, "eth_sendRawTransaction", "method-specific"],
      // Capability endpoints beat the managed endpoint for their namespace.
      [ETHEREUM.chainID, "alchemy_getTokenBalances", "alchemy"],
      [ETHEREUM.chainID, "qn_getTokenMetadata", "alchemy"],
      // Methods pinned to the managed endpoint skip the walk.
      [ETHEREUM.chainID, "eth_getLogs", "managed"],
      [ETHEREUM.chainID, "eth_estimateGas", "managed"],
      [ETHEREUM.chainID, "eth_subscribe", "managed"],
      [OPTIMISM.chainID, "eth_call", "managed"],
      // Everything else walks, and the managed endpoint leads the walk.
      [ETHEREUM.chainID, "eth_call", "managed"],
      [ETHEREUM.chainID, "eth_getBalance", "managed"],
    ])(
      "on chain %s routes %s to the %s endpoint",
      async (chainID, method, expected) => {
        await expect(providerFor(chainID).send(method, [])).resolves.toEqual(
          expected,
        )
      },
    )

    it("sends everything but alchemy_ to a method-specific endpoint that lists no methods", async () => {
      const provider = providerFor(ETHEREUM.chainID, [])

      await expect(provider.send("eth_getBalance", [])).resolves.toEqual(
        "method-specific",
      )
      await expect(
        provider.send("alchemy_getAssetTransfers", []),
      ).resolves.toEqual("alchemy")
    })

    it("walks alchemy_ methods when nothing declares the namespace and there is no managed endpoint", async () => {
      const provider = new SerialFallbackProvider(ETHEREUM.chainID, [
        { kind: "standard", createTransport: () => standard.provider },
      ])

      await expect(
        provider.send("alchemy_getTokenBalances", []),
      ).resolves.toEqual("standard")
    })

    it("does not fall back to the managed endpoint for namespaces it doesn't pin", async () => {
      const error = new Error("some strange failure")
      alchemyCapable.send.withArgs("qn_getTokenMetadata").rejects(error)

      await expect(
        providerFor(ETHEREUM.chainID).send("qn_getTokenMetadata", []),
      ).rejects.toEqual(error)
      expect(callsFor(managed.send, "qn_getTokenMetadata")).toEqual(0)
    })

    // Boar doesn't serve Alchemy's APIs on Mezo, so they walk.
    it("walks alchemy_ methods on Mezo rather than pinning them to the managed endpoint", async () => {
      const provider = new SerialFallbackProvider(MEZO.chainID, [
        { kind: "managed", createTransport: () => managed.provider },
        { kind: "standard", createTransport: () => standard.provider },
      ])
      managed.send
        .withArgs("alchemy_getTokenBalances")
        .rejects(new Error("NETWORK_ERROR"))

      expect(provider.supportsAlchemyMethods).toBe(false)
      await expect(
        provider.send("alchemy_getTokenBalances", []),
      ).resolves.toEqual("standard")
      expect(callsFor(managed.send, "alchemy_getTokenBalances")).toEqual(1)
      expect(callsFor(standard.send, "alchemy_getTokenBalances")).toEqual(1)
    })
  })

  describe("client-error matrix on the walk", () => {
    let first: Stubbed
    let second: Stubbed
    let provider: SerialFallbackProvider

    beforeEach(() => {
      first = stubbed("first")
      second = stubbed("second")
      provider = new SerialFallbackProvider(ETHEREUM.chainID, [
        { kind: "standard", createTransport: () => first.provider },
        { kind: "standard", createTransport: () => second.provider },
      ])
    })

    afterEach(() => {
      provider.destroy()
    })

    it.each([
      ["a network error", new Error("NETWORK_ERROR"), 1, 1, "second"],
      ["a timeout", new Error("TIMEOUT"), 1, 1, "second"],
      ["a rate limit", new Error("Too Many Requests"), 1, 1, "second"],
      ["a missing response", new Error("missing response"), 1, 1, "second"],
      ["a 401", withStatus("bad response", 401), 1, 1, "second"],
      ["a 403", withStatus("bad response", 403), 1, 1, "second"],
      ["a 5xx bad response", withStatus("bad response", 503), 4, 1, "second"],
      ["an unstatused bad response", new Error("bad response"), 4, 1, "second"],
      ["a 400", withStatus("bad response", 400), 1, 0, undefined],
      ["a 404", withStatus("bad response", 404), 1, 0, undefined],
      ["a 429 bad response", withStatus("bad response", 429), 1, 0, undefined],
      ["a 499", withStatus("bad response", 499), 1, 0, undefined],
      [
        "an unidentified error",
        new Error("execution reverted"),
        1,
        0,
        undefined,
      ],
      ["an out-of-gas eth_call", new Error("out of gas"), 1, 0, undefined],
      [
        "a batch limit off a plain transport",
        new Error("batch too large"),
        1,
        0,
        undefined,
      ],
    ])(
      "after %s, tries the first endpoint %i times and the second %i times",
      async (_, error, firstAttempts, secondAttempts, result) => {
        first.send.withArgs("eth_call").rejects(error)

        const outcome = await provider.send("eth_call", []).then(
          (value) => value,
          (rejection: unknown) => rejection,
        )

        expect(callsFor(first.send, "eth_call")).toEqual(firstAttempts)
        expect(callsFor(second.send, "eth_call")).toEqual(secondAttempts)
        if (result === undefined) {
          expect(outcome).toBe(error)
        } else {
          expect(outcome).toEqual(result)
        }
      },
      10_000,
    )

    it("retries a bad response on the endpoint it failed over to as well", async () => {
      first.send.withArgs("eth_call").rejects(new Error("bad response"))
      second.send.withArgs("eth_call").rejects(new Error("bad response"))

      await expect(provider.send("eth_call", [])).rejects.toThrow(
        "bad response",
      )

      expect(callsFor(first.send, "eth_call")).toEqual(4)
      expect(callsFor(second.send, "eth_call")).toEqual(4)
    }, 10_000)

    it("gives up on a bad response from a lone endpoint after four attempts", async () => {
      const lone = new SerialFallbackProvider(ETHEREUM.chainID, [
        { kind: "standard", createTransport: () => first.provider },
      ])
      first.send.withArgs("eth_call").rejects(new Error("bad response"))

      await expect(lone.send("eth_call", [])).rejects.toThrow("bad response")

      expect(callsFor(first.send, "eth_call")).toEqual(4)
      lone.destroy()
    }, 10_000)
  })

  describe("destroying", () => {
    it("tears down every endpoint in every pool, once", () => {
      const managed = stubbed("managed")
      const standard = stubbed("standard")
      const methodSpecific = stubbed("method-specific")
      const provider = new SerialFallbackProvider(ETHEREUM.chainID, [
        { kind: "managed", createTransport: () => managed.provider },
        {
          kind: "standard",
          capabilities: ["alchemy_"],
          createTransport: () => standard.provider,
        },
        {
          kind: "method-specific",
          createTransport: () => methodSpecific.provider,
        },
      ])
      // Builds the capability endpoint.
      provider.send("alchemy_getTokenBalances", []).catch(() => undefined)
      const teardowns = [managed, standard, methodSpecific].map(
        ({ provider: transport }) =>
          sandbox.spy(transport, "removeAllListeners"),
      )

      provider.destroy()
      provider.destroy()

      expect(teardowns.map((spy) => spy.callCount)).toEqual([1, 1, 1])
      expect(provider.isDestroyed).toBe(true)
    })
  })

  describe("two requests failing over at once", () => {
    it("moves both to the next endpoint and advances the walk once", async () => {
      const first = stubbed("first")
      const second = stubbed("second")
      const third = stubbed("third")
      const provider = new SerialFallbackProvider(ETHEREUM.chainID, [
        { kind: "standard", createTransport: () => first.provider },
        { kind: "standard", createTransport: () => second.provider },
        { kind: "standard", createTransport: () => third.provider },
      ])
      first.send.withArgs("eth_call").rejects(new Error("NETWORK_ERROR"))

      await expect(
        Promise.all([
          provider.send("eth_call", [{ data: "0x1" }]),
          provider.send("eth_call", [{ data: "0x2" }]),
        ]),
      ).resolves.toEqual(["second", "second"])

      expect(callsFor(first.send, "eth_call")).toEqual(2)
      expect(callsFor(second.send, "eth_call")).toEqual(2)
      expect(callsFor(third.send, "eth_call")).toEqual(0)
      // oxlint-disable-next-line typescript/no-explicit-any
      expect((provider as any).currentProviderIndex).toEqual(1)

      provider.destroy()
    })
  })

  describe("metrics and reachability per scenario", () => {
    let first: Stubbed
    let second: Stubbed
    let provider: SerialFallbackProvider
    let reported: NetworkReachabilityState[]

    // Request counters only; reconnect and breaker counters belong to
    // mechanisms the refactor replaces.
    const requestCounters = () =>
      snapshotAndReset()
        .chains[ETHEREUM.chainID]?.providers.map(
          ({
            providerIndex,
            requestsSent,
            requestsSucceeded,
            requestsFailed,
          }) => ({
            providerIndex,
            requestsSent,
            requestsSucceeded,
            networkErrors: requestsFailed["network-error"],
          }),
        )
        .filter(
          ({ requestsSent, requestsSucceeded, networkErrors }) =>
            requestsSent + requestsSucceeded + networkErrors > 0,
        )

    beforeEach(() => {
      resetPerfMetricsForTests()
      reported = []
      first = stubbed("first")
      second = stubbed("second")
      provider = new SerialFallbackProvider(
        ETHEREUM.chainID,
        [
          { kind: "standard", createTransport: () => first.provider },
          { kind: "standard", createTransport: () => second.provider },
        ],
        (next) => reported.push(next),
      )
    })

    afterEach(() => {
      provider.destroy()
    })

    it("counts a request served by the primary against it", async () => {
      await provider.send("eth_blockNumber", [])

      expect(requestCounters()).toEqual([
        {
          providerIndex: 0,
          requestsSent: 1,
          requestsSucceeded: 1,
          networkErrors: 0,
        },
      ])
      expect(reported).toEqual([])
    })

    it("counts a failed-over request against the endpoint that served it", async () => {
      first.send.withArgs("eth_blockNumber").rejects(new Error("NETWORK_ERROR"))

      await provider.send("eth_blockNumber", [])

      expect(requestCounters()).toEqual([
        {
          providerIndex: 0,
          requestsSent: 1,
          requestsSucceeded: 0,
          networkErrors: 0,
        },
        {
          providerIndex: 1,
          requestsSent: 0,
          requestsSucceeded: 1,
          networkErrors: 0,
        },
      ])
      expect(reported).toEqual([])
    })

    it("counts an exhausted walk once, against the primary", async () => {
      first.send.withArgs("eth_blockNumber").rejects(new Error("NETWORK_ERROR"))
      second.send
        .withArgs("eth_blockNumber")
        .rejects(new Error("NETWORK_ERROR"))

      await provider.send("eth_blockNumber", []).catch(() => undefined)

      expect(requestCounters()).toEqual([
        {
          providerIndex: 0,
          requestsSent: 1,
          requestsSucceeded: 0,
          networkErrors: 1,
        },
      ])
      expect(reported).toEqual([])
    })

    it("counts nothing for a cache hit or eth_chainId", async () => {
      await provider.send("eth_getCode", ["0xabc", "latest"])
      resetPerfMetricsForTests()

      await provider.send("eth_getCode", ["0xabc", "latest"])
      await provider.send("eth_chainId", [])

      expect(requestCounters()).toBeUndefined()
    })
  })
})
