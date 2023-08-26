import { createSmartContractAsset } from "../../../tests/factories"
import { ETH, OPTIMISTIC_ETH } from "../../../constants"
import {
  isBaselineTrustedAsset,
  isSameAsset,
  isTrustedAsset,
  isVerifiedAsset,
} from "../asset-utils"
import { NetworkBaseAsset } from "../../../networks"

describe("Asset utils", () => {
  describe("isBaselineTrustedAsset", () => {
    test("should return true if is a token list asset", () => {
      const asset = createSmartContractAsset()

      expect(isBaselineTrustedAsset(asset)).toBe(true)
    })

    test("should return false if is neither a token list asset nor a network base asset", () => {
      const asset = createSmartContractAsset({ metadata: { tokenLists: [] } })

      expect(isBaselineTrustedAsset(asset)).toBeFalsy()
    })

    test("should return true if is a network base asset", () => {
      expect(isBaselineTrustedAsset(ETH)).toBe(true)
    })

    test("should return true if is a network base and a token list asset", () => {
      const asset = {
        ...createSmartContractAsset(),
        // Only network base assets have a chainID property
        chainID: "1",
      }

      expect(isBaselineTrustedAsset(asset)).toBe(true)
    })
  })

  describe("isVerifiedAsset", () => {
    test("should return true if asset is explicitly verified", () => {
      const asset = createSmartContractAsset({ metadata: { verified: true } })

      expect(isVerifiedAsset(asset)).toBe(true)
    })

    test("should return false if it has no explicit verification state", () => {
      expect(isVerifiedAsset(ETH)).toBe(false)
      expect(isVerifiedAsset(createSmartContractAsset())).toBe(false)
      expect(
        isVerifiedAsset(
          createSmartContractAsset({ metadata: { verified: false } }),
        ),
      ).toBe(false)
    })
  })

  describe("isTrustedAsset", () => {
    test("should return true if asset is explicitly verified", () => {
      const asset = createSmartContractAsset({ metadata: { verified: true } })

      expect(isTrustedAsset(asset)).toBe(true)
    })

    test("should return false if is a unverified asset", () => {
      const asset = createSmartContractAsset({ metadata: { verified: false } })

      expect(isTrustedAsset(asset)).toBe(false)
    })

    test("should return true if is a network base asset", () => {
      expect(isTrustedAsset(ETH)).toBe(true)
    })

    test("should return true if is a token list asset", () => {
      const asset = createSmartContractAsset()

      expect(isTrustedAsset(asset)).toBe(true)
    })

    test("should return false if is not a token list asset", () => {
      const asset = createSmartContractAsset({ metadata: { tokenLists: [] } })

      expect(isTrustedAsset(asset)).toBe(false)
    })

    test("should return false if asset is with no verification state, no token list, and that isn't a network base asset", () => {
      const asset = createSmartContractAsset({
        metadata: {},
      })

      expect(isTrustedAsset(asset)).toBe(false)
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
        }),
      ).toBe(false)

      expect(
        isSameAsset(smartContractAsset, {
          ...smartContractAsset,
          contractAddress: "0x",
        }),
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
        false,
      )
    })
  })
})
