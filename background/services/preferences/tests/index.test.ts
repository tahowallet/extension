import "fake-indexeddb/auto"
import PreferenceService from ".."
import { ETHEREUM, POLYGON } from "../../../constants"
import DEFAULT_PREFERENCES from "../defaults"

describe("Preference Service", () => {
  let preferenceService: PreferenceService

  beforeEach(async () => {
    preferenceService = await PreferenceService.create()
    await preferenceService.startService()
  })

  describe("addOrEditNameInAddressBook", () => {
    it("should emit an addressBookEntryModified event when called", async () => {
      const spy = jest.spyOn(preferenceService.emitter, "emit")
      const nameToAdd = {
        network: ETHEREUM,
        name: "foo",
        address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      }
      preferenceService.addOrEditNameInAddressBook(nameToAdd)

      expect(spy).toHaveBeenCalledWith("addressBookEntryModified", nameToAdd)
    })

    it("should correctly persist entries and allow them to be queryable by name", async () => {
      preferenceService.addOrEditNameInAddressBook({
        network: ETHEREUM,
        name: "foo",
        address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      })

      const foundAddressOnNetwork = preferenceService.lookUpAddressForName({
        name: "foo",
        network: ETHEREUM,
      })

      expect(foundAddressOnNetwork?.address).toEqual(
        "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
      )
    })

    it("should correctly persist entries and allow them to be queryable by address", async () => {
      preferenceService.addOrEditNameInAddressBook({
        network: ETHEREUM,
        name: "foo",
        address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      })

      const foundAddressOnNetwork = preferenceService.lookUpNameForAddress({
        address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        network: ETHEREUM,
      })

      expect(foundAddressOnNetwork?.name).toEqual("foo")
    })
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
