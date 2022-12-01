import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { AddressOnNetwork } from "../accounts"
import { fromFixedPointNumber } from "../lib/fixed-point"
import { NFT, NFTCollection } from "../nfts"
import { createBackgroundAsyncThunk } from "./utils"

export type NFTCollectionCached = {
  floorPrice?: {
    value: number
    tokenSymbol: string
  }
  nfts: NFT[]
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
  acc.nfts[chainID] ??= {}
  acc.nfts[chainID][owner] ??= {}
  acc.nfts[chainID][owner][collection.id] = {
    id,
    name,
    nftCount,
    totalNftCount,
    nfts: [],
    hasBadges,
    network,
    owner,
    thumbnail,
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
        }
      }
    ) => {
      const {
        account: { network, address },
        collectionID,
        nfts,
      } = payload

      immerState.nfts[network.chainID][address][collectionID].nfts = nfts
    },
  },
})

export const { initializeNFTs, updateNFTsCollections, updateNFTs } =
  NFTsSlice.actions
export default NFTsSlice.reducer

export const fetchNFTsFromCollection = createBackgroundAsyncThunk(
  "nfts/fetchNFTsFromCollection",
  async (payload: { collectionID: string; account: AddressOnNetwork }) => {
    await emitter.emit("fetchNFTs", payload)
  }
)
