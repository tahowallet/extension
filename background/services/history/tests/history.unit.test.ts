import { DAY, HOUR, MINUTE } from "../../../constants"
import { bucketSizeForAge, compactableIndexes } from "../compaction"
import { priceAt, seriesOf, valueAt, valueSeries } from "../series"

const NOW = Date.UTC(2026, 10, 3, 12)

describe("bucketSizeForAge", () => {
  it("follows the #214 tiers", () => {
    expect(bucketSizeForAge(5 * MINUTE)).toBe(5 * MINUTE)
    expect(bucketSizeForAge(2 * DAY)).toBe(HOUR)
    expect(bucketSizeForAge(30 * DAY)).toBe(DAY)
    expect(bucketSizeForAge(200 * DAY)).toBe(7 * DAY)
  })
})

describe("compactableIndexes", () => {
  it("keeps one point every five minutes from the last day", () => {
    const times = [NOW - MINUTE, NOW - 2 * MINUTE, NOW - 6 * MINUTE]
    expect(compactableIndexes(times, NOW)).toEqual([1])
  })

  it("keeps only the latest point per bucket once older", () => {
    // Three points in one hour two days ago, and one in the next hour.
    const hourStart = Math.floor((NOW - 2 * DAY) / HOUR) * HOUR
    const times = [
      hourStart + 5 * MINUTE,
      hourStart + 50 * MINUTE,
      hourStart + 20 * MINUTE,
      hourStart + HOUR + MINUTE,
    ]
    expect(compactableIndexes(times, NOW).sort()).toEqual([0, 2])
  })

  it("buckets by day and then by week further back", () => {
    const dayStart = Math.floor((NOW - 30 * DAY) / DAY) * DAY
    const weekStart = Math.floor((NOW - 200 * DAY) / (7 * DAY)) * 7 * DAY
    const times = [
      dayStart + HOUR,
      dayStart + 20 * HOUR,
      weekStart + DAY,
      weekStart + 3 * DAY,
    ]
    expect(compactableIndexes(times, NOW).sort()).toEqual([0, 2])
  })
})

describe("valueAt and priceAt", () => {
  const series = seriesOf([
    { time: 10, value: 1 },
    { time: 20, value: 2 },
    { time: 30, value: 3 },
  ])

  it("treats a series as a step function", () => {
    expect(valueAt(series, 5)).toBeUndefined()
    expect(valueAt(series, 10)).toBe(1)
    expect(valueAt(series, 25)).toBe(2)
    expect(valueAt(series, 99)).toBe(3)
  })

  it("lets prices reach forward within a tolerance", () => {
    expect(priceAt(series, 5, 5)).toBe(1)
    expect(priceAt(series, 5, 4)).toBeUndefined()
  })

  it("reads typed arrays the same way", () => {
    const typed = {
      times: Float64Array.from([10, 20, 30]),
      values: Float64Array.from([1, 2, 3]),
    }
    expect(valueAt(typed, 25)).toBe(2)
  })
})

describe("valueSeries", () => {
  it("sums each holding's balance times its price at each sample", () => {
    const { points, coverageStart } = valueSeries({
      holdings: [
        {
          priceKey: "eth",
          balances: seriesOf([
            { time: 0, value: 1 },
            { time: 50, value: 2 },
          ]),
        },
        { priceKey: "usdc", balances: seriesOf([{ time: 25, value: 100 }]) },
        // This holding has no price, so it adds nothing, just as unpriced
        // assets add nothing to current totals.
        { priceKey: "spam", balances: seriesOf([{ time: 0, value: 1e9 }]) },
      ],
      prices: new Map([
        [
          "eth",
          seriesOf([
            { time: 0, value: 1000 },
            { time: 75, value: 2000 },
          ]),
        ],
        ["usdc", seriesOf([{ time: 0, value: 1 }])],
      ]),
      from: 0,
      to: 100,
      samples: 5,
      priceTolerance: 0,
    })

    expect(points).toEqual([
      { time: 0, value: 1000 },
      { time: 25, value: 1100 },
      { time: 50, value: 2100 },
      { time: 75, value: 4100 },
      { time: 100, value: 4100 },
    ])
    expect(coverageStart).toBe(0)
  })

  it("leaves out samples before any valued balance", () => {
    const { points, coverageStart } = valueSeries({
      holdings: [
        { priceKey: "eth", balances: seriesOf([{ time: 60, value: 1 }]) },
      ],
      prices: new Map([["eth", seriesOf([{ time: 0, value: 10 }])]]),
      from: 0,
      to: 100,
      samples: 3,
      priceTolerance: 0,
    })
    expect(points).toEqual([{ time: 100, value: 10 }])
    expect(coverageStart).toBe(100)
  })
})
