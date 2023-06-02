import { BUILT_IN_NETWORK_BASE_ASSETS } from "../../constants"
import { AssetsState, selectAssetPricePoint } from "../assets"
import {
  Filter,
  FiltersState,
  NFTCached,
  NFTCollectionCached,
  SortType,
} from "../nfts"
import { AccountTotal } from "../selectors/accountsSelectors"
import { enrichAssetAmountWithMainCurrencyValues } from "./asset-utils"

const ETH_SYMBOLS = ["ETH", "WETH"]

type NFTCollectionEnriched = NFTCollectionCached & {
  floorPrice?: {
    value: number
    valueUSD?: number
    tokenSymbol: string
  }
}

const isEnabledFilter = (id: string, filters: Filter[]): boolean =>
  filters.some((filter) => id === filter.id && filter.isEnabled)

const isETHPrice = (collection: NFTCollectionCached): boolean =>
  ETH_SYMBOLS.includes(collection?.floorPrice?.tokenSymbol ?? "")

export const getAdditionalDataForFilter = (
  id: string,
  accounts: AccountTotal[]
): { name?: string; thumbnailURL?: string } => {
  const a = accounts.find(({ address }) => address === id)
  return a ? { name: a.name ?? a.address, thumbnailURL: a.avatarURL } : {}
}

/* Items are sorted by price in USD. All other elements are added at the end. */
export const sortByPrice = (
  type: "asc" | "desc",
  collection1: NFTCollectionEnriched,
  collection2: NFTCollectionEnriched
): number => {
  if (collection1.floorPrice?.valueUSD === undefined) return 1
  if (collection2.floorPrice?.valueUSD === undefined) return -1

  if (type === "asc") {
    return collection1.floorPrice.valueUSD - collection2.floorPrice.valueUSD
  }
  return collection2.floorPrice.valueUSD - collection1.floorPrice.valueUSD
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

const sortNFTsByDate = (
  type: "new" | "old",
  nfts: NFTCached[]
): NFTCached[] => {
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

export function enrichCollectionWithUSDFloorPrice(
  collection: NFTCollectionCached,
  assets: AssetsState,
  mainCurrencySymbol: string
): NFTCollectionEnriched {
  if (!collection.floorPrice) return collection

  const { tokenSymbol, value } = collection.floorPrice
  const symbol = isETHPrice(collection) ? "ETH" : tokenSymbol

  const baseAsset = BUILT_IN_NETWORK_BASE_ASSETS.find(
    (asset) => symbol === asset.symbol
  )

  if (!baseAsset) return collection

  const pricePoint = selectAssetPricePoint(
    assets,
    baseAsset,
    mainCurrencySymbol
  )

  const valueUSD =
    enrichAssetAmountWithMainCurrencyValues(
      {
        asset: baseAsset,
        amount: BigInt(Math.round(value * 10 ** baseAsset.decimals)),
      },
      pricePoint,
      2
    ).mainCurrencyAmount ?? 0

  return {
    ...collection,
    floorPrice: {
      value,
      valueUSD,
      tokenSymbol,
    },
  }
}

export const getFilteredCollections = (
  collections: NFTCollectionCached[],
  filters: FiltersState,
  assets: AssetsState,
  mainCurrencySymbol: string
): NFTCollectionCached[] => {
  const applyPriceSort = filters.type === "asc" || filters.type === "desc"

  return collections
    .filter(
      (collection) =>
        isEnabledFilter(collection.id, filters.collections) &&
        isEnabledFilter(collection.owner, filters.accounts)
    )
    .map((collection) => {
      const collectionWithSortedNFTs = sortNFTs(collection, filters.type)

      return applyPriceSort
        ? enrichCollectionWithUSDFloorPrice(
            collectionWithSortedNFTs,
            assets,
            mainCurrencySymbol
          )
        : collectionWithSortedNFTs
    })
    .sort((collection1, collection2) =>
      sortCollections(collection1, collection2, filters.type)
    )
}
