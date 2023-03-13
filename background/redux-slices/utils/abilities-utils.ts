import { Ability, AbilityType } from "../../abilities"
import { Filter, Sort, State } from "../abilities"

const isDeleted = (ability: Ability): boolean => ability.removedFromUi

const isExpired = (ability: Ability): boolean =>
  ability.closeAt ? new Date(ability.closeAt) < new Date() : false

export const filterByState = (ability: Ability, state: State): boolean => {
  switch (state) {
    case "open":
      return (
        !isDeleted(ability) &&
        !isExpired(ability) &&
        ability.completed === false
      )
    case "completed":
      return (
        !isDeleted(ability) && !isExpired(ability) && ability.completed === true
      )
    case "expired":
      return !isDeleted(ability) && isExpired(ability)
    case "deleted":
      return isDeleted(ability)
    default:
      return true
  }
}

export const filterByType = (type: AbilityType, types: string[]): boolean => {
  return types.includes(type)
}

export const filterByAddress = (
  address: string,
  accounts: string[]
): boolean => {
  return accounts.includes(address)
}

export const filterAbility = (ability: Ability, filter: Filter): boolean => {
  return (
    filterByAddress(ability.address, filter.accounts) &&
    filterByState(ability, filter.state) &&
    filterByType(ability.type, filter.types)
  )
}

export const sortAbilities = (
  ability1: Ability,
  ability2: Ability,
  type: Sort
): number => {
  switch (type) {
    case "new":
      return (
        new Date(ability2.createdAt).getTime() -
        new Date(ability1.createdAt).getTime()
      )
    case "old":
      return (
        new Date(ability1.createdAt).getTime() -
        new Date(ability2.createdAt).getTime()
      )
    default:
      return 0
  }
}

export const getFilteredAbilities = (
  abilities: Ability[],
  filter: Filter
): Ability[] => {
  return abilities
    .filter((ability) => filterAbility(ability, filter))
    .sort((ability1, ability2) =>
      sortAbilities(ability1, ability2, filter.sort)
    )
}
