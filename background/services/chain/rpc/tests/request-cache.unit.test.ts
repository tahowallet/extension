import { beforeEach, describe, expect, it } from "bun:test"
import { JsonRpcProvider } from "@ethersproject/providers"
import * as sinon from "sinon"
import RequestCache, { requestKey } from "../request-cache"
import {
  performanceMetricsObserver,
  reachabilityObserver,
} from "../request-outcome-observers"
import Endpoint from "../endpoint"
import EndpointPool from "../endpoint-pool"
import { NetworkReachabilityTracker } from "../../network-reachability"
import { resetForTests, snapshotAndReset } from "../../../../lib/perf-metrics"
import type { RpcRequest } from "../failover-executor"

const deferred = () => {
  let resolve!: (value: unknown) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<unknown>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe("RequestCache", () => {
  let now: number
  let coalesced: number
  let cache: RequestCache

  beforeEach(() => {
    now = 1_000
    coalesced = 0
    cache = new RequestCache({
      knownAnswers: { eth_chainId: "0x1" },
      recentAnswerTtlMs: { eth_getBalance: 1_000 },
      now: () => now,
      onCoalesce: () => {
        coalesced += 1
      },
    })
  })

  it("answers known methods without fetching", async () => {
    const fetch = sinon.stub()

    await expect(cache.getOrFetch("eth_chainId", [], fetch)).resolves.toBe(
      "0x1",
    )
    expect(fetch.called).toBe(false)
    expect(cache.hasKnownAnswer("eth_chainId")).toBe(true)
    expect(cache.hasKnownAnswer("eth_call")).toBe(false)
  })

  it("reuses a recent answer until its time is up", async () => {
    const fetch = sinon.stub().resolves("100")
    await cache.getOrFetch("eth_getBalance", ["0xA"], fetch)

    now += 999
    await cache.getOrFetch("eth_getBalance", ["0xa"], fetch)
    expect(fetch.callCount).toBe(1)

    now += 1
    await cache.getOrFetch("eth_getBalance", ["0xa"], fetch)
    expect(fetch.callCount).toBe(2)
  })

  it("does not remember methods without a lifetime", async () => {
    const fetch = sinon.stub().resolves("0x")

    await cache.getOrFetch("eth_call", [], fetch)
    await cache.getOrFetch("eth_call", [], fetch)

    expect(fetch.callCount).toBe(2)
  })

  it("does not remember failures", async () => {
    const fetch = sinon.stub()
    fetch.onCall(0).rejects(new Error("NETWORK_ERROR"))
    fetch.onCall(1).resolves("100")

    await expect(
      cache.getOrFetch("eth_getBalance", ["0xa"], fetch),
    ).rejects.toThrow("NETWORK_ERROR")
    await expect(
      cache.getOrFetch("eth_getBalance", ["0xa"], fetch),
    ).resolves.toBe("100")
  })

  it("shares an identical request in flight", async () => {
    const gate = deferred()
    const fetch = sinon.stub().returns(gate.promise)

    const first = cache.getOrFetch(
      "eth_call",
      [{ to: "0xA", data: "0x" }],
      fetch,
    )
    const second = cache.getOrFetch(
      "eth_call",
      [{ data: "0x", to: "0xa" }],
      fetch,
    )
    gate.resolve("0x1")

    await expect(Promise.all([first, second])).resolves.toEqual(["0x1", "0x1"])
    expect(fetch.callCount).toBe(1)
    expect(coalesced).toBe(1)
  })

  it("shares a failure in flight, then fetches afresh", async () => {
    const gate = deferred()
    const fetch = sinon.stub()
    fetch.onCall(0).returns(gate.promise)
    fetch.onCall(1).resolves("0x2")

    const first = cache.getOrFetch("eth_call", [], fetch)
    const second = cache.getOrFetch("eth_call", [], fetch)
    gate.reject(new Error("boom"))

    const outcomes = await Promise.allSettled([first, second])
    expect(outcomes.map(({ status }) => status)).toEqual([
      "rejected",
      "rejected",
    ])
    await expect(cache.getOrFetch("eth_call", [], fetch)).resolves.toBe("0x2")
  })

  it.each(["eth_sendRawTransaction", "eth_subscribe", "personal_sign"])(
    "never shares %s",
    async (method) => {
      const fetch = sinon.stub().resolves("0x")

      await Promise.all([
        cache.getOrFetch(method, ["0x1"], fetch),
        cache.getOrFetch(method, ["0x1"], fetch),
      ])

      expect(fetch.callCount).toBe(2)
      expect(coalesced).toBe(0)
    },
  )

  it("drops stale answers", async () => {
    await cache.getOrFetch("eth_getBalance", ["0xa"], async () => "1")
    await cache.getOrFetch("eth_getBalance", ["0xb"], async () => "2")

    expect(cache.dropStaleAnswers()).toBe(0)
    now += 1_000
    expect(cache.dropStaleAnswers()).toBe(2)
  })

  it("keys requests by their normalized payload", () => {
    expect(requestKey("m", [{ b: 1n, a: "0xAB" }, null])).toBe(
      requestKey("m", [{ a: "0xab", b: 1n }, null]),
    )
    expect(requestKey("m", [1])).not.toBe(requestKey("n", [1]))
  })
})

describe("request outcome observers", () => {
  const endpoint = () =>
    new Endpoint({
      kind: "standard",
      createTransport: () =>
        Object.assign(Object.create(JsonRpcProvider.prototype), {
          send: sinon.stub(),
          removeAllListeners: sinon.stub(),
        }) as JsonRpcProvider,
    })
  const request: RpcRequest = { method: "eth_call", params: [], startedAt: 0 }

  it("tells the reachability tracker about successes and outages", () => {
    const tracker = new NetworkReachabilityTracker()
    const success = sinon.spy(tracker, "recordSuccess")
    const exhausted = sinon.spy(tracker, "recordExhaustedWalk")
    const observer = reachabilityObserver(tracker)

    observer.onEndpointSuccess?.(request, endpoint())
    observer.onAllEndpointsFailed?.(request, new Error("NETWORK_ERROR"))

    expect(success.callCount).toBe(1)
    expect(exhausted.callCount).toBe(1)
  })

  it("counts sends and failures where a request started, and successes where it ended", () => {
    resetForTests()
    const endpoints = [endpoint(), endpoint()]
    const pool = new EndpointPool("standard", endpoints)
    const observer = performanceMetricsObserver(
      "1",
      (served) => endpoints.indexOf(served),
      () => 25,
    )

    observer.onRequestStarted?.(request, pool)
    observer.onEndpointSuccess?.(request, endpoints[1])
    const failed = { ...request, method: "eth_getLogs" }
    observer.onRequestStarted?.(failed, pool)
    observer.onRequestFailed?.(failed, new Error("NETWORK_ERROR"))

    const providers = snapshotAndReset().chains["1"].providers
    expect(
      providers.map(
        ({
          providerIndex,
          requestsSent,
          requestsSucceeded,
          requestsFailed,
        }) => [
          providerIndex,
          requestsSent,
          requestsSucceeded,
          requestsFailed["network-error"],
        ],
      ),
    ).toEqual([
      [0, 2, 0, 1],
      [1, 0, 1, 0],
    ])
  })
})
