import { createSelector } from "@reduxjs/toolkit"
import { selectCurrentNetwork } from "./uiSelectors"
import { SwappableAsset, isSmartContractFungibleAsset } from "../../assets"
import { sameNetwork } from "../../networks"
import {
  isBuiltInNetworkBaseAsset,
  isVerifiedOrTrustedAsset,
} from "../utils/asset-utils"
import { RootState } from ".."
import { SingleAssetState } from "../assets"
import { FeatureFlags, isEnabled } from "../../features"

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
          // When the flag is disabled all assets can be sent and swapped
          (!isEnabled(FeatureFlags.SUPPORT_UNVERIFIED_ASSET) ||
            isVerifiedOrTrustedAsset(asset)) &&
          // Only list assets for the current network.
          (isBuiltInNetworkBaseAsset(asset, currentNetwork) ||
            (isSmartContractFungibleAsset(asset) &&
              sameNetwork(asset.homeNetwork, currentNetwork)))
        )
      }
    )
  }
)
