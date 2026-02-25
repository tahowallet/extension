import { mock, describe, it, expect } from "bun:test"

const fetchJsonMock = mock(() => {})
mock.module("@ethersproject/web", () => {
  const actual = require("@ethersproject/web")
  fetchJsonMock.mockImplementation(actual.fetchJson)
  return { ...actual, fetchJson: fetchJsonMock }
})

import * as daylight from "../daylight"

describe("Daylight", () => {
  describe("getDaylightAbilities", () => {
    it("Should retry the correct number of times if response status is 'pending'", async () => {
      const fetchJsonResponse = {
        abilities: [],
        status: "pending",
      }

      fetchJsonMock.mockResolvedValue(fetchJsonResponse)

      await daylight.getDaylightAbilities(
        "0x208e94d5661a73360d9387d3ca169e5c130090cd",
        5,
      )

      expect(fetchJsonMock).toHaveBeenCalledTimes(6)
    })
  })
})
