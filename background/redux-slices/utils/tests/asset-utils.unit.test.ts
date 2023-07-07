import { createSmartContractAsset } from "../../../tests/factories"
import { ETH, OPTIMISTIC_ETH } from "../../../constants"
import { isSameAsset, isVerifiedAssetByUser } from "../asset-utils"
import { NetworkBaseAsset } from "../../../networks"

describe("Asset utils", () => {
  describe("isVerifiedAssetByUser", () => {
    test("should return false if is an unverified asset", () => {
      const asset = {
        name: "Test",
        symbol: "TST",
        decimals: 18,
        metadata: {
          coinGeckoID: "test",
          tokenLists: [],
          websiteURL: "",
        },
      }
      expect(isVerifiedAssetByUser(asset)).toBeFalsy()
    })

    test("should return true if is a verified asset", () => {
      const asset = {
        name: "Test",
        symbol: "TST",
        decimals: 18,
        metadata: {
          coinGeckoID: "test",
          tokenLists: [
            {
              name: "",
              url: "",
            },
          ],
          websiteURL: "",
          verified: true,
        },
      }
      expect(isVerifiedAssetByUser(asset)).toBeTruthy()
    })

    test("should return false if is a base asset", () => {
      expect(isVerifiedAssetByUser(ETH)).toBeFalsy()
    })
  })

  describe("isSameAsset", () => {
    const smartContractAsset = createSmartContractAsset({ symbol: "ABC" })

    test("should check smart contract assets have same network and contractAddress", () => {
      expect(isSameAsset(smartContractAsset, smartContractAsset)).toBe(true)

      expect(
        isSameAsset(smartContractAsset, {
          ...smartContractAsset,
          homeNetwork: { ...smartContractAsset.homeNetwork, chainID: "222" },
        })
      ).toBe(false)

      expect(
        isSameAsset(smartContractAsset, {
          ...smartContractAsset,
          contractAddress: "0x",
        })
      ).toBe(false)
    })

    test("should handle undefined values", () => {
      expect(isSameAsset(smartContractAsset, undefined)).toBe(false)
      expect(isSameAsset(undefined, smartContractAsset)).toBe(false)
      expect(isSameAsset(undefined, undefined)).toBe(false)
    })

    test("should check base network assets have same chainID and symbol", () => {
      const baseAsset: NetworkBaseAsset = {
        decimals: 18,
        symbol: "METIS",
        name: "METIS Network",
        chainID: "1088",
      }

      expect(isSameAsset(smartContractAsset, ETH)).toBe(false)
      expect(isSameAsset(ETH, undefined)).toBe(false)
      expect(isSameAsset(OPTIMISTIC_ETH, ETH)).toBe(false)
      expect(isSameAsset(ETH, ETH)).toBe(true)
      expect(isSameAsset(ETH, ETH)).toBe(true)
      expect(isSameAsset(baseAsset, ETH)).toBe(false)
      expect(isSameAsset(baseAsset, { ...baseAsset, chainID: "999" })).toBe(
        false
      )
    })
  })
})
