import { createSlice } from "@reduxjs/toolkit"
import { NFT, NFTCollection } from "../nfts"

export type NFTCollectionCached = {
  floorPrice?: {
    value: bigint
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

export type FiltersState = []

export type NFTsSliceState = { nfts: NFTsState; filters: FiltersState }

function initializeCollections(collections: NFTCollection[]) {
  const state: NFTsSliceState = {
    nfts: {},
    filters: [],
  }

  collections.forEach((collection) => {
    const { id, name, nftCount, network, owner, floorPrice, hasBadges } =
      collection
    const { chainID } = network
    state.nfts[chainID] ??= {}
    state.nfts[chainID][owner] ??= {}
    state.nfts[chainID][owner][collection.id] = {
      id,
      name,
      nftCount,
      nfts: [],
      hasBadges,
      network,
      owner,
      floorPrice: floorPrice && {
        value: floorPrice.value,
        tokenSymbol: floorPrice.token.symbol,
      },
    }
  })

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
  },
})

export const { initializeNFTs } = NFTsSlice.actions
export default NFTsSlice.reducer
