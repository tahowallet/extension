import { Filter, NFTCollectionCached, SortType } from "../nfts_update"

const ETH_SYMBOLS = ["ETH", "WETH"]

export type AccountData = {
  address: string
  name: string
  avatarURL: string
}

export const isEnableFilter = (id: string, filters: Filter[]): boolean => {
  return !!filters.find((filter) => id === filter.id && filter.isEnabled)
}

export const isETHPrice = (collection: NFTCollectionCached): boolean => {
  return !!ETH_SYMBOLS.includes(collection?.floorPrice?.tokenSymbol ?? "")
}

export const getAdditionalDataForFilter = (
  id: string,
  accounts: AccountData[]
): { name?: string; avatarURL?: string } => {
  const a = accounts.find(({ address }) => address === id)
  return a ? { name: a.name, avatarURL: a.avatarURL } : {}
}

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
  const dates1 = collection1.nfts.map(({ transferDate }) =>
    new Date(transferDate || "").getTime()
  )
  const dates2 = collection2.nfts.map(({ transferDate }) =>
    new Date(transferDate || "").getTime()
  )

  const transferDate1 = new Date(
    type === "new" ? Math.max(...dates1) : Math.min(...dates1)
  )
  const transferDate2 = new Date(
    type === "new" ? Math.max(...dates2) : Math.min(...dates2)
  )

  if (type === "new") {
    return transferDate1 > transferDate2 ? -1 : 1
  }

  return transferDate1 > transferDate2 ? 1 : -1
}

const sortByNFTCount = (
  collection1: NFTCollectionCached,
  collection2: NFTCollectionCached
): number =>
  (Number(collection2?.nftCount) || 0) - (Number(collection1?.nftCount) || 0)

export const sortNFTS = (
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
