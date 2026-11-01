import { CHAIN_ID_TO_RPC_URLS } from "../../../constants/networks"
import { DEAD_RPC_URLS, scrubDeadEndpoints } from "../db"

describe("Chain Database helpers", () => {
  describe("scrubDeadEndpoints", () => {
    it("should remove endpoints whose URL is dead", () => {
      expect(
        scrubDeadEndpoints(
          [
            { url: "https://polygon-rpc.com" },
            { url: "https://polygon.example.com", capabilities: ["alchemy_"] },
          ],
          ["https://polygon-rpc.com"],
        ),
      ).toEqual([
        { url: "https://polygon.example.com", capabilities: ["alchemy_"] },
      ])
    })

    it("should leave lists without dead endpoints untouched", () => {
      const endpoints = [
        { url: "https://polygon.example.com" },
        { url: "https://polygon-rpc.com/other-path" },
      ]

      expect(
        scrubDeadEndpoints(endpoints, ["https://polygon-rpc.com"]),
      ).toEqual(endpoints)
    })

    it("should never leave a chain with no endpoints", () => {
      const endpoints = [{ url: "https://polygon-rpc.com" }]

      expect(
        scrubDeadEndpoints(endpoints, ["https://polygon-rpc.com"]),
      ).toEqual(endpoints)
    })

    it("should target the dead Polygon RPC by default", () => {
      expect(DEAD_RPC_URLS).toContain("https://polygon-rpc.com")
    })

    it("should never scrub a shipped default", () => {
      const defaults = Object.values(CHAIN_ID_TO_RPC_URLS).flat()

      expect(DEAD_RPC_URLS.filter((url) => defaults.includes(url))).toEqual([])
    })
  })
})
