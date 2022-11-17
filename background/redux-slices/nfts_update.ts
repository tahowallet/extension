import { createSlice } from "@reduxjs/toolkit"
import { NFT, NFTCollection } from "../nfts"

type NFTCollectionCached = Pick<NFTCollection, "id" | "name" | "nftCount"> & {
  floorPrice?: {
    value: bigint
    tokenSymbol: string
  }
  nfts: NFT[]
}

export type NFTsState = {
  [chainID: string]: {
    [address: string]: {
      [collectionID: string]: NFTCollectionCached
    }
  }
}

function initializeCollections(collections: NFTCollection[]) {
  const state: NFTsState = {}

  collections.forEach((collection) => {
    const {
      id,
      name,
      nftCount,
      network: { chainID },
      owner,
      //   floorPrices,
    } = collection
    state[chainID] ??= {}
    state[chainID][owner] ??= {}
    state[chainID][owner][collection.id] = {
      id,
      name,
      nftCount,
      nfts: [],
    }
  })

  return state
}

const NFTsSlice = createSlice({
  name: "nftsUpdate",
  initialState: {} as NFTsState,
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
