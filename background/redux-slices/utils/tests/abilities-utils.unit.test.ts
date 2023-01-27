import { Ability } from "../../../abilities"
import { NormalizedEVMAddress } from "../../../types"
import { FilterType } from "../../abilities"
import {
  filterByAddress,
  filterByState,
  filterByType,
} from "../abilities-utils"
import { FilterAccount } from "../account-filter-utils"

const ADDRESS =
  "0x208e94d5661a73360d9387d3ca169e5c130090cd" as NormalizedEVMAddress

const ABILITY_DEFAULT: Ability = {
  type: "mint",
  title: "Test Ability",
  description: null,
  abilityId: "",
  linkUrl: "",
  completed: false,
  removedFromUi: false,
  address: ADDRESS,
  requirement: {
    type: "hold",
    address: "",
  },
}
const TYPES: FilterType[] = [
  {
    type: "mint",
    isEnabled: true,
  },
  {
    type: "airdrop",
    isEnabled: false,
  },
]

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
    test("should return true if a mint ability", () => {
      expect(filterByType("mint", TYPES)).toBeTruthy()
    })
    test("should return false if a airdrop ability", () => {
      expect(filterByType("airdrop", TYPES)).toBeFalsy()
    })
    test("should return false if type for ability does not exist", () => {
      expect(filterByType("access", TYPES)).toBeFalsy()
    })
  })
  describe("filterByAddress", () => {
    test("should return true if an address for an ability is enabled", () => {
      // TODO change type
      expect(
        filterByAddress(ADDRESS, [
          { id: ADDRESS, isEnabled: true } as unknown as FilterAccount,
        ])
      ).toBeTruthy()
    })
    test("should return false if an address for an ability is disabled", () => {
      // TODO change type
      expect(
        filterByAddress(ADDRESS, [
          { id: ADDRESS, isEnabled: false } as unknown as FilterAccount,
        ])
      ).toBeFalsy()
    })
  })
})
