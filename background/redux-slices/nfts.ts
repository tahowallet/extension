import { createSlice } from "@reduxjs/toolkit"
import logger from "../lib/logger"
import { createBackgroundAsyncThunk } from "./utils"
import { EVMNetwork } from "../networks"
import { normalizeEVMAddress } from "../lib/utils"
import { setSnackbarMessage } from "./ui"
import { HexString } from "../types"

export type NFTItem = {
  error?: string
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
    updateNFTs: (
      immerState,
      {
        payload,
      }: {
        payload: { address: string; network: EVMNetwork; NFTs: NFTItem[] }[]
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

async function fetchNFTs(
  address: string,
  network: EVMNetwork
): Promise<NFTItem[]> {
  // @TODO: Move to alchemy.ts, remove hardcoded polygon or eth logic
  const requestUrl = new URL(
    `https://${
      network.name === "Polygon" ? "polygon-mainnet.g" : "eth-mainnet"
    }.alchemyapi.io/nft/v2/${process.env.ALCHEMY_KEY}/getNFTs/`
  )
  requestUrl.searchParams.set("owner", address)
  requestUrl.searchParams.set("filters[]", "SPAM")

  const result = await (await fetch(requestUrl.toString())).json()
  const filteredNFTs = result.ownedNfts.filter(
    (nft: NFTItem) => typeof nft.error === "undefined"
  )

  return filteredNFTs
}

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
                const NFTs = await fetchNFTs(address, network)

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
