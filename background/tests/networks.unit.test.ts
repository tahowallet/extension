import { ETHEREUM, POLYGON, ROOTSTOCK } from "../constants"
import { Network, sameAddressFormat, toHexChainID } from "../networks"

describe("Networks", () => {
  describe("toHexchainID", () => {
    it("should be case-insensitive", async () => {
      expect(toHexChainID("0xA")).toEqual(toHexChainID("0xa"))
      expect(toHexChainID("0xA")).toEqual(toHexChainID(10))
      expect(toHexChainID("0xa")).toEqual(toHexChainID(10))
    })
  })

  describe("sameAddressFormat", () => {
    it("should be true for networks in the same family", () => {
      expect(sameAddressFormat(ETHEREUM, POLYGON)).toBe(true)
      expect(sameAddressFormat(ETHEREUM, ROOTSTOCK)).toBe(true)
    })

    it("should be false for networks in different families", () => {
      const otherFamilyNetwork = {
        ...ETHEREUM,
        family: "BTC",
      } as unknown as Network

      expect(sameAddressFormat(ETHEREUM, otherFamilyNetwork)).toBe(false)
      expect(sameAddressFormat(otherFamilyNetwork, ETHEREUM)).toBe(false)
    })
  })
})
