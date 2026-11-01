import { ethers } from "ethers"
import { ETHEREUM, MEZO, OPTIMISM, SEPOLIA, USD } from "../../constants"
import {
  ContractReader,
  getUSDPriceForBaseAsset,
  hasContractCode,
} from "../priceOracle"

const AGGREGATOR = new ethers.utils.Interface([
  "function decimals() view returns (uint8)",
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
])

const nowSeconds = () => Math.floor(Date.now() / 1000)

/** A provider whose every contract is a Chainlink feed with this answer. */
const feedProvider = ({
  answer,
  updatedAt = nowSeconds(),
  code = "0x6080",
}: {
  answer: bigint
  updatedAt?: number
  code?: string
}) => {
  const provider = {
    getCode: jest.fn(async () => code),
    call: jest.fn(async ({ data }: { data?: string }) =>
      data === AGGREGATOR.encodeFunctionData("decimals")
        ? AGGREGATOR.encodeFunctionResult("decimals", [8])
        : AGGREGATOR.encodeFunctionResult("latestRoundData", [
            1,
            answer,
            updatedAt,
            updatedAt,
            1,
          ]),
    ),
  }
  return provider as typeof provider & ContractReader
}

describe("getUSDPriceForBaseAsset", () => {
  it("reads the base asset's USD price from its chain's feed", async () => {
    const provider = feedProvider({ answer: 2266_12345678n })
    const providerFor = jest.fn(() => provider)

    const pricePoint = await getUSDPriceForBaseAsset(OPTIMISM, providerFor)

    expect(providerFor).toHaveBeenCalledWith(OPTIMISM)
    expect(pricePoint?.pair).toEqual([USD, OPTIMISM.baseAsset])
    expect(pricePoint?.amounts).toEqual([2266_1234567800n, 10n ** 18n])
  })

  it("reads BTC-based chains from Ethereum's BTC feed", async () => {
    const provider = feedProvider({ answer: 77_807_00000000n })
    const providerFor = jest.fn(() => provider)

    const pricePoint = await getUSDPriceForBaseAsset(MEZO, providerFor)

    expect(providerFor).toHaveBeenCalledWith(ETHEREUM)
    expect(pricePoint?.amounts[0]).toEqual(77_807_0000000000n)
  })

  it("skips chains without a feed", async () => {
    const provider = feedProvider({ answer: 1n })

    expect(
      await getUSDPriceForBaseAsset(SEPOLIA, () => provider),
    ).toBeUndefined()
    expect(provider.call).not.toHaveBeenCalled()
  })

  it("skips a feed with no code instead of calling it", async () => {
    const provider = feedProvider({ answer: 1n, code: "0x" })

    expect(
      await getUSDPriceForBaseAsset(ETHEREUM, () => provider),
    ).toBeUndefined()
    expect(provider.call).not.toHaveBeenCalled()
  })

  it("ignores a stale answer", async () => {
    const provider = feedProvider({
      answer: 2266_00000000n,
      updatedAt: nowSeconds() - 3 * 24 * 60 * 60,
    })

    expect(
      await getUSDPriceForBaseAsset(ETHEREUM, () => provider),
    ).toBeUndefined()
  })
})

describe("hasContractCode", () => {
  const address = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"

  it("remembers an address's code per provider", async () => {
    const provider = feedProvider({ answer: 1n })

    expect(await hasContractCode(provider, address)).toBe(true)
    expect(await hasContractCode(provider, address.toLowerCase())).toBe(true)
    expect(provider.getCode).toHaveBeenCalledTimes(1)
  })

  it("asks again after a failed lookup", async () => {
    const provider = feedProvider({ answer: 1n })
    provider.getCode.mockRejectedValueOnce(new Error("timeout"))

    await expect(hasContractCode(provider, address)).rejects.toThrow("timeout")
    expect(await hasContractCode(provider, address)).toBe(true)
    expect(provider.getCode).toHaveBeenCalledTimes(2)
  })
})
