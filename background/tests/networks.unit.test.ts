import { toHexChainID } from "../networks"

describe("Networks", () => {
  describe("toHexchainID", () => {
    it("should be case-insensitive", async () => {
      expect(toHexChainID("0xA")).toEqual(toHexChainID("0xa"))
      expect(toHexChainID("0xA")).toEqual(toHexChainID(10))
      expect(toHexChainID("0xa")).toEqual(toHexChainID(10))
    })
  })
})
