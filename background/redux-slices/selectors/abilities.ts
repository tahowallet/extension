import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { Ability } from "../../services/abilities"

const selectAbilities = (state: RootState) => state.abilities

export const selectActiveAbilities = createSelector(
  selectAbilities,
  (abilities) => {
    const activeAbilities: Ability[] = []
    Object.values(abilities).forEach((addressAbilities) => {
      activeAbilities.push(
        ...Object.values(addressAbilities).filter(
          (ability) => ability.completed === false
        )
      )
    })
    return activeAbilities
  }
)

export const selectAbilityCount = createSelector(
  selectActiveAbilities,
  (abilities) => abilities.length
)
