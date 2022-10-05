import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { NFTsState } from "../nfts"

// Adds chainID to each NFT for convenience in frontend
export const selectNFTs = createSelector(
  (state: RootState) => state.nfts,
  (nfts): NFTsState => ({
    evm: Object.fromEntries(
      Object.entries(nfts.evm).map(([chainID]) => [
        [chainID],
        Object.fromEntries(
          Object.entries(nfts.evm[chainID]).map(([address]) => [
            [address],
            nfts.evm[chainID][address].map((item) => ({
              ...item,
              chainID,
            })),
          ])
        ),
      ])
    ),
  })
)

const flatMapNFTs = (NFTs: NFTsState) =>
  Object.values(NFTs.evm).flatMap((NFTsByChain) =>
    Object.values(NFTsByChain).flatMap((item) => item)
  )

/** Returns flat list of all NFTs without Galxe's items */
export const selectNFTsList = createSelector(selectNFTs, (NFTs) =>
  flatMapNFTs(NFTs).filter((NFT) => !NFT.isAchievement)
)

/** Returns flat list of all Galxe's NFTs */
export const selectAchievementsList = createSelector(selectNFTs, (NFTs) =>
  flatMapNFTs(NFTs).filter((NFT) => NFT.isAchievement)
)
