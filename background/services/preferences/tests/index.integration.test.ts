import "fake-indexeddb/auto"
import PreferenceService from ".."
import { POLYGON } from "../../../constants"
import DEFAULT_PREFERENCES from "../defaults"

describe("Preference Service Integration", () => {
  let preferenceService: PreferenceService

  beforeEach(async () => {
    preferenceService = await PreferenceService.create()
    await preferenceService.startService()
  })

  describe("setSelectedAccount", () => {
    it("should correctly set selectedAccount in indexedDB", async () => {
      // Should match default account prior to interaction
      expect(await preferenceService.getSelectedAccount()).toEqual(
        DEFAULT_PREFERENCES.selectedAccount
      )
      const newAccount = {
        address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        network: POLYGON,
      }
      await preferenceService.setSelectedAccount(newAccount)
      expect(await preferenceService.getSelectedAccount()).toEqual(newAccount)
    })
  })

  describe("setDefaultWalletValue", () => {
    it("should correctly toggle defaultWallet in indexedDB", async () => {
      // Should default to true
      expect(await preferenceService.getDefaultWallet()).toEqual(true)
      await preferenceService.setDefaultWalletValue(false)
      expect(await preferenceService.getDefaultWallet()).toEqual(false)
    })
  })
})
