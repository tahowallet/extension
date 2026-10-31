import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import * as sinon from "sinon"
import TahoRPCProvider from "../taho-rpc-provider"

type Payload = { id: number; method: string }

/** Answers batches up to `limit` long; rejects longer ones as too large. */
class LimitedProvider extends TahoRPCProvider {
  batchSizes: number[] = []

  constructor(
    private readonly limit: number,
    private readonly rejection: "body" | "throw" | "items" = "body",
  ) {
    super("http://limited.example", 1, { maxBatchLength: 8 })
  }

  protected override async postBatch(body: string) {
    const parsed = JSON.parse(body) as Payload | Payload[]
    const payloads = Array.isArray(parsed) ? parsed : [parsed]
    this.batchSizes.push(payloads.length)

    if (payloads.length > this.limit && this.rejection === "items") {
      // Answers the first `limit` requests and refuses the rest.
      return payloads.map(({ id, method }, index) =>
        index < this.limit
          ? { id, jsonrpc: "2.0" as const, result: method }
          : {
              id,
              jsonrpc: "2.0" as const,
              error: { code: -32600, message: "batch size limit exceeded" },
            },
      )
    }
    if (payloads.length > this.limit) {
      if (this.rejection === "throw") {
        throw new Error("batch size limit exceeded")
      }
      return {
        id: payloads[0].id,
        jsonrpc: "2.0" as const,
        error: { code: -32600, message: "batch too large" },
      }
    }

    const responses = payloads.map(({ id, method }) => ({
      id,
      jsonrpc: "2.0" as const,
      result: method,
    }))
    return Array.isArray(parsed) ? responses : responses[0]
  }
}

describe("TahoRPCProvider", () => {
  let clock: sinon.SinonFakeTimers

  beforeEach(() => {
    clock = sinon.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  })

  afterEach(() => {
    clock.restore()
  })

  /** Runs the batching and retry timers until `promise` settles. */
  const settle = async <T>(promise: Promise<T>): Promise<T> => {
    await clock.runAllAsync()
    return promise
  }

  it.each(["body", "throw"] as const)(
    "halves a batch the endpoint finds too large and resends it (%s)",
    async (rejection) => {
      const provider = new LimitedProvider(2, rejection)

      const results = await settle(
        Promise.all(
          ["a", "b", "c", "d", "e", "f"].map((method) =>
            provider.send(method, []),
          ),
        ),
      )

      expect(results).toEqual(["a", "b", "c", "d", "e", "f"])
      expect(provider.getOptions().maxBatchLength).toBe(1)
      expect(provider.batchSizes[0]).toBe(6)
      expect(provider.batchSizes.slice(1).every((size) => size <= 3)).toBe(true)
    },
  )

  it("resends only the requests refused for the batch's size", async () => {
    const provider = new LimitedProvider(2, "items")
    const sent: string[] = []
    const post = provider["postBatch"].bind(provider)
    provider["postBatch"] = (body: string) => {
      const parsed = JSON.parse(body) as Payload | Payload[]
      ;(Array.isArray(parsed) ? parsed : [parsed]).forEach(({ method }) =>
        sent.push(method),
      )
      return post(body)
    }

    const results = await settle(
      Promise.all(
        ["a", "b", "c", "d"].map((method) => provider.send(method, [])),
      ),
    )

    expect(results).toEqual(["a", "b", "c", "d"])
    // Only the refused c and d go out twice.
    expect(sent.toSorted()).toEqual(["a", "b", "c", "c", "d", "d"])
  })

  it("rejects a single request the endpoint calls too large", async () => {
    const provider = new LimitedProvider(0)

    const sent = provider.send("a", [])
    sent.catch(() => {})
    await expect(settle(sent)).rejects.toThrow("batch too large")
    expect(provider.batchSizes).toEqual([1])
  })

  it("sends a batch the endpoint accepts once", async () => {
    const provider = new LimitedProvider(10)

    await settle(
      Promise.all(["a", "b", "c"].map((method) => provider.send(method, []))),
    )

    expect(provider.batchSizes).toEqual([3])
    expect(provider.getOptions().maxBatchLength).toBe(8)
  })
})
