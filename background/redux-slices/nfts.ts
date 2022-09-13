import { createSlice } from "@reduxjs/toolkit"
import logger from "../lib/logger"
import { createBackgroundAsyncThunk } from "./utils"
import { EVMNetwork } from "../networks"
import { getNFTs, NFT } from "../lib/nfts"
import { normalizeEVMAddress } from "../lib/utils"
import { setSnackbarMessage } from "./ui"
import { HexString } from "../types"

export type NFTsState = {
  evm: {
    [chainID: string]: {
      [address: string]: NFT[]
    }
  }
}
export { NFT } from "../lib/nfts"

export const initialState = {
  evm: {},
} as NFTsState

const NFTsSlice = createSlice({
  name: "nfts",
  initialState,
  reducers: {
    updateNFTs: (
      immerState,
      {
        payload,
      }: {
        payload: {
          address: string
          network: EVMNetwork
          NFTs: NFT[]
        }[]
      }
    ) => {
      payload.forEach(({ address, network, NFTs }) => {
        const normalizedAddress = normalizeEVMAddress(address)
        immerState.evm[network.chainID] ??= {}
        immerState.evm[network.chainID][normalizedAddress] ??= []
        immerState.evm[network.chainID][normalizedAddress] = NFTs
      })
    },
    deleteNFts: (immerState, { payload: address }: { payload: HexString }) => {
      const normalizedAddress = normalizeEVMAddress(address)

      Object.keys(immerState.evm).forEach((chainID) => {
        delete immerState.evm[chainID][normalizedAddress]
      })
    },
  },
})

export const { updateNFTs, deleteNFts } = NFTsSlice.actions

export default NFTsSlice.reducer

export const fetchThenUpdateNFTsByNetwork = createBackgroundAsyncThunk(
  "nfts/fetchThenUpdateNFTsByNetwork",
  async (
    payload: {
      addresses: string[]
      networks: EVMNetwork[]
    },
    { dispatch }
  ) => {
    try {
      const { addresses, networks } = payload
      const fetchedNFTs = (
        await Promise.all(
          addresses.map(async (address) =>
            Promise.all(
              networks.map(async (network) => {
                const NFTs = await getNFTs({ address, network })

                return {
                  address,
                  network,
                  NFTs,
                }
              })
            )
          )
        )
      ).flat()

      await dispatch(NFTsSlice.actions.updateNFTs(fetchedNFTs))
    } catch (error) {
      logger.error("NFTs fetch failed:", error)
      dispatch(setSnackbarMessage(`Couldn't load NFTs`))
    }
  }
)
