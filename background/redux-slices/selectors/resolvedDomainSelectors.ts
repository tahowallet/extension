import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."

const selectResolvedDomainAddress = createSelector(
  (state: RootState) => state.resolvedDomainAddress,
  (resolvedDomainAddress) => resolvedDomainAddress
)

export default selectResolvedDomainAddress
