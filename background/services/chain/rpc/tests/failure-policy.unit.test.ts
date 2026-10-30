import { describe, expect, it } from "bun:test"
import {
  anyErrorFailsOverPolicy,
  httpStatusOf,
  indicatesEndpointFault,
  indicatesOutage,
  NextStep,
  standardFailurePolicy,
} from "../failure-policy"

const withStatus = (message: string, status: number) =>
  Object.assign(new Error(message), { status })

const kindOf = (step: NextStep) => step.kind

describe("standardFailurePolicy", () => {
  it.each<[string, unknown, NextStep["kind"]]>([
    // Outages move on.
    ["NETWORK_ERROR", new Error("NETWORK_ERROR"), "tryNextEndpoint"],
    ["TIMEOUT", new Error("timeout: TIMEOUT"), "tryNextEndpoint"],
    [
      "a closing socket",
      new Error("WebSocket is already in CLOSING"),
      "tryNextEndpoint",
    ],
    ["a rate limit", new Error("Too Many Requests"), "tryNextEndpoint"],
    [
      "an exhausted quota",
      new Error("exceeded the quota usage"),
      "tryNextEndpoint",
    ],
    ["a missing response", new Error("missing response"), "tryNextEndpoint"],
    ["a failed response", new Error("failed response"), "tryNextEndpoint"],
    [
      "an Ankr refusal",
      new Error("we can't execute this request"),
      "tryNextEndpoint",
    ],
    // A network error wins over a 4xx status.
    [
      "a 400 network error",
      withStatus("NETWORK_ERROR", 400),
      "tryNextEndpoint",
    ],
    // Auth-shaped client errors move on; other client errors give up.
    ["a 401", withStatus("bad response", 401), "tryNextEndpoint"],
    ["a 403", withStatus("bad response", 403), "tryNextEndpoint"],
    ["a 400", withStatus("bad response", 400), "giveUp"],
    ["a 402", withStatus("bad response", 402), "giveUp"],
    ["a 404", withStatus("bad response", 404), "giveUp"],
    ["a 422", withStatus("bad response", 422), "giveUp"],
    ["a 429 bad response", withStatus("bad response", 429), "giveUp"],
    ["a 499", withStatus("bad response", 499), "giveUp"],
    [
      "a 400 in statusCode",
      Object.assign(new Error("bad response"), { statusCode: 400 }),
      "giveUp",
    ],
    [
      "a 403 in response",
      Object.assign(new Error("bad response"), { response: { status: 403 } }),
      "tryNextEndpoint",
    ],
    // Server-side invalid responses are retried in place.
    ["a 500", withStatus("bad response", 500), "retrySameEndpoint"],
    ["a 503", withStatus("bad response", 503), "retrySameEndpoint"],
    ["a 399", withStatus("bad response", 399), "retrySameEndpoint"],
    [
      "an unstatused bad response",
      new Error("bad response"),
      "retrySameEndpoint",
    ],
    [
      "a bad backend result",
      new Error("bad result from backend"),
      "retrySameEndpoint",
    ],
    // Anything else gives up.
    ["a revert", new Error("execution reverted"), "giveUp"],
    ["a batch limit", new Error("batch too large"), "giveUp"],
    ["a string", "something odd", "giveUp"],
    ["undefined", undefined, "giveUp"],
  ])("after %s on a first attempt, says %s", (_, error, expected) => {
    expect(
      kindOf(standardFailurePolicy.nextStepAfter(error, "eth_call", 1)),
    ).toBe(expected)
  })

  it("gives up on an out-of-gas eth_call but treats it as unknown elsewhere", () => {
    const error = new Error("out of gas")
    expect(standardFailurePolicy.nextStepAfter(error, "eth_call", 1).kind).toBe(
      "giveUp",
    )
    expect(
      standardFailurePolicy.nextStepAfter(error, "eth_estimateGas", 1).kind,
    ).toBe("giveUp")
  })

  it.each<[number, NextStep["kind"]]>([
    [1, "retrySameEndpoint"],
    [2, "retrySameEndpoint"],
    [3, "retrySameEndpoint"],
    [4, "tryNextEndpoint"],
    [5, "tryNextEndpoint"],
  ])("on attempt %i of an invalid response, says %s", (attempt, expected) => {
    expect(
      standardFailurePolicy.nextStepAfter(
        new Error("bad response"),
        "eth_call",
        attempt,
      ).kind,
    ).toBe(expected)
  })

  it("backs off between 400 and 800 ms before a retry", () => {
    for (let i = 0; i < 50; i += 1) {
      const step = standardFailurePolicy.nextStepAfter(
        new Error("bad response"),
        "eth_call",
        1,
      )
      if (step.kind !== "retrySameEndpoint") {
        throw new Error("expected a retry")
      }
      expect(step.delayMs).toBeGreaterThanOrEqual(400)
      expect(step.delayMs).toBeLessThan(800)
    }
  })

  it("does not change its answer for outages as attempts climb", () => {
    expect(
      standardFailurePolicy.nextStepAfter(
        new Error("NETWORK_ERROR"),
        "eth_call",
        9,
      ).kind,
    ).toBe("tryNextEndpoint")
  })
})

describe("anyErrorFailsOverPolicy", () => {
  it.each([
    new Error("NETWORK_ERROR"),
    new Error("some strange failure"),
    withStatus("bad response", 400),
    undefined,
  ])("moves on after %p", (error) => {
    expect(
      anyErrorFailsOverPolicy.nextStepAfter(error, "eth_call", 1).kind,
    ).toBe("tryNextEndpoint")
  })
})

describe("indicatesOutage", () => {
  it.each([
    [new Error("NETWORK_ERROR"), true],
    [new Error("Too Many Requests"), true],
    [new Error("missing response"), true],
    [new Error("bad response"), false],
    [withStatus("bad response", 403), false],
    [new Error("execution reverted"), false],
  ])("says %p is an outage: %p", (error, expected) => {
    expect(indicatesOutage(error, "eth_call")).toBe(expected)
  })
})

describe("indicatesEndpointFault", () => {
  it.each<[string, unknown, boolean]>([
    ["an outage", new Error("NETWORK_ERROR"), true],
    ["a rate limit", new Error("Too Many Requests"), true],
    ["an invalid response", new Error("bad response"), true],
    ["a 5xx invalid response", withStatus("bad response", 502), true],
    ["a 401", withStatus("bad response", 401), true],
    ["a 403", withStatus("bad response", 403), true],
    ["a 400", withStatus("bad response", 400), false],
    ["a 404", withStatus("bad response", 404), false],
    ["a revert", new Error("execution reverted"), false],
    ["a nonce error", new Error("nonce too low"), false],
    ["insufficient funds", new Error("insufficient funds for gas"), false],
  ])("says %s is the endpoint's fault: %p", (_, error, expected) => {
    expect(indicatesEndpointFault(error, "eth_call")).toBe(expected)
  })
})

describe("httpStatusOf", () => {
  it.each([
    [{ status: 418 }, 418],
    [{ statusCode: 502 }, 502],
    [{ response: { status: 401 } }, 401],
    [{ status: "500" }, undefined],
    [new Error("no status"), undefined],
    [null, undefined],
  ])("reads %p as %p", (error, expected) => {
    expect(httpStatusOf(error)).toBe(expected)
  })
})
