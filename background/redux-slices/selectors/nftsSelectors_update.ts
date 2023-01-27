import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { normalizeEVMAddress } from "../../lib/utils"
import { Filter } from "../nfts_update"
import {
  AccountData,
  getAdditionalDataForFilter,
  getFilteredCollections,
  getNFTsCount,
  getTotalFloorPrice,
} from "../utils/nfts-utils"
import { getAssetsState, selectAccountTotals } from "./accountsSelectors"
import { selectCurrentAccount, selectMainCurrencySymbol } from "./uiSelectors"

const selectNFTs = createSelector(
  (state: RootState) => state.nftsUpdate,
  (slice) => slice.nfts
)

export const selectIsReloadingNFTs = createSelector(
  (state: RootState) => state.nftsUpdate,
  (slice) => slice.isReloading
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

/* Filtering selectors */
const selectNFTFilters = createSelector(
  (state: RootState) => state.nftsUpdate,
  (nftsSlice) => nftsSlice.filters
)

export const selectEnrichedNFTFilters = createSelector(
  selectNFTFilters,
  selectAccountTotals,
  (filters, accountTotals) => {
    const accounts = filters.accounts.reduce<Filter[]>((acc, filter) => {
      const additionalData = getAdditionalDataForFilter(
        filter.id,
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

    const collections = filters.collections
      .filter(({ owners }) => {
        const enablingAccount = (owners ?? []).find((owner) =>
          accounts.find((account) => account.id === owner && account.isEnabled)
        )
        return !!enablingAccount
      })
      .sort((collection1, collection2) =>
        collection1.name.localeCompare(collection2.name)
      )
    return { ...filters, collections, accounts }
  }
)

/* Items selectors */
const selectAllCollections = createSelector(selectNFTs, (nfts) => {
  return Object.values(nfts).flatMap((byAddress) =>
    Object.values(byAddress).flatMap((byCollection) =>
      Object.values(byCollection)
    )
  )
})

const selectAllNFTCollections = createSelector(
  selectAllCollections,
  (collections) => collections.filter((collection) => !collection.hasBadges)
)

const selectAllNFTBadgesCollections = createSelector(
  selectAllCollections,
  (collections) => collections.filter((collection) => collection.hasBadges)
)

export const selectFilteredNFTCollections = createSelector(
  selectAllNFTCollections,
  selectNFTFilters,
  getAssetsState,
  selectMainCurrencySymbol,
  (collections, filters, assets, mainCurrencySymbol) =>
    getFilteredCollections(collections, filters, assets, mainCurrencySymbol)
)

export const selectFilteredNFTBadgesCollections = createSelector(
  selectAllNFTBadgesCollections,
  selectNFTFilters,
  getAssetsState,
  selectMainCurrencySymbol,
  (collections, filters, assets, mainCurrencySymbol) =>
    getFilteredCollections(collections, filters, assets, mainCurrencySymbol)
)

/* Counting selectors  */
export const selectCurrentAccountNFTsCount = createSelector(
  selectCurrentAccountNFTs,
  (collections) => getNFTsCount(collections)
)

export const selectAllNFTsCount = createSelector(
  selectAllNFTCollections,
  (collections) => getNFTsCount(collections)
)

export const selectAllNFTBadgesCount = createSelector(
  selectAllNFTBadgesCollections,
  (collections) => getNFTsCount(collections)
)

export const selectFilteredNFTsCount = createSelector(
  selectFilteredNFTCollections,
  (collections) => getNFTsCount(collections)
)

export const selectFilteredNFTBadgesCount = createSelector(
  selectFilteredNFTBadgesCollections,
  (collections) => getNFTsCount(collections)
)

export const selectFilteredNFTCollectionsCount = createSelector(
  selectFilteredNFTCollections,
  (collections) => collections.length
)

/* Total Floor Price selectors  */
export const selectFilteredTotalFloorPrice = createSelector(
  selectFilteredNFTCollections,
  (collections) => getTotalFloorPrice(collections)
)
