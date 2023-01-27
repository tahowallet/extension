import { Ability, AbilityType } from "../../abilities"
import { AbilityFilter, State, Type } from "../abilities"
import { Account } from "./account-filter-utils"

export const filterByState = (ability: Ability, state: State): boolean => {
  switch (state) {
    case "open":
      return ability.completed === false && !ability.removedFromUi
    case "completed":
      return ability.completed === true && !ability.removedFromUi
    case "expired":
      return (
        (ability.closeAt ? new Date(ability.closeAt) < new Date() : false) &&
        !ability.removedFromUi
      )
    case "deleted":
      return ability.removedFromUi
    default:
      return true
  }
}

export const filterByType = (type: AbilityType, types: Type[]): boolean => {
  return !!types.find((filter) => filter.type === type)?.isEnabled
}

export const filterByAddress = (
  address: string,
  accounts: Account[]
): boolean => {
  return !!accounts.find((filter) => filter.id === address)?.isEnabled
}

export const filterAbility = (
  ability: Ability,
  filters: AbilityFilter
): boolean => {
  return (
    filterByAddress(ability.address, filters.accounts) &&
    filterByState(ability, filters.state) &&
    filterByType(ability.type, filters.types)
  )
}
