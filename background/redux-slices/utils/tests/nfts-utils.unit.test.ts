import { AVAX, BNB, ETH, ETHEREUM } from "../../../constants"
import {
  enrichCollectionWithCurrencyFloorPrice,
  getTotalFloorPrice,
  sortByPrice,
} from "../nfts-utils"
import { createPricePoint } from "../../../tests/factories"
import { PricesState } from "../../prices"
import { getFullAssetID } from "../asset-utils"
import { DisplayCurrency } from "../../../assets"

const COLLECTION_MOCK = {
  id: "",
  name: "",
  owner: "",
  chainID: ETHEREUM.chainID, // doesn't matter for now
  hasBadges: false,
  nfts: [], // doesn't matter for now
  hasNextPage: false,
}

const pricesState: PricesState = {
  [getFullAssetID(ETH)]: {
    USD: createPricePoint(ETH, 2000),
  },
  [getFullAssetID(AVAX)]: {
    USD: createPricePoint(AVAX, 15),
  },
  [getFullAssetID(BNB)]: {
    USD: createPricePoint(BNB, 50),
  },
}

const displayCurrency: DisplayCurrency = {
  code: "USD",
  rate: { amount: 100n, decimals: 2n },
}

describe("NFTs utils", () => {
  describe("getTotalFloorPrice", () => {
    test("should sum ETH and WETH floor prices", () => {
      const collections = [
        {
          ...COLLECTION_MOCK,
          nftCount: 1,
          floorPrice: { value: 0.001, tokenSymbol: "ETH" },
        },
        {
          ...COLLECTION_MOCK,
          nftCount: 1,
          floorPrice: { value: 0.002, tokenSymbol: "WETH" },
        },
      ]

      expect(getTotalFloorPrice(collections)).toMatchObject({ ETH: 0.003 })
    })
    test("should sum floor prices for multiple currencies", () => {
      const collections = [
        {
          ...COLLECTION_MOCK,
          nftCount: 1,
          floorPrice: { value: 0.002, tokenSymbol: "BNB" },
        },
        {
          ...COLLECTION_MOCK,
          nftCount: 1,
          floorPrice: { value: 0.003, tokenSymbol: "ETH" },
        },
        {
          ...COLLECTION_MOCK,
          nftCount: 1,
          floorPrice: { value: 0.001, tokenSymbol: "BNB" },
        },
        {
          ...COLLECTION_MOCK,
          nftCount: 1,
          floorPrice: { value: 0.002, tokenSymbol: "AVAX" },
        },
        {
          ...COLLECTION_MOCK,
          nftCount: 1,
          floorPrice: { value: 0.001, tokenSymbol: "AVAX" },
        },
      ]

      expect(getTotalFloorPrice(collections)).toMatchObject({
        ETH: 0.003,
        AVAX: 0.003,
        BNB: 0.003,
      })
    })
    test("should sum floor prices for collections with multiple NFTs owned", () => {
      const collections = [
        {
          ...COLLECTION_MOCK,
          nftCount: 10,
          floorPrice: { value: 0.001, tokenSymbol: "ETH" },
        },
        {
          ...COLLECTION_MOCK,
          nftCount: 5,
          floorPrice: { value: 0.002, tokenSymbol: "WETH" },
        },
      ]

      expect(getTotalFloorPrice(collections)).toMatchObject({ ETH: 0.02 })
    })
    test("should sum correctly when some collection has 0 NFTs", () => {
      const collections = [
        {
          ...COLLECTION_MOCK,
          floorPrice: { value: 0.001, tokenSymbol: "ETH" },
        },
        {
          ...COLLECTION_MOCK,
          nftCount: 0,
          floorPrice: { value: 0.002, tokenSymbol: "WETH" },
        },
        {
          ...COLLECTION_MOCK,
          nftCount: 1,
          floorPrice: { value: 0.001, tokenSymbol: "WETH" },
        },
      ]

      expect(getTotalFloorPrice(collections)).toMatchObject({ ETH: 0.001 })
    })
    test("should sum correctly if some collections have no floor prices", () => {
      const collections = [
        COLLECTION_MOCK,
        {
          ...COLLECTION_MOCK,
          nftCount: 1,
          floorPrice: { value: 0.001, tokenSymbol: "WETH" },
        },
        COLLECTION_MOCK,
      ]

      expect(getTotalFloorPrice(collections)).toMatchObject({ ETH: 0.001 })
    })
  })

  describe("enrichCollectionWithUSDFloorPrice", () => {
    test("should add USD price if floor price is in ETH", () => {
      const collection = {
        ...COLLECTION_MOCK,
        floorPrice: {
          value: 1,
          tokenSymbol: "ETH",
        },
      }

      expect(
        enrichCollectionWithCurrencyFloorPrice(
          collection,
          pricesState,
          displayCurrency,
        ).floorPrice,
      ).toMatchObject({
        value: 1,
        valueUSD: 2000,
        tokenSymbol: "ETH",
      })
    })
    test("should add USD price if floor price is in WETH", () => {
      const collection = {
        ...COLLECTION_MOCK,
        floorPrice: {
          value: 0.5,
          tokenSymbol: "WETH",
        },
      }

      expect(
        enrichCollectionWithCurrencyFloorPrice(
          collection,
          pricesState,
          displayCurrency,
        ).floorPrice,
      ).toMatchObject({
        value: 0.5,
        valueUSD: 1000,
        tokenSymbol: "WETH",
      })
    })
    test("should add USD price if floor price is in AVAX", () => {
      const collection = {
        ...COLLECTION_MOCK,
        floorPrice: {
          value: 2,
          tokenSymbol: "AVAX",
        },
      }

      expect(
        enrichCollectionWithCurrencyFloorPrice(
          collection,
          pricesState,
          displayCurrency,
        ).floorPrice,
      ).toMatchObject({
        value: 2,
        valueUSD: 30,
        tokenSymbol: "AVAX",
      })
    })
    test("should add USD price if floor price is in BNB", () => {
      const collection = {
        ...COLLECTION_MOCK,
        floorPrice: {
          value: 0.5,
          tokenSymbol: "BNB",
        },
      }

      expect(
        enrichCollectionWithCurrencyFloorPrice(
          collection,
          pricesState,
          displayCurrency,
        ).floorPrice,
      ).toMatchObject({
        value: 0.5,
        valueUSD: 25,
        tokenSymbol: "BNB",
      })
    })
    test("shouldn't add USD price if base asset is not found in assets list", () => {
      const collection = {
        ...COLLECTION_MOCK,
        floorPrice: {
          value: 0.5,
          tokenSymbol: "MATIC",
        },
      }

      expect(
        enrichCollectionWithCurrencyFloorPrice(
          collection,
          pricesState,
          displayCurrency,
        ).floorPrice,
      ).toMatchObject({
        value: 0.5,
        tokenSymbol: "MATIC",
      })
    })
    test("shouldn't add USD price if there is not floor price", () => {
      const collection = COLLECTION_MOCK
      expect(
        enrichCollectionWithCurrencyFloorPrice(
          collection,
          pricesState,
          displayCurrency,
        ).floorPrice,
      ).toBeUndefined()
    })
    test("shouldn't add floor price if price is not using base assets", () => {
      const collection = {
        ...COLLECTION_MOCK,
        floorPrice: {
          value: 0.5,
          tokenSymbol: "XYZ",
        },
      }

      expect(
        enrichCollectionWithCurrencyFloorPrice(
          collection,
          pricesState,
          displayCurrency,
        ).floorPrice,
      ).toMatchObject({
        value: 0.5,
        tokenSymbol: "XYZ",
      })
    })
  })

  describe("sortByPrice", () => {
    const collections = [
      {
        ...COLLECTION_MOCK,
        id: "cheap",
        floorPrice: { value: 1, valueUSD: 1, tokenSymbol: "USDT" },
      },
      {
        ...COLLECTION_MOCK,
        id: "expensive",
        floorPrice: { value: 100, valueUSD: 100, tokenSymbol: "USDT" },
      },
      {
        ...COLLECTION_MOCK,
        id: "zero",
        floorPrice: { value: 0, valueUSD: 0, tokenSymbol: "USDT" },
      },
      {
        ...COLLECTION_MOCK,
        id: "undefined",
      },
    ]

    test("should sort collection by ascending floor price", () => {
      expect(
        collections
          .sort((a, b) => sortByPrice("asc", a, b))
          .map((collection) => collection.id),
      ).toMatchObject(["zero", "cheap", "expensive", "undefined"])
    })
    test("should sort collection by descending floor price", () => {
      expect(
        collections
          .sort((a, b) => sortByPrice("desc", a, b))
          .map((collection) => collection.id),
      ).toMatchObject(["expensive", "cheap", "zero", "undefined"])
    })
  })
})
