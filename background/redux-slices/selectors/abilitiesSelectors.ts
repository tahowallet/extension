import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { Ability } from "../../abilities"
import { FilterAccount } from "../abilities"
import { filterAbility } from "../utils/abilities"
import { AccountData, getAdditionalDataForFilter } from "../utils/nfts-utils"
import { selectAccountTotals } from "./accountsSelectors"

const selectAbilities = createSelector(
  (state: RootState) => state.abilities,
  (abilitiesSlice) => abilitiesSlice.abilities
)

export const selectHideDescription = createSelector(
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
    const accounts = filters.accounts.reduce<FilterAccount[]>((acc, filter) => {
      const additionalData = getAdditionalDataForFilter(
        filter.address,
        accountTotals as AccountData[]
      )
      if (Object.keys(additionalData).length > 0) {
        return [
          ...acc,
          {
            ...filter,
            ...additionalData,
          },
        ]
      }
      return [...acc]
    }, [])

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
