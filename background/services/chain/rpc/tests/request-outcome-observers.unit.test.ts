import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { JsonRpcProvider } from "@ethersproject/providers"
import * as sinon from "sinon"
import logger from "../../../../lib/logger"
import Endpoint, { NoEndpointAvailableError } from "../endpoint"
import EndpointPool from "../endpoint-pool"
import FailoverExecutor, { RpcRequest } from "../failover-executor"
import { standardFailurePolicy } from "../failure-policy"
import { loggingObserver } from "../request-outcome-observers"

const LABEL = "chain 8453 standard[1] base-mainnet.g.alchemy.com"

describe("loggingObserver", () => {
  let debug: sinon.SinonStub
  let warn: sinon.SinonStub

  beforeEach(() => {
    debug = sinon.stub(logger, "debug")
    warn = sinon.stub(logger, "warn")
    sinon.stub(logger, "info")
  })

  afterEach(() => sinon.restore())

  const endpoint = (send = sinon.stub(), label = LABEL) =>
    new Endpoint(
      {
        kind: "standard",
        createTransport: () =>
          Object.assign(Object.create(JsonRpcProvider.prototype), {
            send,
            removeAllListeners: sinon.stub(),
          }) as JsonRpcProvider,
      },
      { label },
    )
  const request: RpcRequest = {
    chainID: "8453",
    method: "eth_getLogs",
    params: [],
    startedAt: 0,
  }
  const lines = (stub: sinon.SinonStub) =>
    stub.args.map(([line]) => String(line))

  it.each([
    [
      { kind: "retrySameEndpoint", delayMs: 512.4 } as const,
      `${LABEL}: eth_getLogs failed with bad response; retrying in 512 ms.`,
    ],
    [
      { kind: "tryNextEndpoint" } as const,
      `${LABEL}: eth_getLogs failed with bad response; trying the next endpoint.`,
    ],
    [
      { kind: "giveUp" } as const,
      `${LABEL}: eth_getLogs failed with bad response; not retrying, since the error is about the request.`,
    ],
  ])("logs a failed attempt and its next step at debug", (step, line) => {
    const observer = loggingObserver()

    observer.onEndpointFailure?.(
      request,
      endpoint(),
      new Error("bad response"),
      step,
    )

    expect(lines(debug)).toEqual([line])
    expect(warn.called).toBe(false)
  })

  it("names the status and code an error carries", () => {
    const observer = loggingObserver()
    const error = Object.assign(new Error("bad response"), {
      reason: "bad response",
      code: "SERVER_ERROR",
      status: 403,
    })

    observer.onEndpointFailure?.(request, endpoint(), error, {
      kind: "tryNextEndpoint",
    })

    expect(lines(debug)[0]).toContain(
      "failed with bad response (code SERVER_ERROR, HTTP 403)",
    )
  })

  it("keeps URLs in an error down to their host", () => {
    const observer = loggingObserver()
    const error = new Error(
      'missing response (url="https://base-mainnet.g.alchemy.com/v2/SECRET")',
    )

    observer.onEndpointFailure?.(request, endpoint(), error, {
      kind: "tryNextEndpoint",
    })

    expect(lines(debug)[0]).not.toContain("SECRET")
    expect(lines(debug)[0]).toContain('url="base-mainnet.g.alchemy.com"')
  })

  it("warns once when a request gives up after a pool runs out of endpoints, naming the last one", () => {
    const observer = loggingObserver()
    const last = endpoint()
    const error = new Error("NETWORK_ERROR")

    observer.onAttempt?.(request, last)
    observer.onAllEndpointsFailed?.(
      request,
      error,
      new EndpointPool("standard", [last]),
    )
    expect(warn.called).toBe(false)
    observer.onRequestFailed?.(request, error)

    expect(lines(warn)).toEqual([
      `${LABEL}: giving up on eth_getLogs after every endpoint in the standard pool failed, ending with NETWORK_ERROR.`,
    ])
  })

  it("names every pool a request ran out of", () => {
    const observer = loggingObserver()
    const last = endpoint()
    const error = new Error("NETWORK_ERROR")

    observer.onAttempt?.(request, last)
    observer.onAllEndpointsFailed?.(
      request,
      error,
      new EndpointPool("capability:alchemy_", [last]),
    )
    observer.onAllEndpointsFailed?.(
      request,
      error,
      new EndpointPool("managed", [last]),
    )
    observer.onRequestFailed?.(request, error)

    expect(lines(warn)).toEqual([
      `${LABEL}: giving up on eth_getLogs after every endpoint in the capability:alchemy_ and managed pools failed, ending with NETWORK_ERROR.`,
    ])
  })

  it("names only the chain when no endpoint was tried", () => {
    const observer = loggingObserver()

    observer.onRequestFailed?.(request, new NoEndpointAvailableError())

    expect(lines(warn)).toEqual([
      "chain 8453: giving up on eth_getLogs with NETWORK_ERROR: circuit open and no fallback available.",
    ])
  })

  it("warns when a request fails for good on its endpoints, and not for the request's own errors", () => {
    const observer = loggingObserver()
    observer.onAttempt?.(request, endpoint())

    observer.onRequestFailed?.(request, new Error("TIMEOUT"))
    observer.onRequestFailed?.(request, new Error("execution reverted"))

    expect(lines(warn)).toEqual([
      `${LABEL}: giving up on eth_getLogs with TIMEOUT.`,
    ])
    expect(lines(debug)).toEqual([
      `${LABEL}: giving up on eth_getLogs with execution reverted.`,
    ])
  })

  it("doesn't repeat a give-up it already logged with the failed attempt", () => {
    const observer = loggingObserver()
    const error = new Error("execution reverted")
    const last = endpoint()

    observer.onAttempt?.(request, last)
    observer.onEndpointFailure?.(request, last, error, { kind: "giveUp" })
    observer.onRequestFailed?.(request, error)

    expect(lines(debug)).toEqual([
      `${LABEL}: eth_getLogs failed with execution reverted; not retrying, since the error is about the request.`,
    ])
  })

  it("logs one warn for a request that exhausts its pool through the executor", async () => {
    const endpoints = [
      endpoint(
        sinon.stub().rejects(new Error("NETWORK_ERROR")),
        "chain 8453 standard[0] a.example",
      ),
      endpoint(
        sinon.stub().rejects(new Error("NETWORK_ERROR")),
        "chain 8453 standard[1] b.example",
      ),
    ]
    endpoints.forEach((each) => each.build())
    const pool = new EndpointPool("standard", endpoints)
    const executor = new FailoverExecutor([loggingObserver()], async () => {})

    await expect(
      executor.send(
        request,
        [{ pool, policy: standardFailurePolicy }],
        new AbortController().signal,
      ),
    ).rejects.toThrow("NETWORK_ERROR")

    expect(lines(warn)).toEqual([
      "chain 8453 standard[1] b.example: giving up on eth_getLogs after every endpoint in the standard pool failed, ending with NETWORK_ERROR.",
    ])
  })

  it("logs one line per decision through the executor, and nothing for success", async () => {
    const failing = sinon.stub().rejects(new Error("NETWORK_ERROR"))
    const flaky = sinon.stub()
    flaky.onCall(0).rejects(new Error("bad response"))
    flaky.resolves("0x1")
    const endpoints = [
      endpoint(failing, "chain 8453 standard[0] a.example"),
      endpoint(flaky, "chain 8453 standard[1] b.example"),
    ]
    endpoints.forEach((each) => each.build())
    const pool = new EndpointPool("standard", endpoints)
    const executor = new FailoverExecutor([loggingObserver()], async () => {})

    await executor.send(
      request,
      [{ pool, policy: standardFailurePolicy }],
      new AbortController().signal,
    )

    expect(lines(debug).map((line) => line.replace(/\d+ ms/, "N ms"))).toEqual([
      "chain 8453 standard[0] a.example: eth_getLogs failed with NETWORK_ERROR; trying the next endpoint.",
      "chain 8453 standard[1] b.example: eth_getLogs failed with bad response; retrying in N ms.",
    ])
    expect(warn.called).toBe(false)
  })
})
