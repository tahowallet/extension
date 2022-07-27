import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."

const selectNFTs = createSelector(
  (state: RootState) => state,
  (nfts) => {
    return nfts.nfts
  }
)
export default selectNFTs
