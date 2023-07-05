import { createSmartContractAsset } from "../../../tests/factories"
import { ETH, OPTIMISTIC_ETH } from "../../../constants"
import {
  isBaselineTrustedAsset,
  isSameAsset,
  isTrustedAsset,
  isVerifiedAsset,
} from "../asset-utils"
import { NetworkBaseAsset } from "../../../networks"
import * as featureFlags from "../../../features"

describe("Asset utils", () => {
  describe("isBaselineTrustedAsset", () => {
    test("should return true if is a token list asset", () => {
      const asset = createSmartContractAsset()

      expect(isBaselineTrustedAsset(asset)).toBeTruthy()
    })

    test("should return false if is not a token list asset", () => {
      const asset = createSmartContractAsset({ metadata: {} })

      expect(isBaselineTrustedAsset(asset)).toBeFalsy()
    })

    test("should return true if is a network base asset", () => {
      expect(isBaselineTrustedAsset(ETH)).toBeTruthy()
    })
  })

  describe("isVerifiedAsset", () => {
    test("should return true if is a verified asset", () => {
      const asset = createSmartContractAsset({ metadata: { verified: true } })

      expect(isVerifiedAsset(asset)).toBeTruthy()
    })

    test("should return false if is a unverified asset", () => {
      const asset = createSmartContractAsset({ metadata: { verified: false } })

      expect(isVerifiedAsset(asset)).toBeFalsy()
    })

    test("should return false if is a network base asset", () => {
      expect(isVerifiedAsset(ETH)).toBeFalsy()
    })

    test("should return false if is a token list asset", () => {
      const asset = createSmartContractAsset()

      expect(isVerifiedAsset(asset)).toBeFalsy()
    })
  })

  describe("isTrustedAsset", () => {
    test("should return true if is a verified asset", () => {
      const asset = createSmartContractAsset({ metadata: { verified: true } })

      expect(isTrustedAsset(asset)).toBeTruthy()
    })

    test("should return false if is a unverified asset", () => {
      jest.spyOn(featureFlags, "isEnabled").mockImplementation(() => true)
      const asset = createSmartContractAsset({ metadata: { verified: false } })

      expect(isTrustedAsset(asset)).toBeFalsy()
    })

    test("should return true if is a network base asset", () => {
      expect(isTrustedAsset(ETH)).toBeTruthy()
    })

    test("should return true if is a token list asset", () => {
      const asset = createSmartContractAsset()

      expect(isTrustedAsset(asset)).toBeTruthy()
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
