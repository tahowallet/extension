import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."

const selectAbilities = (state: RootState) => state.abilities

export const selectActiveAbilities = createSelector(
  selectAbilities,
  (abilities) =>
    Object.values(abilities).filter((ability) => ability.completed === false)
)

export const selectAbilityCount = createSelector(
  selectActiveAbilities,
  (abilities) => abilities.length
)
