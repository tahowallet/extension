import { Ability } from "../../services/abilities"
import { AbilityState } from "../abilities"

// eslint-disable-next-line import/prefer-default-export
export const filterByState = (
  ability: Ability,
  state: AbilityState
): boolean => {
  switch (state) {
    case "open":
      return ability.completed === false
    case "closed":
      return ability.completed === true
    default:
      return true
  }
}
