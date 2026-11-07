import { describe, expect, it } from "bun:test"

import { AdaptiveSize, isNotAboutSize } from "../adaptive-size"
import { NoEndpointAvailableError } from "../../services/chain/rpc/endpoint"

const sized = () => new AdaptiveSize("test", "calls", 10)

describe("AdaptiveSize", () => {
  it("takes anything until it learns a maximum", () => {
    const size = sized()
    expect(size.fits(1_000_000)).toBe(true)
    size.learn(500)
    expect(size.fits(500)).toBe(true)
    expect(size.fits(501)).toBe(false)
  })

  it("keeps only the smallest maximum it hears", () => {
    const size = sized()
    size.learn(500)
    size.learn(800)
    expect(size.max).toBe(500)
  })

  it("retries at an advertised size and keeps it", () => {
    const size = sized()
    expect(
      size.retrySizeAfter(new Error("nope"), 1000, { advertised: 300 }),
    ).toBe(300)
    expect(size.max).toBe(300)
  })

  it("retries at a suggested size without keeping it", () => {
    const size = sized()
    expect(
      size.retrySizeAfter(new Error("nope"), 1000, { suggested: 300 }),
    ).toBe(300)
    expect(size.max).toBeUndefined()
  })

  it("halves on other failures, keeping the half only for timeouts", () => {
    const size = sized()
    expect(size.retrySizeAfter(new Error("bad response"), 100)).toBe(50)
    expect(size.max).toBeUndefined()

    expect(size.retrySizeAfter({ code: "TIMEOUT" }, 100)).toBe(50)
    expect(size.max).toBe(50)
  })

  it("stops halving below twice the minimum", () => {
    expect(
      sized().retrySizeAfter(new Error("bad response"), 19),
    ).toBeUndefined()
    expect(sized().retrySizeAfter(new Error("bad response"), 20)).toBe(10)
  })

  it("doesn't split rate limits or missing endpoints", () => {
    const size = sized()
    expect(size.retrySizeAfter({ status: 429 }, 1000)).toBeUndefined()
    expect(
      size.retrySizeAfter(new Error("Too Many Requests"), 1000),
    ).toBeUndefined()
    expect(size.max).toBeUndefined()
  })
})

describe("isNotAboutSize", () => {
  it("recognises rate limits and empty pools", () => {
    expect(isNotAboutSize({ code: 429 })).toBe(true)
    expect(isNotAboutSize(new Error("call rate limit exhausted"))).toBe(true)
    expect(
      isNotAboutSize(
        Object.create(NoEndpointAvailableError.prototype) as unknown,
      ),
    ).toBe(true)
    expect(isNotAboutSize(new Error("out of gas"))).toBe(false)
  })
})
