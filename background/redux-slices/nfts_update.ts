import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { AddressOnNetwork } from "../accounts"
import { fromFixedPointNumber } from "../lib/fixed-point"
import { normalizeEVMAddress } from "../lib/utils"
import { NFT, NFTCollection, TransferredNFT } from "../nfts"
import { createBackgroundAsyncThunk } from "./utils"

export type NFTCollectionCached = {
  floorPrice?: {
    value: number
    tokenSymbol: string
  }
  nfts: NFT[]
  hasNextPage: boolean
} & Omit<NFTCollection, "floorPrice">

export type NFTsState = {
  [chainID: string]: {
    [address: string]: {
      [collectionID: string]: NFTCollectionCached
    }
  }
}

export type NFTWithCollection = {
  collection: NFTCollectionCached
  nft: NFT
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
  fetchMoreNFTs: { collectionID: string; account: AddressOnNetwork }
  refetchCollections: never
}

export const emitter = new Emittery<Events>()

function updateCollection(
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
    network,
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

function updateFilter(
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

function updateFilters(acc: NFTsSliceState, collection: NFTCollection): void {
  const { nftCount } = collection
  if ((nftCount ?? 0) > 0) {
    updateFilter(acc, collection, "collections")
  }
  updateFilter(acc, collection, "accounts")
}

function initializeCollections(collections: NFTCollection[]): NFTsSliceState {
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
}

const NFTsSlice = createSlice({
  name: "nftsUpdate",
  initialState: {
    isReloading: false,
    nfts: {},
    filters: { collections: [], accounts: [], type: "desc" },
  } as NFTsSliceState,
  reducers: {
    initializeNFTs: (
      immerState,
      {
        payload,
      }: {
        payload: NFTCollection[]
      }
    ) => initializeCollections(payload),
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

      collectionToUpdate.nfts = nfts
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

      Object.keys(immerState.nfts).forEach((chainID) => {
        delete immerState.nfts[chainID][normalizedAddress]
      })
    },
    deleteTransferredNFTs: (
      immerState,
      { payload: transferredNFTs }: { payload: TransferredNFT[] }
    ) => {
      transferredNFTs.forEach(({ id: nftID, chainID, address }) => {
        const normalizedAddress = normalizeEVMAddress(address)
        Object.keys(immerState.nfts[chainID][normalizedAddress] ?? {}).forEach(
          (collectionID) => {
            const collection =
              immerState.nfts[chainID]?.[normalizedAddress]?.[collectionID]

            if (collection) {
              const hasTransferredNFT = collection.nfts.some(
                (nft) => nft.id === nftID
              )

              if (hasTransferredNFT) {
                if (collection.nfts.length === 1) {
                  delete immerState.nfts[chainID][normalizedAddress][
                    collectionID
                  ]
                } else {
                  collection.nfts = collection.nfts.filter(
                    (nft) => nft.id !== nftID
                  )
                }
              }
            }
          }
        )
      })
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
