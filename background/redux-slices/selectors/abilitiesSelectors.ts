import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { filterAbility, getFilteredAbilities } from "../utils/abilities-utils"

const selectAbilities = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.abilities
)

export const selectDescriptionHidden = createSelector(
  (state: RootState) => state.abilities.hideDescription,
  (hideDescription) => hideDescription
)

/* Filtering selectors */
const selectAbilityFilter = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.filter
)

export const selectAbilityFilterState = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.filter.state
)

export const selectAbilityFilterSort = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.filter.sort
)

export const selectAbilityFilterTypes = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.filter.types
)

export const selectAbilityFilterAccounts = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.filter.accounts
)

/* Items selectors */
const selectAllAbilities = createSelector(selectAbilities, (abilities) => {
  return Object.values(abilities).flatMap((addressAbilities) =>
    Object.values(addressAbilities)
  )
})

export const selectFilteredAbilities = createSelector(
  selectAbilityFilter,
  selectAllAbilities,
  (filter, abilities) => getFilteredAbilities(abilities, filter)
)

/* Counting selectors  */
export const selectOpenAbilityCount = createSelector(
  selectAbilityFilter,
  selectAllAbilities,
  (filter, abilities) =>
    abilities.filter((ability) =>
      filterAbility(ability, { ...filter, state: "open" })
    ).length
)
