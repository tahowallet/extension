import { createSelector } from "@reduxjs/toolkit"
import { selectCurrentNetwork } from "./uiSelectors"
import { SwappableAsset, isSmartContractFungibleAsset } from "../../assets"
import { sameNetwork } from "../../networks"
import { isBuiltInNetworkBaseAsset, isTrustedAsset } from "../utils/asset-utils"
import { RootState } from ".."
import { SingleAssetState } from "../assets"

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
    return assets.filter(
      (
        asset
      ): asset is SwappableAsset & {
        recentPrices: SingleAssetState["recentPrices"]
      } => {
        return (
          isTrustedAsset(asset) &&
          // Only list assets for the current network.
          (isBuiltInNetworkBaseAsset(asset, currentNetwork) ||
            (isSmartContractFungibleAsset(asset) &&
              sameNetwork(asset.homeNetwork, currentNetwork)))
        )
      }
    )
  }
)
