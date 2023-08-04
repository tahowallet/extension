import { createSelector } from "@reduxjs/toolkit"
import { selectCurrentNetwork } from "./uiSelectors"
import { SwappableAsset, isSmartContractFungibleAsset } from "../../assets"
import { sameNetwork } from "../../networks"
import { isBaseAssetForNetwork, isTrustedAsset } from "../utils/asset-utils"
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
  (assets, currentNetwork) =>
    assets.filter((asset): asset is SwappableAsset => {
      // Only list assets for the current network.
      const assetIsOnCurrentNetwork =
        isBaseAssetForNetwork(asset, currentNetwork) ||
        (isSmartContractFungibleAsset(asset) &&
          sameNetwork(asset.homeNetwork, currentNetwork))

      return isTrustedAsset(asset) && assetIsOnCurrentNetwork
    })
)
