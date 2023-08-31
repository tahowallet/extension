import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { Ability } from "../../abilities"
import { filterAbility } from "../utils/abilities-utils"

const selectAbilities = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.abilities,
)

export const selectDescriptionHidden = createSelector(
  (state: RootState) => state.abilities.hideDescription,
  (hideDescription) => hideDescription,
)

/* Filtering selectors */
const selectAbilityFilter = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.filter,
)

export const selectAbilityFilterState = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.filter.state,
)

export const selectAbilityFilterTypes = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.filter.types,
)

export const selectAbilityFilterAccounts = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.filter.accounts,
)

/* Items selectors */
export const selectFilteredAbilities = createSelector(
  selectAbilityFilter,
  selectAbilities,
  (filter, abilities) => {
    const activeAbilities: Ability[] = []
    Object.values(abilities).forEach((addressAbilities) => {
      activeAbilities.push(
        ...Object.values(addressAbilities).filter((ability) =>
          filterAbility(ability, filter),
        ),
      )
    })
    return activeAbilities
  },
)

/* Counting selectors  */
export const selectOpenAbilityCount = createSelector(
  selectAbilityFilter,
  selectAbilities,
  (filter, abilities) =>
    Object.values(abilities)
      .flatMap((address) => Object.values(address))
      .filter((ability) => filterAbility(ability, { ...filter, state: "open" }))
      .length,
)
