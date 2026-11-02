import { mock, describe, it, expect } from "bun:test"
import * as daylight from "../daylight"

describe("Daylight", () => {
  describe("getDaylightAbilities", () => {
    it("Should retry the correct number of times if response status is 'pending'", async () => {
      const fetchJsonMock = mock(async () => ({
        abilities: [],
        status: "pending",
      }))

      await daylight.getDaylightAbilities(
        "0x208e94d5661a73360d9387d3ca169e5c130090cd",
        5,
        fetchJsonMock,
      )

      expect(fetchJsonMock).toHaveBeenCalledTimes(6)
    })
  })
})
