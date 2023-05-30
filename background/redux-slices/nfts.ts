import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { AddressOnNetwork } from "../accounts"
import { fromFixedPointNumber } from "../lib/fixed-point"
import { normalizeEVMAddress } from "../lib/utils"
import { NFT, NFTCollection, TransferredNFT } from "../nfts"
import { createBackgroundAsyncThunk } from "./utils"

export type NFTCached = {
  chainID: string
  rarityRank: number | null
} & Omit<NFT, "network" | "rarity">

export type NFTCollectionCached = {
  floorPrice?: {
    value: number
    tokenSymbol: string
  }
  nfts: NFTCached[]
  hasNextPage: boolean
  chainID: string
} & Omit<NFTCollection, "floorPrice" | "network">

export type NFTsState = {
  [chainID: string]: {
    [address: string]: {
      [collectionID: string]: NFTCollectionCached
    }
  }
}

export type NFTWithCollection = {
  collection: NFTCollectionCached
  nft: NFTCached
}

export type Filter = {
  id: string
  name: string
  isEnabled: boolean
  thumbnailURL?: string
  /* Only for the collection filter */
  owners?: string[]
}

export type SortType = "asc" | "desc" | "new" | "old" | "number"

export type FiltersState = {
  collections: Filter[]
  accounts: Filter[]
  type: SortType
}

export type NFTsSliceState = {
  isReloading: boolean
  nfts: NFTsState
  filters: FiltersState
}

export type Events = {
  fetchNFTs: { collectionID: string; account: AddressOnNetwork }
  refetchNFTs: { collectionID: string; account: AddressOnNetwork }
  fetchMoreNFTs: { collectionID: string; account: AddressOnNetwork }
  refetchCollections: never
}

export const emitter = new Emittery<Events>()

export function updateCollection(
  acc: NFTsSliceState,
  collection: NFTCollection
): void {
  const {
    id,
    name,
    nftCount,
    totalNftCount,
    network,
    owner,
    floorPrice,
    hasBadges,
    thumbnailURL,
  } = collection
  const { chainID } = network
  const ownerAddress = normalizeEVMAddress(owner)
  acc.nfts[chainID] ??= {}
  acc.nfts[chainID][ownerAddress] ??= {}
  const savedCollection = acc.nfts[chainID][ownerAddress][collection.id] ?? {}

  acc.nfts[chainID][ownerAddress][collection.id] = {
    id,
    name,
    nftCount: nftCount ?? savedCollection.nftCount ?? 0, // POAPs has no nftCount until the NFTs are loaded, let's fallback to old number
    totalNftCount,
    nfts: savedCollection.nfts ?? [],
    hasBadges: savedCollection.hasBadges || hasBadges, // once we know it has badges it should stay like that
    chainID,
    owner: ownerAddress,
    thumbnailURL,
    hasNextPage: false,
    floorPrice: floorPrice && {
      value: fromFixedPointNumber(
        { amount: floorPrice.value, decimals: floorPrice.token.decimals },
        4
      ),
      tokenSymbol: floorPrice.token.symbol,
    },
  }
}

export function updateFilter(
  acc: NFTsSliceState,
  collection: NFTCollection,
  type: "accounts" | "collections"
): void {
  const { id, name, thumbnailURL, owner } = collection

  const existingFilterId = acc.filters[type].findIndex(
    (obj) => obj.id === (type === "accounts" ? owner : id)
  )
  const filter =
    type === "accounts"
      ? { id: owner, name: owner }
      : {
          id,
          name,
          thumbnailURL,
        }

  if (existingFilterId >= 0) {
    acc.filters[type][existingFilterId] = {
      ...acc.filters[type][existingFilterId],
      ...filter,
    }
    if (type === "collections") {
      const owners = acc.filters[type][existingFilterId].owners ?? []
      if (!owners.includes(owner)) {
        acc.filters[type][existingFilterId].owners = [...owners, owner]
      }
    }
  } else {
    acc.filters[type].push({
      ...filter,
      isEnabled: true,
      ...(type === "collections" && { owners: [owner] }),
    })
  }
}

export function updateFilters(
  acc: NFTsSliceState,
  collection: NFTCollection
): void {
  const { nftCount } = collection
  if ((nftCount ?? 0) > 0) {
    updateFilter(acc, collection, "collections")
  }
  updateFilter(acc, collection, "accounts")
}

export function parseNFTs(nfts: NFT[]): NFTCached[] {
  return nfts.map((nft) => {
    const { network, rarity, ...cached } = nft

    return {
      ...cached,
      chainID: network.chainID,
      rarityRank: rarity.rank ?? null,
    }
  })
}

const NFTsSlice = createSlice({
  name: "nfts",
  initialState: {
    isReloading: false,
    nfts: {},
    filters: { collections: [], accounts: [], type: "desc" },
  } as NFTsSliceState,
  reducers: {
    initializeNFTs: (
      immerState,
      {
        payload: collections,
      }: {
        payload: NFTCollection[]
      }
    ) => {
      const state: NFTsSliceState = {
        isReloading: false,
        nfts: {},
        filters: { collections: [], accounts: [], type: "desc" },
      }
      collections.forEach((collection) => {
        updateCollection(state, collection)
        updateFilters(state, collection)
      })
      return state
    },
    updateNFTsCollections: (
      immerState,
      { payload: collections }: { payload: NFTCollection[] }
    ) => {
      collections.forEach((collection) => {
        updateCollection(immerState, collection)
        updateFilters(immerState, collection)
      })
    },
    updateNFTs: (
      immerState,
      {
        payload,
      }: {
        payload: {
          account: AddressOnNetwork
          collectionID: string
          nfts: NFT[]
          hasNextPage: boolean
        }
      }
    ) => {
      const {
        account: { network, address },
        collectionID,
        nfts,
        hasNextPage,
      } = payload

      const collectionToUpdate =
        immerState.nfts[network.chainID][normalizeEVMAddress(address)][
          collectionID
        ]

      collectionToUpdate.nfts = parseNFTs(nfts)
      collectionToUpdate.hasNextPage = hasNextPage
    },
    updateIsReloading: (
      immerState,
      { payload: isReloading }: { payload: boolean }
    ) => {
      immerState.isReloading = isReloading
    },
    deleteNFTsForAddress: (
      immerState,
      {
        payload: address,
      }: {
        payload: string
      }
    ) => {
      const normalizedAddress = normalizeEVMAddress(address)

      immerState.filters.accounts = immerState.filters.accounts.filter(
        ({ id }) => id !== address
      )
      immerState.filters.collections = immerState.filters.collections.flatMap(
        (collection) => {
          if (collection.owners?.includes(address)) {
            return collection.owners.length === 1
              ? []
              : {
                  ...collection,
                  owners: collection.owners.filter(
                    (owner) => owner !== address
                  ),
                }
          }

          return collection
        }
      )

      Object.keys(immerState.nfts).forEach((chainID) => {
        delete immerState.nfts[chainID][normalizedAddress]
      })
    },
    deleteTransferredNFTs: (
      immerState,
      { payload: transfers }: { payload: TransferredNFT[] }
    ) => {
      transfers.forEach(
        ({ id: nftID, chainID, from: address, collectionID }) => {
          if (!address || !collectionID) return

          const normalizedAddress = normalizeEVMAddress(address)
          const collection =
            immerState.nfts[chainID]?.[normalizedAddress]?.[collectionID]

          if (collection) {
            const hasLastNFT = (collection.nftCount ?? 0) <= 1
            const hasCachedTransferredNFT = collection.nfts.some(
              (nft) => nft.id === nftID
            )

            // let's update NFT count manually in case of multiple transfers from the same collection
            collection.nftCount = (collection.nftCount ?? 1) - 1

            if (hasCachedTransferredNFT || hasLastNFT) {
              if (collection.nfts.length === 1 || hasLastNFT) {
                // this is last cached NFT or we know it was the last one owned then remove it from Redux cache
                immerState.filters.collections =
                  immerState.filters.collections.filter(
                    ({ id }) => id !== collectionID
                  )
                delete immerState.nfts[chainID][normalizedAddress][collectionID]
              } else {
                // there are more NFTs owned in this collection, let's just remove transferred one
                collection.nfts = collection.nfts.filter(
                  (nft) => nft.id !== nftID
                )
              }
            }
          }
        }
      )
    },
    cleanCachedNFTs: (immerState) => {
      Object.keys(immerState.nfts).forEach((chainID) =>
        Object.keys(immerState.nfts[chainID]).forEach((address) =>
          Object.keys(immerState.nfts[chainID][address]).forEach(
            (collectionID) => {
              const collection = immerState.nfts[chainID][address][collectionID]

              // TODO: as badges are always expanded they are not updating on intersection
              // Figure out a way for badges to follow the same rules as regular nfts
              if (!collection.hasBadges) {
                const reducedList = collection.nfts.slice(0, 2) // leave 2 nfts to avoid unnecessary updates
                collection.nfts = reducedList
              }
            }
          )
        )
      )
    },
    updateCollectionFilter: (
      immerState,
      { payload: filter }: { payload: Filter }
    ) => {
      const idx = immerState.filters.collections.findIndex(
        ({ id }) => id === filter.id
      )
      immerState.filters.collections[idx] = filter
    },
    updateAccountFilter: (
      immerState,
      { payload: filter }: { payload: Filter }
    ) => {
      const idx = immerState.filters.accounts.findIndex(
        ({ id }) => id === filter.id
      )
      immerState.filters.accounts[idx] = filter
    },
    updateSortType: (immerState, { payload: type }: { payload: SortType }) => {
      immerState.filters.type = type
    },
  },
})

export const {
  initializeNFTs,
  updateNFTsCollections,
  updateNFTs,
  updateIsReloading,
  deleteNFTsForAddress,
  deleteTransferredNFTs,
  cleanCachedNFTs,
  updateCollectionFilter,
  updateAccountFilter,
  updateSortType,
} = NFTsSlice.actions
export default NFTsSlice.reducer

export const fetchNFTsFromCollection = createBackgroundAsyncThunk(
  "nfts/fetchNFTsFromCollection",
  async (payload: { collectionID: string; account: AddressOnNetwork }) => {
    await emitter.emit("fetchNFTs", payload)
  }
)

export const refetchNFTsFromCollection = createBackgroundAsyncThunk(
  "nfts/refetchNFTsFromCollection",
  async (payload: { collectionID: string; account: AddressOnNetwork }) => {
    await emitter.emit("refetchNFTs", payload)
  }
)

export const fetchMoreNFTsFromCollection = createBackgroundAsyncThunk(
  "nfts/fetchMoreNFTsFromCollection",
  async (payload: { collectionID: string; account: AddressOnNetwork }) => {
    await emitter.emit("fetchMoreNFTs", payload)
  }
)

export const refetchCollections = createBackgroundAsyncThunk(
  "nfts/refetchCollections",
  async () => {
    await emitter.emit("refetchCollections")
  }
)
