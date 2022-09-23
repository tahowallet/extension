import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { NFTsState } from "../nfts"

// Adds chainID to each NFT for convenience in frontend
export const selectNFTs = createSelector(
  (state: RootState) => state.nfts,
  (nfts): NFTsState => {
    return {
      evm: Object.fromEntries(
        Object.entries(nfts.evm).map(([chainID]) => {
          return [
            [chainID],
            Object.fromEntries(
              Object.entries(nfts.evm[chainID]).map(([address]) => {
                return [
                  [address],
                  nfts.evm[chainID][address].map((item) => {
                    return {
                      ...item,
                      chainID,
                    }
                  }),
                ]
              })
            ),
          ]
        })
      ),
    }
  }
)

const flatMapNFTs = (NFTs: NFTsState) =>
  Object.values(NFTs.evm).flatMap((NFTsByChain) =>
    Object.values(NFTsByChain).flatMap((item) => item)
  )

/** Returns flat list of all NFTs without Galxe's items */
export const selectNFTsList = createSelector(selectNFTs, (NFTs) =>
  flatMapNFTs(NFTs).filter((NFT) => !NFT.isOAT)
)

/** Returns flat list of all Galxe's NFTs */
export const selectOATsList = createSelector(selectNFTs, (NFTs) =>
  flatMapNFTs(NFTs).filter((NFT) => NFT.isOAT)
)
