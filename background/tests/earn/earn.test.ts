/**
 * @jest-environment jsdom
 */
/* oxlint-disable typescript/ban-ts-comment */
import { BigNumber } from "ethers"
import * as getTokenPrice from "../../redux-slices/earn-utils/getTokenPrice"
import { getDoggoPrice, getPoolAPR } from "../../redux-slices/earn-utils"
import { prices } from "./assets.mock"
import * as contractUtils from "../../redux-slices/utils/contract-utils"

const mainCurrencySymbol = "USD"

describe("Earn", () => {
  global.fetch = () =>
    Promise.resolve({
      json: () => Promise.resolve([]),
    }) as Promise<Response>
  describe("getDoggoPrice", () => {
    beforeEach(() => jest.resetAllMocks())

    it("should return 0 if DOGGO/ETH pair is not deployed", async () => {
      // @ts-ignore
      jest.spyOn(contractUtils, "getContract").mockImplementationOnce(() => ({
        getReserves: () => ({
          reserve0: BigNumber.from(0n),
          reserve1: BigNumber.from(0n),
        }),
      }))
      const doggoPrice = await getDoggoPrice(prices, mainCurrencySymbol)

      expect(doggoPrice).toBe(0n)
    })

    it("should return DOGGO/ETH price if uniswap pair is deployed", async () => {
      // @ts-ignore
      jest.spyOn(contractUtils, "getContract").mockImplementationOnce(() => ({
        getReserves: () => ({
          reserve0: BigNumber.from(100000000000000000n),
          reserve1: BigNumber.from(100000000000000000n),
        }),
      }))
      const doggoPrice = await getDoggoPrice(prices, mainCurrencySymbol)

      expect(doggoPrice).toBeGreaterThan(0n)
    })

    it("should return 0 if price of WETH is unknown", async () => {
      // @ts-ignore
      jest.spyOn(contractUtils, "getContract").mockImplementationOnce(() => ({
        getReserves: () => ({
          reserve0: BigNumber.from(100n),
          reserve1: BigNumber.from(100000n),
        }),
      }))
      const doggoPrice = await getDoggoPrice({}, mainCurrencySymbol)

      expect(doggoPrice).toBe(0n)
    })
  })

  describe("getPoolAPR", () => {
    const asset = {
      contractAddress: "0x0",
      decimals: 18,
      name: "Uniswap",
      symbol: "UNI",
    }

    beforeEach(() => jest.resetAllMocks())

    it("should return 0 if total rewards value is '0'", async () => {
      jest
        .spyOn(contractUtils, "getCurrentTimestamp")
        .mockImplementation(() => Promise.resolve(1651050516))

      // @ts-ignore
      jest.spyOn(contractUtils, "getContract").mockImplementationOnce(() => ({
        getReserves: () => ({
          reserve0: BigNumber.from(0n),
          reserve1: BigNumber.from(0n),
        }),
        periodFinish: () => BigNumber.from("0x626ab98e"),
        rewardRate: () => BigNumber.from("0x10ce63bb1453e01451"),
        totalSupply: () => BigNumber.from("0x01f2d51b26bb6bf4b286"),
        vault: () => "",
      }))

      const APR = await getPoolAPR({
        asset,
        prices,
        vaultAddress: "0x0",
      })

      expect(APR.totalAPR).toBe(undefined)
    })

    it("should return 'New' if total staked value is 0", async () => {
      jest
        .spyOn(contractUtils, "getCurrentTimestamp")
        .mockImplementation(() => Promise.resolve(1651050516))

      // @ts-ignore
      jest.spyOn(contractUtils, "getContract").mockImplementationOnce(() => ({
        getReserves: () => ({
          reserve0: BigNumber.from(0n),
          reserve1: BigNumber.from(0n),
        }),
        periodFinish: () => BigNumber.from("0x626ab98e"),
        rewardRate: () => BigNumber.from("0x10ce63bb1453e01451"),
        totalSupply: () => BigNumber.from(0n),
        vault: () => "",
      }))

      const APR = await getPoolAPR({
        asset,
        prices,
        vaultAddress: "0x0",
      })

      expect(APR.totalAPR).toBe("New")
    })

    it("should return APR value if rewards value is bigger than 0 and staked value is bigger than 0", async () => {
      jest.spyOn(getTokenPrice, "default").mockImplementationOnce(() =>
        // @ts-ignore
        Promise.resolve({ singleTokenPrice: 10000000000n }),
      )

      jest
        .spyOn(contractUtils, "getCurrentTimestamp")
        .mockImplementation(() => Promise.resolve(1651050516))

      // @ts-ignore
      jest.spyOn(contractUtils, "getContract").mockImplementation(() => ({
        getReserves: () => ({
          reserve0: BigNumber.from(100000000000000000n),
          reserve1: BigNumber.from(100000000000000000n),
        }),
        periodFinish: () => BigNumber.from("0x626ab98e"),
        rewardRate: () => BigNumber.from("0x10ce63bb1453e01451"),
        totalSupply: () => BigNumber.from("0x01f2d51b26bb6bf4b286"),
        vault: () => "",
      }))

      const APR = await getPoolAPR({
        asset,
        prices,
        vaultAddress: "0x0",
      })

      expect(APR.totalAPR).toBe("332.2B%")
    })
  })
})
