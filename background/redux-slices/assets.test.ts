import { PricePoint, SmartContractFungibleAsset } from "../assets"
import { ETHEREUM, POLYGON } from "../constants"
import { AssetsState, selectAssetPricePoint, SingleAssetState } from "./assets"

const asset: SmartContractFungibleAsset = {
  metadata: {
    logoURL:
      "https://messari.io/asset-images/0783ede3-4b2c-418a-9f82-f171894c70e2/128.png",
    tokenLists: [
      {
        url: "https://gateway.ipfs.io/ipns/tokens.uniswap.org",
        name: "Uniswap Labs Default",
        logoURL: "ipfs://QmNa8mQkrNKp1WEEeGjFezDmDeodkWRevGFN8JCV7b4Xir",
      },
    ],
  },
  name: "Keep Network",
  symbol: "KEEP",
  decimals: 18,
  homeNetwork: ETHEREUM,
  contractAddress: "0x85eee30c52b0b379b046fb0f85f4f3dc3009afec",
}

const pricePoint: PricePoint = {
  pair: [
    asset,
    {
      name: "United States Dollar",
      symbol: "USD",
      decimals: 10,
    },
  ],
  amounts: [1000000000000000000n, 873910000n],
  time: 1671166100,
}

const assetWithPricePoint = {
  ...asset,
  recentPrices: {
    USD: pricePoint,
  },
}

const assetState: AssetsState = [assetWithPricePoint]

describe("Assets selectors", () => {
  describe("Price Points", () => {
    test("should retrieve price point for an asset", () => {
      const result = selectAssetPricePoint(assetState, asset, "USD")

      expect(result).toMatchObject(pricePoint)
    })

    /* Best effort matches */
    test("should fallback to a price point for an asset with the same symbol", () => {
      /* same symbol, different network */
      const assetWithoutPricePoint: SingleAssetState = {
        ...asset,
        homeNetwork: POLYGON,
        recentPrices: {},
      }

      const state = [...assetState, assetWithoutPricePoint]
      const result = selectAssetPricePoint(state, assetWithoutPricePoint, "USD")

      expect(result).toMatchObject(pricePoint)
    })

    test("should match queried asset decimals when falling back to a best effort match", () => {
      /* same symbol, different network, different decimals */
      const assetWithoutPricePoint: SingleAssetState = {
        ...asset,
        homeNetwork: POLYGON,
        decimals: 6,
        recentPrices: {},
      }

      const state = [assetWithPricePoint, assetWithoutPricePoint]
      const result = selectAssetPricePoint(state, assetWithoutPricePoint, "USD")

      expect(assetWithPricePoint.decimals).toBe(18)

      expect(result).toMatchObject({
        ...pricePoint,
        // 6 decimals
        amounts: [1_000_000n, pricePoint.amounts[1]],
      })
    })
  })
})
