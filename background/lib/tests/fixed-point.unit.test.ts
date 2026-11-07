import { fromFixedPoint } from "../fixed-point"

describe("fromFixedPoint", () => {
  it("truncates to fewer decimals", () => {
    expect(fromFixedPoint(123456789n, 8, 2)).toBe(1.23)
  })

  // Desired precision at or above the fixed point's own used to divide by an
  // extra 10: 1,000 sats came out as 0.000001 BTC instead of 0.00001.
  it("keeps the value when desired precision matches the fixed point's", () => {
    expect(fromFixedPoint(1000n, 8, 8)).toBe(0.00001)
    expect(fromFixedPoint(12_582_912n, 8, 8)).toBe(0.12582912)
  })

  it("keeps the value when desired precision exceeds the fixed point's", () => {
    expect(fromFixedPoint(1000n, 8, 18)).toBe(0.00001)
  })
})
