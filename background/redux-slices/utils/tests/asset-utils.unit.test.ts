import { ETH, ETHEREUM } from "../../../constants"
import { isUntrustedAsset } from "../asset-utils"

describe("Asset utils", () => {
  describe("isUntrustedAsset", () => {
    test("should return true if is an untrusted asset", () => {
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
      expect(isUntrustedAsset(asset, ETHEREUM)).toBeTruthy()
    })
    test("should return false if is a trusted asset", () => {
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
        },
      }
      expect(isUntrustedAsset(asset, ETHEREUM)).toBeFalsy()
    })
    test("should return false if is a base asset", () => {
      expect(isUntrustedAsset(ETH, ETHEREUM)).toBeFalsy()
    })
    test("should return false if an asset is undefined", () => {
      expect(isUntrustedAsset(undefined, ETHEREUM)).toBeFalsy()
    })
  })
})
