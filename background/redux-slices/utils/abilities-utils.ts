import { Ability, AbilityType } from "../../abilities"
import { Filter, State } from "../abilities"

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
