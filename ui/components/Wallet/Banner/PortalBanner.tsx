import React, { ReactElement, useCallback } from "react"
import {
  dismissableItemMarkedAsShown,
  selectShouldShowDismissableItem,
} from "@tallyho/tally-background/redux-slices/ui"
import { selectIsTestTahoDeployed } from "@tallyho/tally-background/redux-slices/claim"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../hooks"

export default function PortalBanner(): ReactElement | null {
  const isTokenDeployed = useBackgroundSelector(selectIsTestTahoDeployed)
  const isBannerVisible = useBackgroundSelector(
    selectShouldShowDismissableItem("testnet-portal-is-open-banner"),
  )
  const dispatch = useBackgroundDispatch()

  const dismissBanner = () =>
    dispatch(dismissableItemMarkedAsShown("testnet-portal-is-open-banner"))

  if (!isTokenDeployed || !isBannerVisible) {
    return null
  }

  return (
    <div>
      The portal is open!{" "}
      <a
        href="https://island.taho.xyz/"
        target="_blank"
        rel="noreferrer"
        onClick={dismissBanner}
      >
        Explore The Island
      </a>
    </div>
  )
}
