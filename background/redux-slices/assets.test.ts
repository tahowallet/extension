import { PricePoint, SmartContractFungibleAsset } from "../assets"
import { POLYGON } from "../constants"
import { createPricePoint, createSmartContractAsset } from "../tests/factories"
import { AssetsState, selectAssetPricePoint, SingleAssetState } from "./assets"

const asset: SmartContractFungibleAsset = createSmartContractAsset()

const pricePoint: PricePoint = createPricePoint(asset)

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

    test("should retrieve the correct price point for an asset that shares a symbol with other assets across networks", () => {
      /* same symbol, network, different contract address */
      const similarAsset = {
        ...asset,
        contractAddress: "0xf4d2888d29d722226fafa5d9b24f9164c092421e",
      }

      const similarAssetPricePoint: PricePoint = createPricePoint(similarAsset)

      const similarAssetWithPricePoint: SingleAssetState = {
        ...similarAsset,
        recentPrices: {
          USD: similarAssetPricePoint,
        },
      }

      const state = [assetWithPricePoint, similarAssetWithPricePoint]
      const result = selectAssetPricePoint(state, similarAsset, "USD")

      expect(result).toMatchObject(similarAssetPricePoint)
    })

    /* Best-effort matches */
    test("If a network-specific price point is unavailable, should fallback to a price point for an asset with the same symbol", () => {
      /* same symbol, different network */
      const assetWithoutPricePoint: SingleAssetState = {
        ...asset,
        homeNetwork: POLYGON,
        recentPrices: {},
      }

      const state = [assetWithPricePoint, assetWithoutPricePoint]
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
