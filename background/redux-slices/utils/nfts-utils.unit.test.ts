import { ETHEREUM } from "../../constants"
import { getTotalFloorPrice } from "./nfts-utils"

const COLLECTION_MOCK = {
  id: "",
  name: "",
  owner: "",
  network: ETHEREUM, // doesn't matter for now
  hasBadges: false,
  nfts: [], // doesn't matter for now
  hasNextPage: false,
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
})
