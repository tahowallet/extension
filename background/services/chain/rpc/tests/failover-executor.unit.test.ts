import { describe, expect, it } from "bun:test"
import { JsonRpcProvider } from "@ethersproject/providers"
import { SimulatedClock } from "xstate"
import * as sinon from "sinon"
import Endpoint from "../endpoint"
import EndpointPool from "../endpoint-pool"
import FailoverExecutor, {
  NoEndpointAvailableError,
  RequestOutcomeObserver,
  RpcRequest,
} from "../failover-executor"
import {
  anyErrorFailsOverPolicy,
  standardFailurePolicy,
} from "../failure-policy"

type Stub = sinon.SinonStub

function setup(size: number, threshold = 5) {
  const clock = new SimulatedClock()
  const sends: Stub[] = []
  const endpoints = Array.from({ length: size }, (_, index) => {
    const send = sinon.stub().resolves(`endpoint ${index}`)
    sends.push(send)
    return new Endpoint(
      {
        kind: "standard",
        createTransport: () =>
          Object.assign(Object.create(JsonRpcProvider.prototype), {
            send,
            removeAllListeners: sinon.stub(),
          }) as JsonRpcProvider,
      },
      { clock, options: { failureThreshold: threshold } },
    )
  })
  endpoints.forEach((endpoint) => endpoint.build())
  const pool = new EndpointPool("standard", endpoints, { clock })
  const events: string[] = []
  const observer: RequestOutcomeObserver = {
    onAttempt: (_, endpoint) =>
      events.push(`attempt ${endpoints.indexOf(endpoint)}`),
    onEndpointSuccess: (_, endpoint) =>
      events.push(`success ${endpoints.indexOf(endpoint)}`),
    onEndpointFailure: (_, endpoint) =>
      events.push(`failure ${endpoints.indexOf(endpoint)}`),
    onAllEndpointsFailed: () => events.push("all failed"),
  }
  const waits: number[] = []
  const executor = new FailoverExecutor([observer], async (ms) => {
    waits.push(ms)
  })
  const controller = new AbortController()
  const request = (method = "eth_call"): RpcRequest => ({
    method,
    params: [],
    startedAt: 0,
  })
  const send = (policy = standardFailurePolicy, method = "eth_call") =>
    executor.sendWithFailover(request(method), pool, policy, controller.signal)

  return { endpoints, pool, sends, events, waits, controller, send, clock }
}

const calls = (stub: Stub, method = "eth_call") =>
  stub.args.filter(([m]) => m === method).length

describe("FailoverExecutor", () => {
  it("returns the first answer and records it", async () => {
    const { send, events, pool } = setup(2)

    await expect(send()).resolves.toMatchObject({ result: "endpoint 0" })
    expect(events).toEqual(["attempt 0", "success 0"])
    expect(pool.preferredIndex).toBe(0)
  })

  it("fails over on an outage and moves the pool's preference", async () => {
    const { send, sends, events, pool } = setup(3)
    sends[0].rejects(new Error("NETWORK_ERROR"))

    await expect(send()).resolves.toMatchObject({ result: "endpoint 1" })
    expect(events).toEqual(["attempt 0", "failure 0", "attempt 1", "success 1"])
    expect(pool.preferredIndex).toBe(1)
  })

  it("retries an invalid response in place, with the policy's delay", async () => {
    const { send, sends, waits } = setup(2)
    sends[0].onCall(0).rejects(new Error("bad response"))

    await expect(send()).resolves.toMatchObject({ result: "endpoint 0" })
    expect(calls(sends[0])).toBe(2)
    expect(waits).toHaveLength(1)
    expect(waits[0]).toBeGreaterThanOrEqual(400)
  })

  it("gives up on a client error without trying anything else", async () => {
    const { send, sends, events } = setup(2)
    const error = Object.assign(new Error("bad response"), { status: 400 })
    sends[0].rejects(error)

    await expect(send()).rejects.toBe(error)
    expect(calls(sends[1])).toBe(0)
    expect(events).not.toContain("all failed")
  })

  it("reports an outage when every endpoint fails with one", async () => {
    const { send, sends, events } = setup(2)
    sends.forEach((stub) => stub.rejects(new Error("NETWORK_ERROR")))

    await expect(send()).rejects.toThrow("NETWORK_ERROR")
    expect(events.at(-1)).toBe("all failed")
  })

  it("does not report an outage when the last failure was about the key", async () => {
    const { send, sends, events } = setup(2)
    sends.forEach((stub) =>
      stub.rejects(Object.assign(new Error("bad response"), { status: 403 })),
    )

    await expect(send()).rejects.toThrow("bad response")
    expect(events).not.toContain("all failed")
  })

  it("reports an outage when no endpoint can take requests", async () => {
    const { send, endpoints, events } = setup(2, 1)
    endpoints.forEach((endpoint) => endpoint.recordFailure())

    await expect(send()).rejects.toBeInstanceOf(NoEndpointAvailableError)
    expect(events).toEqual(["all failed"])
  })

  it("moves on after any error under the any-error policy", async () => {
    const { send, sends } = setup(2)
    sends[0].rejects(new Error("execution reverted"))

    await expect(send(anyErrorFailsOverPolicy)).resolves.toMatchObject({
      result: "endpoint 1",
    })
  })

  it.each([
    ["a revert", new Error("execution reverted")],
    [
      "a client error",
      Object.assign(new Error("bad response"), { status: 400 }),
    ],
  ])("leaves the endpoint available after %s", async (_, error) => {
    const { send, sends, endpoints, events } = setup(2, 1)
    sends[0].rejects(error)

    await expect(send(anyErrorFailsOverPolicy)).resolves.toMatchObject({
      result: "endpoint 1",
    })
    expect(events).toContain("failure 0")
    expect(endpoints[0].isAvailable).toBe(true)
  })

  it.each([
    ["an outage", new Error("NETWORK_ERROR")],
    ["a key error", Object.assign(new Error("bad response"), { status: 403 })],
  ])("cools the endpoint down after %s", async (_, error) => {
    const { send, sends, endpoints } = setup(2, 1)
    sends[0].rejects(error)

    await expect(send()).resolves.toMatchObject({ result: "endpoint 1" })
    expect(endpoints[0].isAvailable).toBe(false)
  })

  it("skips an endpoint that started cooling down mid-walk", async () => {
    const { send, sends, endpoints } = setup(3, 1)
    sends[0].callsFake(async () => {
      endpoints[1].recordFailure()
      throw new Error("NETWORK_ERROR")
    })

    await expect(send()).resolves.toMatchObject({ result: "endpoint 2" })
    expect(calls(sends[1])).toBe(0)
  })

  it("stops when its signal is aborted, with the error it saw", async () => {
    const { send, sends, controller } = setup(2)
    const error = new Error("NETWORK_ERROR")
    sends[0].callsFake(async () => {
      controller.abort(new Error("destroyed"))
      throw error
    })

    await expect(send()).rejects.toBe(error)
    expect(calls(sends[1])).toBe(0)
  })

  it("does not start once aborted", async () => {
    const { send, sends, controller } = setup(1)
    controller.abort(new Error("destroyed"))

    await expect(send()).rejects.toThrow("destroyed")
    expect(sends[0].called).toBe(false)
  })

  describe("concurrency", () => {
    it("moves two requests failing over at once to the same endpoint", async () => {
      const { send, sends, pool } = setup(3)
      sends[0].rejects(new Error("NETWORK_ERROR"))

      const results = await Promise.all([send(), send()])

      expect(results.map(({ result }) => result)).toEqual([
        "endpoint 1",
        "endpoint 1",
      ])
      expect(calls(sends[0])).toBe(2)
      expect(calls(sends[1])).toBe(2)
      expect(calls(sends[2])).toBe(0)
      expect(pool.preferredIndex).toBe(1)
    })

    it("lets one request's failures leave another's retries alone", async () => {
      const { send, sends } = setup(2)
      sends[0].withArgs("eth_call").rejects(new Error("NETWORK_ERROR"))
      sends[0]
        .withArgs("eth_getBalance")
        .onCall(0)
        .rejects(new Error("bad response"))

      const [, balance] = await Promise.all([
        send(),
        send(standardFailurePolicy, "eth_getBalance"),
      ])

      // The balance request was retried on its own endpoint, whatever the
      // other request did to the pool.
      expect(balance.result).toBe("endpoint 0")
      expect(calls(sends[0], "eth_getBalance")).toBe(2)
    })

    it("finishes on its snapshot when the preference changes mid-request", async () => {
      const { send, sends, pool, endpoints } = setup(3)
      let release: () => void = () => {}
      sends[0].callsFake(
        () =>
          new Promise((_, reject) => {
            release = () => reject(new Error("NETWORK_ERROR"))
          }),
      )

      const inFlight = send()
      // Another request succeeds on endpoint 2 in the meantime.
      pool.recordSuccess(endpoints[2])
      release()

      await expect(inFlight).resolves.toMatchObject({ result: "endpoint 1" })
      expect(pool.preferredIndex).toBe(1)
    })
  })
})
