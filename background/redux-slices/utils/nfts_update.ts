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
): { name?: string; thumbnailURL?: string } => {
  const a = accounts.find(({ address }) => address === id)
  return a ? { name: a.name, thumbnailURL: a.avatarURL } : {}
}

export const sortNFTS = (
  collection1: NFTCollectionCached,
  collection2: NFTCollectionCached,
  type: SortType
): number => {
  switch (type) {
    case "asc": {
      if (
        collection1.floorPrice &&
        isETHPrice(collection1) &&
        collection2.floorPrice &&
        isETHPrice(collection2)
      ) {
        return (
          (Number(collection1?.floorPrice?.value) || 0) -
          (Number(collection2?.floorPrice?.value) || 0)
        )
      }
      return 1
    }
    case "desc": {
      if (
        collection1.floorPrice &&
        isETHPrice(collection1) &&
        collection2.floorPrice &&
        isETHPrice(collection2)
      ) {
        return (
          (Number(collection2?.floorPrice?.value) || 0) -
          (Number(collection1?.floorPrice?.value) || 0)
        )
      }
      return 1
    }
    case "new": {
      const transferDate1 = new Date(
        Math.max(
          ...collection1.nfts.map(({ transferDate }) =>
            new Date(transferDate || "").getTime()
          )
        )
      )
      const transferDate2 = new Date(
        Math.max(
          ...collection2.nfts.map(({ transferDate }) =>
            new Date(transferDate || "").getTime()
          )
        )
      )
      return transferDate1 > transferDate2 ? -1 : 1
    }
    case "old": {
      const transferDate1 = new Date(
        Math.min(
          ...collection1.nfts.map(({ transferDate }) =>
            new Date(transferDate || "").getTime()
          )
        )
      )
      const transferDate2 = new Date(
        Math.min(
          ...collection2.nfts.map(({ transferDate }) =>
            new Date(transferDate || "").getTime()
          )
        )
      )
      return transferDate1 > transferDate2 ? 1 : -1
    }
    case "number":
      return (
        (Number(collection2?.nftCount) || 0) -
        (Number(collection1?.nftCount) || 0)
      )
    default:
      return 0
  }
}
