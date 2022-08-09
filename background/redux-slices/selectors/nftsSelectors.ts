import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { NFTsState } from "../nfts"

// Adds chainID to each NFT for convenience in frontend
const selectNFTs = createSelector(
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
export default selectNFTs
