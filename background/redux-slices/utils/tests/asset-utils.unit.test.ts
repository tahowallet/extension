import { ETH } from "../../../constants"
import { isUnverifiedAssetByUser } from "../asset-utils"

describe("Asset utils", () => {
  describe("isUnverifiedAssetByUser", () => {
    test("should return true if is an unverified asset", () => {
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
      expect(isUnverifiedAssetByUser(asset)).toBeTruthy()
    })
    test("should return false if is a verified asset", () => {
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
      expect(isUnverifiedAssetByUser(asset)).toBeFalsy()
    })
    test("should return false if is a base asset", () => {
      expect(isUnverifiedAssetByUser(ETH)).toBeFalsy()
    })
    test("should return false if an asset is undefined", () => {
      expect(isUnverifiedAssetByUser(undefined)).toBeFalsy()
    })
  })
})
