import { ETH, ETHEREUM, MATIC, POLYGON } from "../../constants"
import { createSmartContractAsset } from "../../tests/factories"
import { getSwapAmountParams } from "../0x-swap"

const USDC = createSmartContractAsset({
  symbol: "USDC",
  decimals: 6,
  contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
})
const WETH = createSmartContractAsset({
  symbol: "WETH",
  decimals: 18,
  contractAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
})
const WPOL = createSmartContractAsset({
  symbol: "WPOL",
  decimals: 18,
  homeNetwork: POLYGON,
  contractAddress: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
})

describe("getSwapAmountParams", () => {
  it("should send a sell-side amount as sellAmount in sell token units", () => {
    expect(
      getSwapAmountParams({
        assets: { sellAsset: USDC, buyAsset: ETH },
        amount: { sellAmount: "1.5" },
        network: ETHEREUM,
      }),
    ).toEqual({ sellAmount: "1500000" })
  })

  it("should send a buy-side amount as buyAmount in buy token units", () => {
    expect(
      getSwapAmountParams({
        assets: { sellAsset: ETH, buyAsset: USDC },
        amount: { buyAmount: "10" },
        network: ETHEREUM,
      }),
    ).toEqual({ buyAmount: "10000000" })
  })

  it.each([
    ["wrapping", ETH, WETH, ETHEREUM],
    ["unwrapping", WETH, ETH, ETHEREUM],
    [
      "wrapping a base asset with its own contract address",
      MATIC,
      WPOL,
      POLYGON,
    ],
  ])(
    "should send a buy-side amount as sellAmount when %s",
    (_, sellAsset, buyAsset, network) => {
      expect(
        getSwapAmountParams({
          assets: { sellAsset, buyAsset },
          amount: { buyAmount: "0.25" },
          network,
        }),
      ).toEqual({ sellAmount: "250000000000000000" })
    },
  )

  it("should send buyAmount for a wrapped base asset from another network", () => {
    expect(
      getSwapAmountParams({
        assets: { sellAsset: MATIC, buyAsset: WETH },
        amount: { buyAmount: "1" },
        network: POLYGON,
      }),
    ).toEqual({ buyAmount: "1000000000000000000" })
  })
})
