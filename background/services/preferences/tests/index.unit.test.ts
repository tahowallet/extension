import PreferenceService from ".."
import { ETHEREUM, POLYGON } from "../../../constants"

const UNISWAP_ROUTER = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"

describe("Preference Service Unit", () => {
  let preferenceService: PreferenceService

  beforeEach(async () => {
    preferenceService = await PreferenceService.create()
    await preferenceService.startService()
  })

  afterEach(async () => {
    await preferenceService.stopService()
  })

  describe("known contracts", () => {
    it("names a built-in contract on the network it's listed for", async () => {
      const found = await preferenceService.lookUpNameForContractAddress({
        address: UNISWAP_ROUTER.toLowerCase(),
        network: ETHEREUM,
      })

      expect(found?.name).toEqual("🦄 Uniswap")
    })

    it("doesn't name a built-in contract on a network it isn't listed for", async () => {
      const found = await preferenceService.lookUpNameForContractAddress({
        address: UNISWAP_ROUTER,
        network: POLYGON,
      })

      expect(found).toBeUndefined()
    })

    it("finds a built-in contract's address by name", async () => {
      const found = await preferenceService.lookUpAddressForContractName({
        name: "🦄 Uniswap",
        network: ETHEREUM,
      })

      expect(found?.address).toEqual(UNISWAP_ROUTER.toLowerCase())
    })
  })
})
