import { createSelector } from "@reduxjs/toolkit"
import { normalizeHexAddress } from "@tallyho/hd-keyring"
import { RootState } from ".."
import { selectCurrentAddressNetwork } from "./uiSelectors"

const selectAbilities = (state: RootState) => state.abilities

export const selectAccountAbilities = createSelector(
  selectCurrentAddressNetwork,
  selectAbilities,
  ({ address }, abilities) =>
    Object.values(abilities).filter(
      (ability) =>
        normalizeHexAddress(ability.address) === normalizeHexAddress(address)
    )
)

export const selectAbilityCount = createSelector(
  selectAccountAbilities,
  (abilities) => abilities.length
)
