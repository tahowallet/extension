import { NFT } from "../../nfts"
import {
  Filter,
  FiltersState,
  NFTCollectionCached,
  SortType,
} from "../nfts_update"

const ETH_SYMBOLS = ["ETH", "WETH"]

export type AccountData = {
  address: string
  name: string
  avatarURL: string
}

const isEnabledFilter = (id: string, filters: Filter[]): boolean => {
  return !!filters.find((filter) => id === filter.id && filter.isEnabled)
}

const isETHPrice = (collection: NFTCollectionCached): boolean => {
  return !!ETH_SYMBOLS.includes(collection?.floorPrice?.tokenSymbol ?? "")
}

export const getAdditionalDataForFilter = (
  id: string,
  accounts: AccountData[]
): { name?: string; thumbnailURL?: string } => {
  const a = accounts.find(({ address }) => address === id)
  return a ? { name: a.name, thumbnailURL: a.avatarURL } : {}
}

/* Items are sorted by price in ETH. All other elements are added at the end. */
const sortByPrice = (
  type: "asc" | "desc",
  collection1: NFTCollectionCached,
  collection2: NFTCollectionCached
): number => {
  if (collection1.floorPrice && collection2.floorPrice) {
    if (isETHPrice(collection1) && isETHPrice(collection2)) {
      if (type === "asc") {
        return collection1.floorPrice.value - collection2.floorPrice.value
      }
      return collection2.floorPrice.value - collection1.floorPrice.value
    }
  }
  if (collection1.floorPrice === undefined) return 1
  if (collection2.floorPrice === undefined) return -1

  return 1
}

const sortByDate = (
  type: "new" | "old",
  collection1: NFTCollectionCached,
  collection2: NFTCollectionCached
): number => {
  // NFTs are already sorted with current sort type
  const transferDate1 = new Date(
    collection1.nfts[0]?.transferDate ?? ""
  ).getTime()
  const transferDate2 = new Date(
    collection2.nfts[0]?.transferDate ?? ""
  ).getTime()

  if (type === "new") {
    return transferDate1 > transferDate2 ? -1 : 1
  }

  return transferDate1 > transferDate2 ? 1 : -1
}

const sortNFTsByDate = (type: "new" | "old", nfts: NFT[]): NFT[] => {
  const sorted = nfts.sort(
    (nft1, nft2) =>
      new Date(nft2.transferDate ?? "").getTime() -
      new Date(nft1.transferDate ?? "").getTime()
  )

  return type === "new" ? sorted : sorted.reverse()
}

const sortByNFTCount = (
  collection1: NFTCollectionCached,
  collection2: NFTCollectionCached
): number =>
  (Number(collection2?.nftCount) || 0) - (Number(collection1?.nftCount) || 0)

export const sortCollections = (
  collection1: NFTCollectionCached,
  collection2: NFTCollectionCached,
  type: SortType
): number => {
  switch (type) {
    case "asc":
      return sortByPrice("asc", collection1, collection2)
    case "desc":
      return sortByPrice("desc", collection1, collection2)
    case "new":
      return sortByDate("new", collection1, collection2)
    case "old":
      return sortByDate("old", collection1, collection2)
    case "number":
      return sortByNFTCount(collection1, collection2)
    default:
      return 0
  }
}

const sortNFTs = (
  collection: NFTCollectionCached,
  type: SortType
): NFTCollectionCached => {
  switch (type) {
    case "new":
      return {
        ...collection,
        nfts: sortNFTsByDate("new", collection.nfts),
      }
    case "old":
      return {
        ...collection,
        nfts: sortNFTsByDate("old", collection.nfts),
      }
    default:
      return collection
  }
}

type TotalFloorPriceMap = { [symbol: string]: number }

export const getTotalFloorPrice = (
  collections: NFTCollectionCached[]
): TotalFloorPriceMap =>
  collections.reduce(
    (acc, collection) => {
      if (!collection.floorPrice) return acc

      const sum = collection.floorPrice.value * (collection.nftCount ?? 0)

      if (isETHPrice(collection)) {
        acc.ETH += sum
      } else {
        acc[collection.floorPrice.tokenSymbol] ??= 0
        acc[collection.floorPrice.tokenSymbol] += sum
      }

      return acc
    },
    { ETH: 0 } as TotalFloorPriceMap
  )

export const getNFTsCount = (collections: NFTCollectionCached[]): number =>
  collections.reduce((sum, collection) => sum + (collection.nftCount ?? 0), 0)

export const getFilteredCollections = (
  collections: NFTCollectionCached[],
  filters: FiltersState
): NFTCollectionCached[] =>
  collections
    .filter(
      (collection) =>
        isEnabledFilter(collection.id, filters.collections) &&
        isEnabledFilter(collection.owner, filters.accounts)
    )
    .map((collection) => sortNFTs(collection, filters.type))
    .sort((collection1, collection2) =>
      sortCollections(collection1, collection2, filters.type)
    )
