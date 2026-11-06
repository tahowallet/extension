import {
  formatBTC,
  formatFixedPoint,
  parseSats,
  shortenSparkAddress,
} from "../format"

describe("Spark formatting", () => {
  it("formats satoshis as BTC without float error", () => {
    expect(formatBTC(0n)).toBe("0")
    expect(formatBTC(1n)).toBe("0.00000001")
    expect(formatBTC(12_582_912n)).toBe("0.12582912")
    expect(formatBTC(2_100_000_000_000_000n)).toBe("21,000,000")
  })

  it("formats token amounts", () => {
    expect(formatFixedPoint(1_500_000n, 6)).toBe("1.5")
    expect(formatFixedPoint(-25n, 1)).toBe("-2.5")
  })

  it("parses whole positive sats only", () => {
    expect(parseSats("1,000")).toBe(1000)
    expect(parseSats(" 42 ")).toBe(42)
    expect(parseSats("0")).toBeUndefined()
    expect(parseSats("1.5")).toBeUndefined()
    expect(parseSats("-3")).toBeUndefined()
    expect(parseSats("9007199254740993")).toBeUndefined()
  })

  it("shortens addresses around the bech32 separator", () => {
    expect(
      shortenSparkAddress(
        "sparkrt1pgssy6vty7krpze82ecm8j39gd35v35aqjjmhftc4culawsavkyh564u2uv8v0",
      ),
    ).toBe("sparkrt1pgss…2uv8v0")
  })
})
