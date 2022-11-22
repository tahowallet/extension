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

function initializeCollections(collections: NFTCollection[]): NFTsState {
  const state: NFTsState = {}

  collections.forEach((collection) => {
    const {
      id,
      name,
      nftCount,
      network: { chainID },
      owner,
      floorPrice,
    } = collection
    state[chainID] ??= {}
    state[chainID][owner] ??= {}
    state[chainID][owner][collection.id] = {
      id,
      name,
      nftCount,
      nfts: [],
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
