import { ethers } from "ethers"
import {
  ETHEREUM,
  MEZO,
  OPTIMISM,
  ROOTSTOCK,
  SEPOLIA,
  USD,
} from "../../constants"
import logger from "../logger"
import {
  ContractReader,
  getUSDPriceForBaseAsset,
  getUSDPriceForTokens,
  hasContractCode,
} from "../priceOracle"
import { createSmartContractAsset } from "../../tests/factories"

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

describe("getUSDPriceForTokens", () => {
  const ORACLE = new ethers.utils.Interface([
    "function getRate(address srcToken, address dstToken, bool useWrappers) view returns (uint256 weightedRate)",
  ])
  const ETHEREUM_USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"

  /** An oracle provider that rates each token by address, or fails. */
  const oracleProvider = (
    rates: { [address: string]: bigint | Error },
    code = "0x6080",
  ) => {
    const provider = {
      getCode: jest.fn(async () => code),
      call: jest.fn(async ({ data }: { data?: string }) => {
        const [, token, useWrappers] = ORACLE.decodeFunctionData(
          "getRate",
          data ?? "0x",
        )
        if (useWrappers !== false) {
          throw new Error("out of gas")
        }
        const rate = rates[String(token).toLowerCase()]
        if (rate instanceof Error) {
          throw rate
        }
        return ORACLE.encodeFunctionResult("getRate", [rate ?? 0n])
      }),
    }
    return provider as typeof provider & ContractReader
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("prices each token with its own call, minding decimals", async () => {
    const usdt = createSmartContractAsset({ decimals: 6 })
    const weth = createSmartContractAsset({ decimals: 18 })
    const provider = oracleProvider({
      // 1 raw USDT per raw USDC: one dollar.
      [usdt.contractAddress.toLowerCase()]: 10n ** 18n,
      // 1 WETH per 2,000 USDC.
      [weth.contractAddress.toLowerCase()]:
        (10n ** 18n * 10n ** 18n) / 2000n / 10n ** 6n,
    })

    const prices = await getUSDPriceForTokens([usdt, weth], ETHEREUM, provider)

    expect(provider.call).toHaveBeenCalledTimes(2)
    expect(prices[usdt.contractAddress].unitPrice.amount).toEqual(
      10n ** BigInt(USD.decimals),
    )
    expect(prices[weth.contractAddress].unitPrice.amount).toEqual(
      2000n * 10n ** BigInt(USD.decimals),
    )
  })

  it("prices USDC at a dollar without asking the oracle", async () => {
    const usdc = createSmartContractAsset({ contractAddress: ETHEREUM_USDC })
    const provider = oracleProvider({})

    const prices = await getUSDPriceForTokens([usdc], ETHEREUM, provider)

    expect(prices[usdc.contractAddress].unitPrice.amount).toEqual(
      10n ** BigInt(USD.decimals),
    )
    expect(provider.call).not.toHaveBeenCalled()
  })

  it("skips tokens it can't price and logs them once at debug", async () => {
    const priced = createSmartContractAsset()
    const failing = [createSmartContractAsset(), createSmartContractAsset()]
    const unrated = createSmartContractAsset()
    const provider = oracleProvider({
      [priced.contractAddress.toLowerCase()]: 10n ** 18n,
      ...Object.fromEntries(
        failing.map(({ contractAddress }) => [
          contractAddress.toLowerCase(),
          new Error("missing revert data"),
        ]),
      ),
    })
    const debug = jest.spyOn(logger, "debug").mockImplementation(() => {})
    const error = jest.spyOn(logger, "error").mockImplementation(() => {})

    const prices = await getUSDPriceForTokens(
      [priced, ...failing, unrated],
      ETHEREUM,
      provider,
    )

    expect(Object.keys(prices)).toEqual([priced.contractAddress])
    expect(debug).toHaveBeenCalledTimes(1)
    expect(error).not.toHaveBeenCalled()
  })

  it("skips chains without an oracle", async () => {
    const provider = oracleProvider({})

    expect(
      await getUSDPriceForTokens(
        [createSmartContractAsset()],
        ROOTSTOCK,
        provider,
      ),
    ).toEqual({})
    expect(provider.getCode).not.toHaveBeenCalled()
    expect(provider.call).not.toHaveBeenCalled()
  })

  it("skips an oracle with no code instead of calling it", async () => {
    const provider = oracleProvider({}, "0x")

    expect(
      await getUSDPriceForTokens(
        [createSmartContractAsset()],
        ETHEREUM,
        provider,
      ),
    ).toEqual({})
    expect(provider.call).not.toHaveBeenCalled()
  })
})
