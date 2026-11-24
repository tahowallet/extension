import { ethers } from "ethers"
import { ETH, ETHEREUM, USD } from "../../../constants"
import type { PricePoint } from "../../../assets"
import {
  ContractReader,
  getUSDPriceForBaseAsset,
} from "../../../lib/priceOracle"
import { livePriceMeasurement, millisecondsOf } from "../history/live"

const NOW = Date.UTC(2026, 10, 5, 12)

const AGGREGATOR = new ethers.utils.Interface([
  "function decimals() view returns (uint8)",
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
])

/** A price point for 1 ETH at `usd` dollars, timed `time`. */
const ethPrice = (usd: number, time: number): PricePoint => ({
  pair: [USD, ETH],
  amounts: [BigInt(Math.round(usd * 10 ** USD.decimals)), 10n ** 18n],
  time,
})

describe("millisecondsOf", () => {
  it("keeps times already in milliseconds", () => {
    expect(millisecondsOf(NOW)).toBe(NOW)
  })

  it("converts times in seconds", () => {
    expect(millisecondsOf(NOW / 1000)).toBe(NOW)
  })
})

describe("livePriceMeasurement", () => {
  it("dates a price point stamped with Date.now() to its own time", () => {
    const record = livePriceMeasurement(ethPrice(2948, NOW))

    expect(record).toMatchObject({
      assetID: "1/base",
      symbol: "ETH",
      time: NOW,
      value: 2948,
      origin: "live",
    })
    // Taking these milliseconds for seconds would date the price a thousand
    // times too late, past the year 58000.
    expect(new Date(NOW * 1000).getUTCFullYear()).toBeGreaterThan(58000)
  })

  it("dates a price point timed in seconds", () => {
    expect(livePriceMeasurement(ethPrice(2948, NOW / 1000))?.time).toBe(NOW)
  })

  it("dates the Chainlink feed's live price to now", async () => {
    // A mainnet ETH/USD feed answering $2,948.
    const updatedAt = Math.floor(Date.now() / 1000)
    const provider = {
      getCode: jest.fn(async () => "0x6080"),
      call: jest.fn(async ({ data }: { data?: string }) =>
        data === AGGREGATOR.encodeFunctionData("decimals")
          ? AGGREGATOR.encodeFunctionResult("decimals", [8])
          : AGGREGATOR.encodeFunctionResult("latestRoundData", [
              1,
              2948_00000000n,
              updatedAt,
              updatedAt,
              1,
            ]),
      ),
    }
    const before = Date.now()

    const pricePoint = await getUSDPriceForBaseAsset(
      ETHEREUM,
      () => provider as typeof provider & ContractReader,
    )
    const record = pricePoint && livePriceMeasurement(pricePoint)

    expect(record?.assetID).toBe("1/base")
    expect(record?.value).toBeCloseTo(2948)
    expect(record?.time).toBeGreaterThanOrEqual(before)
    expect(record?.time).toBeLessThanOrEqual(Date.now())
  })

  it("skips pairs without a fiat currency", () => {
    expect(
      livePriceMeasurement({ pair: [ETH, ETH], amounts: [1n, 1n], time: NOW }),
    ).toBeUndefined()
  })
})
