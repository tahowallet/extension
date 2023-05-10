import { Ability } from "../../../abilities"
import { NormalizedEVMAddress } from "../../../types"
import {
  filterByAddress,
  filterByState,
  filterByType,
} from "../abilities-utils"

const ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"

const ABILITY_DEFAULT: Ability = {
  type: "mint",
  title: "Test Ability",
  description: null,
  abilityId: "",
  slug: "",
  linkUrl: "",
  completed: false,
  removedFromUi: false,
  address: ADDRESS as NormalizedEVMAddress,
  requirement: {
    type: "hold",
    address: "",
  },
  magicOrderIndex: 0,
}

describe("Abilities utils", () => {
  describe("filterByState", () => {
    test("should return true if an ability is open", () => {
      const ability = ABILITY_DEFAULT
      expect(filterByState(ability, "open")).toBeTruthy()
    })
    test("should return false if an ability is open and deleted", () => {
      const ability = {
        ...ABILITY_DEFAULT,
        removedFromUi: true,
      }
      expect(filterByState(ability, "open")).toBeFalsy()
    })
    test("should return false if an ability is open and expired", () => {
      const ability = {
        ...ABILITY_DEFAULT,
        closeAt: "Thu Mar 31 2022",
      }
      expect(filterByState(ability, "open")).toBeFalsy()
    })
    test("should return true if an ability is completed", () => {
      const ability = {
        ...ABILITY_DEFAULT,
        completed: true,
      }
      expect(filterByState(ability, "completed")).toBeTruthy()
    })
    test("should return false if an ability is completed and deleted", () => {
      const ability = {
        ...ABILITY_DEFAULT,
        completed: true,
        removedFromUi: true,
      }
      expect(filterByState(ability, "completed")).toBeFalsy()
    })
    test("should return false if an ability is completed and expired", () => {
      const ability = {
        ...ABILITY_DEFAULT,
        completed: true,
        closeAt: "Thu Mar 31 2022",
      }
      expect(filterByState(ability, "completed")).toBeFalsy()
    })
    test("should return false if an ability is not deleted", () => {
      const ability = ABILITY_DEFAULT
      expect(filterByState(ability, "deleted")).toBeFalsy()
    })
    test("should return true if an ability is deleted", () => {
      const ability = {
        ...ABILITY_DEFAULT,
        removedFromUi: true,
      }
      expect(filterByState(ability, "deleted")).toBeTruthy()
    })
    test("should return true if an ability is expired", () => {
      const ability = {
        ...ABILITY_DEFAULT,
        closeAt: "Thu Mar 31 2022",
      }
      expect(filterByState(ability, "expired")).toBeTruthy()
    })
    test("should return false if an ability is not expired", () => {
      const ability = {
        ...ABILITY_DEFAULT,
        closeAt: Date.now().toString(),
      }
      expect(filterByState(ability, "expired")).toBeFalsy()
    })
    test("should return false if an ability is expired and deleted", () => {
      const ability = {
        ...ABILITY_DEFAULT,
        removedFromUi: true,
        closeAt: "Thu Mar 31 2022",
      }
      expect(filterByState(ability, "expired")).toBeFalsy()
    })
  })
  describe("filterByType", () => {
    test("should return true if it is a mint type", () => {
      expect(filterByType("mint", ["mint"])).toBeTruthy()
    })
    test("should return false if it is an airdrop type", () => {
      expect(filterByType("airdrop", [])).toBeFalsy()
    })
  })
  describe("filterByAddress", () => {
    test("should return true if an address for an ability is enabled", () => {
      expect(filterByAddress(ADDRESS, [ADDRESS])).toBeTruthy()
    })
    test("should return false if an address for an ability is disabled", () => {
      expect(filterByAddress(ADDRESS, [])).toBeFalsy()
    })
  })
})
