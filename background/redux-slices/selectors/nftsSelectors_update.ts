import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { normalizeEVMAddress } from "../../lib/utils"
import { selectCurrentAccount } from "./uiSelectors"

const selectNFTs = createSelector(
  (state: RootState) => state.nftsUpdate,
  (slice) => slice.nfts
)

/* Filtering selectors */

export const selectNFTFilters = createSelector(
  (state: RootState) => state.nftsUpdate,
  (nftsSlice) => nftsSlice.filters
)

export const selectCurrentAccountNFTs = createSelector(
  selectNFTs,
  selectCurrentAccount,
  (nfts, account) => {
    return Object.values(
      nfts[account.network.chainID]?.[normalizeEVMAddress(account.address)] ??
        {}
    )
  }
)

/* Items selectors */
export const selectAllCollections = createSelector(selectNFTs, (nfts) => {
  return Object.values(nfts).flatMap((byAddress) =>
    Object.values(byAddress).flatMap((byCollection) =>
      Object.values(byCollection)
    )
  )
})
export const selectNFTCollections = createSelector(
  selectAllCollections,
  (collections) => collections.filter((collection) => !collection.hasBadges)
)

export const selectNFTBadgesCollections = createSelector(
  selectAllCollections,
  (collections) => collections.filter((collection) => collection.hasBadges)
)

/* Counting selectors  */
export const selectNFTsCount = createSelector(
  selectNFTCollections,
  (collections) => {
    return collections.reduce(
      (sum, collection) => sum + (collection.nftCount ?? 0),
      0
    )
  }
)

export const selectNFTBadgesCount = createSelector(
  selectNFTBadgesCollections,
  (collections) => {
    return collections.reduce(
      (sum, collection) => sum + (collection.nftCount ?? 0),
      0
    )
  }
)

export const selectNFTCollectionsCount = createSelector(
  selectNFTCollections,
  (collections) => collections.length
)

export const selectTotalFloorPrice = createSelector(
  selectNFTs,
  () => "00.00" // TODO
)
