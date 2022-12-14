import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { normalizeEVMAddress } from "../../lib/utils"
import {
  AccountData,
  getAdditionalDataForFilter,
  isEnableFilter,
  isETHPrice,
  sortNFTS,
} from "../utils/nfts_update"
import { selectAccountTotals } from "./accountsSelectors"
import { selectCurrentAccount } from "./uiSelectors"

const selectNFTs = createSelector(
  (state: RootState) => state.nftsUpdate,
  (slice) => slice.nfts
)

export const selectIsReloadingNFTs = createSelector(
  (state: RootState) => state.nftsUpdate,
  (slice) => slice.isReloading
)

/* Filtering selectors */
const selectNFTFilters = createSelector(
  (state: RootState) => state.nftsUpdate,
  (nftsSlice) => nftsSlice.filters
)

export const selectCompletedNFTFilters = createSelector(
  selectNFTFilters,
  selectAccountTotals,
  (filters, accountTotals) => {
    const accounts = filters.accounts.map((filter) => ({
      ...filter,
      ...getAdditionalDataForFilter(filter.id, accountTotals as AccountData[]),
    }))
    return { ...filters, accounts }
  }
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
  selectNFTFilters,
  (collections, filters) =>
    collections
      .filter(
        (collection) =>
          isEnableFilter(collection.id, filters.collections) &&
          isEnableFilter(collection.owner, filters.accounts) &&
          !collection.hasBadges
      )
      .sort((collection1, collection2) =>
        sortNFTS(collection1, collection2, filters.type)
      )
)

export const selectNFTBadgesCollections = createSelector(
  selectAllCollections,
  selectNFTFilters,
  (collections, filters) =>
    collections
      .filter(
        (collection) =>
          isEnableFilter(collection.id, filters.collections) &&
          isEnableFilter(collection.owner, filters.accounts) &&
          collection.hasBadges
      )
      .sort((collection1, collection2) =>
        sortNFTS(collection1, collection2, filters.type)
      )
)

/* Counting selectors  */
export const selectCurrentAccountNFTsCount = createSelector(
  selectCurrentAccountNFTs,
  (collections) => {
    return collections.reduce(
      (sum, collection) => sum + (collection.nftCount ?? 0),
      0
    )
  }
)

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

export const selectAllNFTCollectionsCount = createSelector(
  selectAllCollections,
  (collections) => collections.length
)

export const selectTotalFloorPriceInETH = createSelector(
  selectAllCollections,
  (collections) => {
    return collections.reduce((sum, collection) => {
      if (collection.floorPrice && isETHPrice(collection)) {
        return sum + collection.floorPrice.value * (collection.nftCount ?? 0)
      }

      return sum
    }, 0)
  }
)
