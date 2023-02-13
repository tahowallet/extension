// It's necessary to have an object w/ the function on it so we can use spyOn
import * as ethers from "@ethersproject/web" // << THIS IS THE IMPORTANT TRICK
import * as daylight from "../daylight"

describe("Daylight", () => {
  describe("getDaylightAbilities", () => {
    it("Should retry the correct number of times if response status is 'pending' ", async () => {
      const fetchJsonResponse = {
        abilities: [],
        status: "pending",
      }

      const spy = jest
        .spyOn(ethers, "fetchJson")
        .mockResolvedValue(fetchJsonResponse)

      await daylight.getDaylightAbilities(
        "0x208e94d5661a73360d9387d3ca169e5c130090cd",
        5
      )

      expect(spy).toHaveBeenCalledTimes(6)
    })
  })
})
