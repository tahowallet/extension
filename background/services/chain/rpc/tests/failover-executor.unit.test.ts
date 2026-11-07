import { describe, expect, it } from "bun:test"
import { JsonRpcProvider } from "@ethersproject/providers"
import { SimulatedClock } from "xstate"
import * as sinon from "sinon"
import Endpoint from "../endpoint"
import EndpointPool from "../endpoint-pool"
import FailoverExecutor, {
  NoEndpointAvailableError,
  REFUSAL_RETRY_MS,
  RequestOutcomeObserver,
  RpcRequest,
} from "../failover-executor"
import {
  anyErrorFailsOverPolicy,
  indicatesEndpointFault,
  indicatesOutage,
  standardFailurePolicy,
} from "../failure-policy"
import { rpcContextOf } from "../error-context"
import { getErrorType } from "../../errors"

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
      {
        label: `chain 1 standard[${index}] rpc${index}.example`,
        clock,
        options: { failureThreshold: threshold },
      },
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
  const executor = new FailoverExecutor(
    [observer],
    async (ms) => {
      waits.push(ms)
    },
    () => clock.now(),
  )
  const controller = new AbortController()
  const request = (
    method = "eth_call",
    params: unknown[] = [],
  ): RpcRequest => ({
    chainID: "1",
    method,
    params,
    startedAt: 0,
  })
  const send = (
    policy = standardFailurePolicy,
    method = "eth_call",
    params: unknown[] = [],
  ) =>
    executor.sendWithFailover(
      request(method, params),
      pool,
      policy,
      controller.signal,
    )

  const sendRoute = (method = "eth_call") =>
    executor.send(
      request(method),
      [{ pool, policy: standardFailurePolicy }],
      controller.signal,
    )

  return {
    endpoints,
    pool,
    sends,
    events,
    waits,
    controller,
    send,
    sendRoute,
    clock,
  }
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

  it("still tries a pool's only endpoint while it cools down", async () => {
    const { send, endpoints, sends, events } = setup(1, 1)
    endpoints[0].recordFailure()
    expect(endpoints[0].status).toBe("CoolingDown")

    await expect(send()).resolves.toMatchObject({ result: "endpoint 0" })
    expect(events).toEqual(["attempt 0", "success 0"])
    expect(calls(sends[0])).toBe(1)
  })

  it("reports an outage when a pool's only endpoint fails while cooling down", async () => {
    const { send, endpoints, sends, events } = setup(1, 1)
    endpoints[0].recordFailure()
    sends[0].rejects(new Error("NETWORK_ERROR"))

    await expect(send()).rejects.toThrow("NETWORK_ERROR")
    expect(events).toEqual(["attempt 0", "failure 0", "all failed"])
  })

  it("skips cooling endpoints in a pool of several", async () => {
    const { send, endpoints, sends, events } = setup(2, 1)
    endpoints.forEach((endpoint) => endpoint.recordFailure())

    await expect(send()).rejects.toBeInstanceOf(NoEndpointAvailableError)
    expect(sends.map((stub) => calls(stub))).toEqual([0, 0])
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

  it("stops when its signal is aborted, with the abort reason", async () => {
    const { send, sends, controller } = setup(2)
    const reason = new Error("destroyed")
    sends[0].callsFake(async () => {
      controller.abort(reason)
      throw new Error("NETWORK_ERROR")
    })

    await expect(send()).rejects.toBe(reason)
    expect(calls(sends[1])).toBe(0)
  })

  it("does not start once aborted", async () => {
    const { send, sends, controller } = setup(1)
    controller.abort(new Error("destroyed"))

    await expect(send()).rejects.toThrow("destroyed")
    expect(sends[0].called).toBe(false)
  })

  describe("with an endpoint that refuses log queries at any range", () => {
    // The error dRPC's free plan returns for a 157-block log query on BSC.
    const drpcFreePlan = () =>
      Object.assign(new Error("processing response error"), {
        body: '{"jsonrpc":"2.0","id":42,"error":{"code":35,"message":"ranges over 10000 blocks are not supported on free plan"}}',
        error: {
          code: 35,
          message: "ranges over 10000 blocks are not supported on free plan",
        },
      })
    const params = [
      { fromBlock: "0x7dbe09a", toBlock: "0x7dbe136", topics: [null] },
    ]
    const getLogs = (send: ReturnType<typeof setup>["send"]) =>
      send(standardFailurePolicy, "eth_getLogs", params)
    const failureOf = (promise: Promise<unknown>) =>
      promise.then(
        () => undefined,
        (error: unknown) => error,
      )

    it("moves on to the next endpoint without cooling it down", async () => {
      const { send, sends, endpoints } = setup(2, 1)
      sends[0].rejects(drpcFreePlan())

      expect(await getLogs(send)).toMatchObject({ result: "endpoint 1" })
      expect(endpoints[0].isAvailable).toBe(true)
    })

    it("doesn't ask it for log queries again while another can answer", async () => {
      const { send, sends } = setup(2)
      sends[0].rejects(drpcFreePlan())
      await getLogs(send)
      // The other endpoint now has an outage, which would normally send the
      // request on to the one that refused.
      sends[1].rejects(new Error("NETWORK_ERROR"))

      expect(await failureOf(getLogs(send))).toMatchObject({
        message: "NETWORK_ERROR",
      })
      expect(calls(sends[0], "eth_getLogs")).toBe(1)
    })

    it("still asks it for other methods", async () => {
      const { send, sends } = setup(2)
      sends[0].withArgs("eth_getLogs").rejects(drpcFreePlan())
      await getLogs(send)
      sends[1].rejects(new Error("NETWORK_ERROR"))

      expect(await send()).toMatchObject({ result: "endpoint 0" })
    })

    it("asks every endpoint again when they all refused", async () => {
      const { send, sends } = setup(2)
      sends.forEach((stub) => stub.rejects(drpcFreePlan()))
      await failureOf(getLogs(send))

      expect(await failureOf(getLogs(send))).toMatchObject({
        message: "processing response error",
      })
      expect(sends.map((stub) => calls(stub, "eth_getLogs"))).toEqual([2, 2])
    })
  })

  describe("with an endpoint without eth_getLogs", () => {
    // The error Rootstock's public node returns for any log query, shaped
    // like the SERVER_ERROR Ethers raises for a JSON-RPC error.
    const rootstockError = () =>
      Object.assign(new Error("processing response error"), {
        code: "SERVER_ERROR",
        body: '{"jsonrpc":"2.0","id":42,"error":{"code":-32601,"message":"the method eth_getLogs does not exist/is not available"}}',
        error: Object.assign(
          new Error("the method eth_getLogs does not exist/is not available"),
          { code: -32601 },
        ),
      })
    const params = [
      { fromBlock: "0x8f2b1d", toBlock: "0x8f3ea5", topics: [null] },
    ]
    const getLogs = (send: ReturnType<typeof setup>["send"]) =>
      send(standardFailurePolicy, "eth_getLogs", params)

    it("moves on to the next endpoint without cooling it down", async () => {
      const { send, sends, endpoints } = setup(2, 1)
      sends[0].rejects(rootstockError())

      expect(await getLogs(send)).toMatchObject({ result: "endpoint 1" })
      expect(endpoints[0].isAvailable).toBe(true)
    })

    it("doesn't ask it for log queries again while another can answer", async () => {
      const { send, sends } = setup(2)
      sends[0].rejects(rootstockError())
      await getLogs(send)
      // The other endpoint now has an outage, which would normally send the
      // request on to the one without eth_getLogs.
      sends[1].rejects(new Error("NETWORK_ERROR"))

      expect(
        await getLogs(send).then(
          () => undefined,
          (error: unknown) => error,
        ),
      ).toMatchObject({ message: "NETWORK_ERROR" })
      expect(calls(sends[0], "eth_getLogs")).toBe(1)
    })

    it("asks it again a day after it refused", async () => {
      const { send, sends, clock } = setup(2)
      sends[0].rejects(rootstockError())
      await getLogs(send)

      // Within the day, log queries go straight to the other endpoint.
      clock.increment(REFUSAL_RETRY_MS - 1)
      await getLogs(send)
      expect(calls(sends[0], "eth_getLogs")).toBe(1)

      // Once it has passed, the endpoint is eligible again, in case it now
      // serves log queries, and answers when the other one has an outage.
      sends[0].resolves("endpoint 0")
      sends[1].rejects(new Error("NETWORK_ERROR"))
      clock.increment(1)
      expect(await getLogs(send)).toMatchObject({ result: "endpoint 0" })
      expect(calls(sends[0], "eth_getLogs")).toBe(2)
    })
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

  describe("errors it rethrows", () => {
    it("carry the chain, the method and the last endpoint tried", async () => {
      const { sendRoute, sends, endpoints } = setup(2)
      const error = Object.assign(new Error("missing response"), {
        code: "SERVER_ERROR",
      })
      sends.forEach((stub) => stub.rejects(error))

      await expect(sendRoute("eth_getLogs")).rejects.toBe(error)
      expect(error.message).toBe("missing response")
      expect(error.code).toBe("SERVER_ERROR")
      expect(rpcContextOf(error)).toEqual({
        chainID: "1",
        method: "eth_getLogs",
        endpoint: endpoints[1].label,
      })
      expect(JSON.stringify(error)).toContain(
        "chain 1 standard[1] rpc1.example",
      )
    })

    it("carry the chain and method when no endpoint could be tried", async () => {
      const { sendRoute, endpoints } = setup(2, 1)
      endpoints.forEach((endpoint) => endpoint.recordFailure())

      const error = await sendRoute().catch((thrown: unknown) => thrown)

      expect(error).toBeInstanceOf(NoEndpointAvailableError)
      expect(rpcContextOf(error)).toEqual({
        chainID: "1",
        method: "eth_call",
        endpoint: undefined,
      })
    })

    it.each([
      ["an outage", () => new Error("NETWORK_ERROR")],
      ["a rate limit", () => new Error("Too Many Requests")],
      ["a revert", () => new Error("execution reverted")],
      ["an eth_call gas error", () => new Error("out of gas")],
      [
        "a key error",
        () => Object.assign(new Error("bad response"), { status: 403 }),
      ],
      [
        "a client error",
        () => Object.assign(new Error("bad response"), { status: 400 }),
      ],
      [
        "a JSON-RPC error",
        () =>
          Object.assign(new Error("method not found"), {
            code: -32601,
          }),
      ],
    ])("classify the same with their context on, for %s", async (_, make) => {
      const { sendRoute, sends } = setup(1)
      const error = make()
      const before = {
        type: getErrorType(String(error), "eth_call"),
        outage: indicatesOutage(error, "eth_call"),
        fault: indicatesEndpointFault(error, "eth_call"),
        step: standardFailurePolicy.nextStepAfter(error, "eth_call", 4).kind,
      }
      sends[0].rejects(error)

      await expect(sendRoute()).rejects.toBe(error)

      expect(rpcContextOf(error)).toBeDefined()
      expect({
        type: getErrorType(String(error), "eth_call"),
        outage: indicatesOutage(error, "eth_call"),
        fault: indicatesEndpointFault(error, "eth_call"),
        step: standardFailurePolicy.nextStepAfter(error, "eth_call", 4).kind,
      }).toEqual(before)
    })

    it("leave an abort reason, such as the destroyed error, as it is", async () => {
      const { sendRoute, sends, controller } = setup(2)
      const reason = new Error("destroyed")
      sends[0].callsFake(async () => {
        controller.abort(reason)
        throw new Error("NETWORK_ERROR")
      })

      await expect(sendRoute()).rejects.toBe(reason)
      expect(rpcContextOf(reason)).toBeUndefined()
    })

    it("keep the first context on an error two requests share", async () => {
      const { sendRoute, sends } = setup(1)
      const shared = new Error("NETWORK_ERROR")
      sends[0].rejects(shared)

      await Promise.allSettled([
        sendRoute("eth_call"),
        sendRoute("eth_getLogs"),
      ])

      expect(rpcContextOf(shared)?.method).toBe("eth_call")
    })
  })
})
