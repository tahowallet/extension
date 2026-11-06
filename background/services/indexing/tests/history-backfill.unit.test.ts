import { describe, expect, it } from "bun:test"
import { utils } from "ethers"

import { DAY, HOUR, MINUTE } from "../../../constants"
import { MULTICALL_ABI } from "../../../lib/multicall"
import { RateBudget } from "../history/budget"
import {
  BACKFILL_HORIZON,
  BACKFILL_SETTLE,
  missingBuckets,
} from "../history/schedule"
import {
  BlockClock,
  HistoryReader,
  UnavailableError,
  multicallSizeFor,
  snapshotBalances,
} from "../history/sources"

const NOW = Date.UTC(2026, 10, 3, 12)
const WEEK = 7 * DAY

describe("missingBuckets", () => {
  it("starts at the newest hour and works back", () => {
    const [first, second] = missingBuckets([], NOW)
    expect(first).toEqual({ start: NOW - BACKFILL_SETTLE, size: HOUR })
    expect(second.start).toBe(first.start - HOUR)
  })

  it("follows the tiers out to the horizon: hourly, daily, then weekly", () => {
    const buckets = missingBuckets([], NOW)
    const sizes = new Set(buckets.map(({ size }) => size))
    expect([...sizes]).toEqual([HOUR, DAY, WEEK])
    // A week of hourly buckets, then daily buckets out to three months, then
    // weekly buckets out to two years.
    expect(buckets.length).toBeGreaterThan(330)
    expect(buckets.length).toBeLessThan(360)
    const oldest = buckets[buckets.length - 1]
    expect(oldest.start).toBeGreaterThanOrEqual(NOW - BACKFILL_HORIZON)
  })

  it("skips buckets that have a point anywhere in them", () => {
    const hour = NOW - BACKFILL_SETTLE
    const [first] = missingBuckets([hour + 59 * MINUTE], NOW)
    expect(first.start).toBe(hour - HOUR)
  })

  it("puts a recent gap ahead of older history", () => {
    // Hourly points for the last three days, except for one hour yesterday.
    const gap = Math.floor((NOW - DAY) / HOUR) * HOUR
    const times = []
    for (let time = NOW - 3 * DAY; time < NOW; time += HOUR) {
      if (time !== gap) times.push(time)
    }
    const [first] = missingBuckets(times, NOW)
    expect(first.start).toBe(gap)
  })

  it("stops at a floor", () => {
    const floor = NOW - 30 * DAY
    const buckets = missingBuckets([], NOW, { floor })
    expect(buckets.every(({ start }) => start >= floor)).toBe(true)
    expect(missingBuckets([], NOW, { limit: 3 })).toHaveLength(3)
  })
})

describe("RateBudget", () => {
  it("trickles while active and speeds up while idle", () => {
    const budget = new RateBudget({ active: 1, idle: 4 }, 2)
    expect(budget.take(2, NOW, false)).toBe(true)
    expect(budget.take(2, NOW + MINUTE, false)).toBe(false)
    expect(budget.take(2, NOW + 2 * MINUTE, false)).toBe(true)

    expect(budget.take(2, NOW + 2.5 * MINUTE, true)).toBe(true)
  })

  it("doesn't save up more than its burst", () => {
    const budget = new RateBudget({ active: 1, idle: 4 }, 2)
    budget.take(0, NOW, true)
    expect(budget.take(2, NOW + DAY, true)).toBe(true)
    expect(budget.take(1, NOW + DAY, true)).toBe(false)
  })
})

/**
 * Creates a stub chain that mines a block every 12 seconds, with block
 * 1,000,000 as its latest block at `NOW`.
 */
function stubChain(onCall: (data: string, blockTag: number) => string) {
  const latest = 1_000_000
  const timestampOf = (number: number) =>
    Math.floor(NOW / 1000) - (latest - number) * 12
  const calls = { getBlock: 0, call: 0 }
  const provider: HistoryReader = {
    getBlock: async (tag) => {
      calls.getBlock += 1
      const number = tag === "latest" ? latest : tag
      return { number, timestamp: timestampOf(number) }
    },
    call: async ({ data }, blockTag) => {
      calls.call += 1
      return onCall(data, blockTag)
    },
  }
  return { provider, calls, latest }
}

describe("BlockClock", () => {
  it("finds a block by time, measuring the chain's pace only once", async () => {
    const { provider, calls, latest } = stubChain(() => "0x")
    const clock = new BlockClock(provider)

    expect(await clock.blockAt(NOW - HOUR, NOW)).toBe(latest - 300)
    expect(calls.getBlock).toBe(3)
    expect(await clock.blockAt(NOW - DAY, NOW)).toBe(latest - 7200)
    expect(calls.getBlock).toBe(4)
  })
})

const MULTICALL = new utils.Interface(MULTICALL_ABI)
const ADDRESS = "0x1111111111111111111111111111111111111111"
const tokenAt = (index: number) =>
  `0x${(index + 1).toString(16).padStart(40, "0")}`

/** Answers an `aggregate3` call with each read's one-based index as balance. */
function aggregateAnswer(data: string): string {
  const [calls] = MULTICALL.decodeFunctionData(
    "aggregate3",
    data,
  ) as unknown as [unknown[]]
  return MULTICALL.encodeFunctionResult("aggregate3", [
    calls.map((_, index) => ({
      success: true,
      returnData: utils.hexZeroPad(utils.hexlify(index + 1), 32),
    })),
  ])
}

const readCount = (data: string) =>
  (MULTICALL.decodeFunctionData("aggregate3", data)[0] as unknown[]).length

describe("snapshotBalances", () => {
  const reads = Array.from({ length: 40 }, (_, index) => ({
    address: ADDRESS,
    contractAddress: index === 0 ? undefined : tokenAt(index),
  }))

  it("reads everything at a block in one call", async () => {
    const { provider, calls } = stubChain(aggregateAnswer)
    const amounts = await snapshotBalances(
      provider,
      "1",
      reads,
      123,
      multicallSizeFor("1"),
    )
    expect(calls.call).toBe(1)
    expect(amounts[0]).toBe(1n)
    expect(amounts[39]).toBe(40n)
  })

  it("cuts calls down when they run out of gas, and remembers", async () => {
    const sizes: number[] = []
    const { provider } = stubChain((data) => {
      const count = readCount(data)
      sizes.push(count)
      if (count > 10) throw new Error("out of gas")
      return aggregateAnswer(data)
    })
    const size = multicallSizeFor("1")

    const amounts = await snapshotBalances(provider, "1", reads, 123, size)
    expect(amounts).toHaveLength(40)
    expect(amounts.every((amount) => amount !== undefined)).toBe(true)
    // The full batch of 40 fails, then each half of 20 fails, then each
    // quarter of 10 succeeds.
    expect(sizes.slice(0, 3)).toEqual([40, 20, 10])

    // Only timeouts are remembered; a plain failure only halves the call
    // that failed. After timing out at larger sizes, the next snapshot
    // starts at 10 reads or fewer.
    sizes.length = 0
    const timing = stubChain((data) => {
      const count = readCount(data)
      sizes.push(count)
      if (count > 10)
        throw Object.assign(new Error("timeout"), { code: "TIMEOUT" })
      return aggregateAnswer(data)
    })
    await snapshotBalances(timing.provider, "1", reads, 123, size)
    sizes.length = 0
    await snapshotBalances(timing.provider, "1", reads, 123, size)
    expect(Math.max(...sizes)).toBeLessThanOrEqual(10)
  })

  it("doesn't split rate limits", async () => {
    const { provider, calls } = stubChain(() => {
      throw Object.assign(new Error("Too Many Requests"), { status: 429 })
    })
    await expect(
      snapshotBalances(provider, "1", reads, 123, multicallSizeFor("1")),
    ).rejects.toThrow("Too Many Requests")
    expect(calls.call).toBe(1)
  })

  it("reports blocks with no multicall or no state as unavailable", async () => {
    const empty = stubChain(() => "0x")
    await expect(
      snapshotBalances(empty.provider, "1", reads, 1, multicallSizeFor("1")),
    ).rejects.toBeInstanceOf(UnavailableError)

    const pruned = stubChain(() => {
      throw new Error("missing trie node abc")
    })
    await expect(
      snapshotBalances(pruned.provider, "1", reads, 1, multicallSizeFor("1")),
    ).rejects.toBeInstanceOf(UnavailableError)
  })

  it("reads a token with no code yet as nothing", async () => {
    const { provider } = stubChain(() =>
      MULTICALL.encodeFunctionResult("aggregate3", [
        [
          { success: true, returnData: utils.hexZeroPad("0x05", 32) },
          { success: true, returnData: "0x" },
          { success: false, returnData: "0x" },
        ],
      ]),
    )
    expect(
      await snapshotBalances(
        provider,
        "1",
        reads.slice(0, 3),
        1,
        multicallSizeFor("1"),
      ),
    ).toEqual([5n, undefined, undefined])
  })
})
