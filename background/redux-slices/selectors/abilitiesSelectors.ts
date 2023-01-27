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
const selectAbilityFilter = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.filter
)

export const selectEnrichedAbilityFilter = createSelector(
  selectAbilityFilter,
  selectAccountTotals,
  (filter, accountTotals) => {
    const accounts = getEnrichedAccountFilter(
      filter.accounts,
      accountTotals as AccountData[]
    )
    return { ...filter, accounts }
  }
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
          filterAbility(ability, filter)
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
