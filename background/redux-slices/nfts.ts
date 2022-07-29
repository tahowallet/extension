import { createSlice } from "@reduxjs/toolkit"
import { createBackgroundAsyncThunk } from "./utils"
import { EVMNetwork } from "../networks"
import { AddressOnNetwork } from "../accounts"
import { normalizeEVMAddress } from "../lib/utils"

export type NFTItem = {
  media: { gateway?: string }[]
  id: {
    tokenId: string
  }
  contract: { address: string }
  title: string
  chainID: number
}

export type NFTsState = {
  evm: {
    [chainID: string]: {
      [address: string]: NFTItem[]
    }
  }
}

export const initialState = {
  evm: {},
} as NFTsState

const NFTsSlice = createSlice({
  name: "nfts",
  initialState,
  reducers: {
    updateNFTs: (immerState, { payload: { address, NFTs, network } }) => {
      const normalizedAddress = normalizeEVMAddress(address)
      immerState.evm[network.chainID] ??= {}
      immerState.evm[network.chainID][normalizedAddress] ??= []
      immerState.evm[network.chainID][normalizedAddress] = NFTs
    },
    deleteNFts: (
      immerState,
      { payload: { address } }: { payload: AddressOnNetwork }
    ) => {
      const normalizedAddress = normalizeEVMAddress(address)

      Object.keys(immerState.evm).forEach((chainID) => {
        delete immerState.evm[chainID][normalizedAddress]
      })
    },
  },
})

export const { updateNFTs, deleteNFts } = NFTsSlice.actions

export default NFTsSlice.reducer

async function fetchNFTs(address: string, currentNetwork: EVMNetwork) {
  // @TODO: Move to alchemy.ts, remove hardcoded polygon or eth logic
  const result = await (
    await fetch(
      `https://${
        currentNetwork.name === "Polygon" ? "polygon-mainnet.g" : "eth-mainnet"
      }.alchemyapi.io/nft/v2/${
        process.env.ALCHEMY_KEY
      }/getNFTs/?owner=${address}`
    )
  ).json()
  return result.ownedNfts
}

export const fetchThenUpdateNFTsByNetwork = createBackgroundAsyncThunk(
  "nfts/fetchThenUpdateNFTsByNetwork",
  async (
    payload: {
      address: string
      currentNetwork: EVMNetwork
    },
    { dispatch }
  ) => {
    const { address, currentNetwork } = payload
    const ownedNFTs = await fetchNFTs(address, currentNetwork)

    await dispatch(
      NFTsSlice.actions.updateNFTs({
        address,
        NFTs: ownedNFTs,
        network: currentNetwork,
      })
    )
  }
)
