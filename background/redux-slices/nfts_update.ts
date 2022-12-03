import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { AddressOnNetwork } from "../accounts"
import { fromFixedPointNumber } from "../lib/fixed-point"
import { normalizeEVMAddress } from "../lib/utils"
import { NFT, NFTCollection } from "../nfts"
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

export type FiltersState = []

export type NFTsSliceState = { nfts: NFTsState; filters: FiltersState }

export type Events = {
  fetchNFTs: { collectionID: string; account: AddressOnNetwork }
  fetchMoreNFTs: { collectionID: string; account: AddressOnNetwork }
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
    thumbnail,
  } = collection
  const { chainID } = network
  const ownerAddress = normalizeEVMAddress(owner)
  acc.nfts[chainID] ??= {}
  acc.nfts[chainID][ownerAddress] ??= {}
  acc.nfts[chainID][ownerAddress][collection.id] = {
    id,
    name,
    nftCount,
    totalNftCount,
    nfts: [],
    hasBadges,
    network,
    owner: ownerAddress,
    thumbnail,
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

function initializeCollections(collections: NFTCollection[]): NFTsSliceState {
  const state: NFTsSliceState = {
    nfts: {},
    filters: [],
  }
  collections.forEach((collection) => updateCollection(state, collection))
  return state
}

const NFTsSlice = createSlice({
  name: "nftsUpdate",
  initialState: {
    nfts: {},
    filters: [],
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
      collections.forEach((collection) =>
        updateCollection(immerState, collection)
      )
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
  },
})

export const {
  initializeNFTs,
  updateNFTsCollections,
  updateNFTs,
  deleteNFTsForAddress,
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
