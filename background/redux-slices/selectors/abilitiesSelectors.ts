import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { Ability } from "../../abilities"
import { filterAbility } from "../utils/abilities-utils"
import {
  AccountData,
  getEnrichedAccountFilter,
} from "../utils/account-filter-utils"
import { selectAccountTotals } from "./accountsSelectors"

const selectAbilities = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.abilities
)

export const selectDescriptionHidden = createSelector(
  (state: RootState) => state.abilities.hideDescription,
  (hideDescription) => hideDescription
)

/* Filtering selectors */
const selectAbilityFilters = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.filters
)

export const selectEnrichedAbilityFilters = createSelector(
  selectAbilityFilters,
  selectAccountTotals,
  (filters, accountTotals) => {
    const accounts = getEnrichedAccountFilter(
      filters.accounts,
      accountTotals as AccountData[]
    )
    return { ...filters, accounts }
  }
)

/* Items selectors */
export const selectFilteredAbilities = createSelector(
  selectAbilityFilters,
  selectAbilities,
  (filters, abilities) => {
    const activeAbilities: Ability[] = []
    Object.values(abilities).forEach((addressAbilities) => {
      activeAbilities.push(
        ...Object.values(addressAbilities).filter((ability) =>
          filterAbility(ability, filters)
        )
      )
    })
    return activeAbilities
  }
)

/* Counting selectors  */
export const selectAbilityCount = createSelector(
  selectFilteredAbilities,
  (abilities) => abilities.length
)
