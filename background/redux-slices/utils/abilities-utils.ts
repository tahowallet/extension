import { Ability, AbilityType } from "../../abilities"
import { Filter, State } from "../abilities"

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
