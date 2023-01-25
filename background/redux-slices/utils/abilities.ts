import { Ability, AbilityType } from "../../abilities"
import { AbilityFilter, AbilityState, Filter } from "../abilities"

const showRemovedAbility = (ability: Ability, state: AbilityState): boolean => {
  return state === "deleted" && ability.removedFromUi
}

const filterByState = (ability: Ability, state: AbilityState): boolean => {
  switch (state) {
    case "open":
      return ability.completed === false
    case "closed":
      return ability.completed === true
    default:
      return true
  }
}

const filterByType = (type: AbilityType, types: Filter[]): boolean => {
  return !!types.find((filter) => filter.type === type)?.isEnabled
}

// eslint-disable-next-line import/prefer-default-export
export const filterAbility = (
  ability: Ability,
  filters: AbilityFilter
): boolean => {
  return (
    (showRemovedAbility(ability, filters.state) ||
      filterByState(ability, filters.state)) &&
    filterByType(ability.type, filters.types)
  )
}
