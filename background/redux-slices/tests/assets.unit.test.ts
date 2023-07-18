import {
  PricePoint,
  SmartContractFungibleAsset,
  unitPricePointForPricePoint,
} from "../../assets"
import { ETH, POLYGON } from "../../constants"
import {
  createPricePoint,
  createSmartContractAsset,
} from "../../tests/factories"
import reducer, { assetsLoaded, SingleAssetState } from "../assets"
import { PricesState, selectAssetPricePoint } from "../prices"
import { getFullAssetID } from "../utils/asset-utils"

const asset: SmartContractFungibleAsset = createSmartContractAsset({})

const pricePoint: PricePoint = createPricePoint(asset)

const pricesState: PricesState = {
  [getFullAssetID(asset)]: {
    USD: pricePoint,
  },
}

describe("Reducers", () => {
  describe("assetsLoaded", () => {
    test("updates cached asset metadata", () => {
      const customAsset: SmartContractFungibleAsset = createSmartContractAsset({
        metadata: { tokenLists: [] },
      })

      const state = reducer({}, assetsLoaded([customAsset]))

      expect(
        state[getFullAssetID(customAsset)].metadata?.verified
      ).not.toBeDefined()

      const newState = reducer(
        state,
        assetsLoaded([{ ...customAsset, metadata: { verified: true } }])
      )

      expect(
        newState[getFullAssetID(customAsset)].metadata?.verified
      ).toBeTruthy()
    })
  })
})

describe("Assets selectors", () => {
  describe("Price Points", () => {
    test("should retrieve price point for an asset", () => {
      const result = selectAssetPricePoint(pricesState, asset, "USD")

      expect(result).toMatchObject(pricePoint)
    })

    test("should retrieve the correct price point for an asset that shares a symbol with other assets across networks", () => {
      /* same symbol, network, different contract address */
      const similarAsset = {
        ...asset,
        contractAddress: "0xf4d2888d29d722226fafa5d9b24f9164c092421e",
      }

      const similarAssetPricePoint: PricePoint = createPricePoint(similarAsset)

      const state = {
        ...pricesState,
        [getFullAssetID(similarAsset)]: { USD: similarAssetPricePoint },
      }
      const result = selectAssetPricePoint(state, similarAsset, "USD")

      expect(result).toMatchObject(similarAssetPricePoint)
    })

    /* Best-effort matches */
    test("If a network-specific price point is unavailable, should fallback to a price point for an asset with the same symbol", () => {
      /* same symbol, different network */
      const assetWithoutPricePoint: SingleAssetState = {
        ...asset,
        homeNetwork: POLYGON,
      }

      const result = selectAssetPricePoint(
        pricesState,
        assetWithoutPricePoint,
        "USD"
      )

      expect(result).toMatchObject(pricePoint)
    })

    test("should match queried asset decimals when falling back to a best effort match", () => {
      /* same symbol, different network, different decimals */
      const assetWithoutPricePoint: SingleAssetState = {
        ...asset,
        homeNetwork: POLYGON,
        decimals: 6,
      }

      const state = { ...pricesState }
      const result = selectAssetPricePoint(state, assetWithoutPricePoint, "USD")

      expect(asset.decimals).toBe(18)

      expect(result).toMatchObject({
        ...pricePoint,
        // 6 decimals
        amounts: [1_000_000n, pricePoint.amounts[1]],
      })
    })
  })
})

describe(unitPricePointForPricePoint, () => {
  // An asset amount of the second asset using the pair's price point data
  test("should return the unit price of an asset using a price point", () => {
    const result = unitPricePointForPricePoint(createPricePoint(ETH, 1500))

    expect(result).toMatchObject({
      unitPrice: {
        asset: { name: "United States Dollar", symbol: "USD", decimals: 10 },
        amount: 15000000000000n,
      },
      time: expect.any(Number),
    })
  })
})
