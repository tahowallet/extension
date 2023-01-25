import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { Ability } from "../../services/abilities"

const selectAbilities = (state: RootState) => state.abilities.abilities

const selectAbilityFilter = (state: RootState) => state.abilities.filter

export const selectFilteredAbilities = createSelector(
  selectAbilityFilter,
  selectAbilities,
  (filter, abilities) => {
    const activeAbilities: Ability[] = []
    Object.values(abilities).forEach((addressAbilities) => {
      activeAbilities.push(
        ...Object.values(addressAbilities).filter((ability) => {
          if (ability.removedFromUi === true) {
            return false
          }
          if (filter === "incomplete") {
            return ability.completed === false
          }
          if (filter === "completed") {
            return ability.completed === true
          }
          return true
        })
      )
    })
    return activeAbilities
  }
)

export const selectAbilityCount = createSelector(
  selectFilteredAbilities,
  (abilities) => abilities.length
)

export const selectHideDescription = createSelector(
  (state: RootState) => state.abilities.hideDescription,
  (hideDescription) => hideDescription
)
