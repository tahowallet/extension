import { createSelector } from "@reduxjs/toolkit"
import { selectCurrentNetwork } from "./uiSelectors"
import { isSmartContractFungibleAsset } from "../../assets"
import { sameNetwork } from "../../networks"
import { isBuiltInNetworkBaseAsset } from "../utils/asset-utils"
import { RootState } from ".."

export const selectLatestQuoteRequest = createSelector(
  (state: RootState) => state.swap.latestQuoteRequest,
  (latestQuoteRequest) => latestQuoteRequest
)

export const selectInProgressApprovalContract = createSelector(
  (state: RootState) => state.swap.inProgressApprovalContract,
  (approvalInProgress) => approvalInProgress
)

export const selectSwapBuyAssets = createSelector(
  (state: RootState) => state.assets,
  selectCurrentNetwork,
  (assets, currentNetwork) => {
    return assets.filter((asset) => {
      if (isSmartContractFungibleAsset(asset)) {
        if (sameNetwork(asset.homeNetwork, currentNetwork)) {
          return true
        }
      }
      if (
        // Explicitly add a network's base asset.
        isBuiltInNetworkBaseAsset(asset, currentNetwork)
      ) {
        return true
      }
      return false
    })
  }
)
