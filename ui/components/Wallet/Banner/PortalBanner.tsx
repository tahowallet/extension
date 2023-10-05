import browser from "webextension-polyfill"
import React, { ReactElement } from "react"
import {
  dismissableItemMarkedAsShown,
  selectShouldShowDismissableItem,
} from "@tallyho/tally-background/redux-slices/ui"
import { selectIsTestTahoDeployed } from "@tallyho/tally-background/redux-slices/claim"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../hooks"
import SharedButton from "../../Shared/SharedButton"
import SharedIcon from "../../Shared/SharedIcon"
import SharedBanner from "../../Shared/SharedBanner"

export default function PortalBanner(): ReactElement | null {
  const isTokenDeployed = useBackgroundSelector(selectIsTestTahoDeployed)
  const isBannerVisible = useBackgroundSelector(
    selectShouldShowDismissableItem("testnet-portal-is-open-banner"),
  )
  const dispatch = useBackgroundDispatch()

  const showIslandAndDismissBanner = () => {
    // FIXME Shortcut. We should use a real link here.
    browser.tabs.create({ url: "https://island.taho.xyz" })
    dispatch(dismissableItemMarkedAsShown("testnet-portal-is-open-banner"))
  }

  if (!isTokenDeployed || !isBannerVisible) {
    return null
  }

  return (
    <SharedBanner
      customStyles={`
        padding: 8px 11px 0 0;
        margin-bottom: 18px;
        background:
          var(--gradients-bg-cards,
              radial-gradient(
                57.41% 54.95% at 64.58% 47.64%,
                rgba(27, 97, 94, 0.00) 0%,
                rgba(27, 97, 94, 0.20) 100%
              ),
              linear-gradient(
                156deg,
                rgba(26, 94, 91, 0.90) 5.26%,
                rgba(26, 106, 103, 0.00) 71.95%),
                rgba(6, 48, 46, 0.50)
             )
      `}
    >
      <i className="portal_open_image" />
      <h2 className="serif_header">The portal is open!</h2>{" "}
      <SharedButton
        type="primary"
        size="medium"
        onClick={showIslandAndDismissBanner}
      >
        Explore The Island{" "}
        <SharedIcon
          icon="new_tab@2x.png"
          width={16}
          color="var(--castle-black)"
          customStyles="margin-left: 5px;"
        />
      </SharedButton>
      <style jsx>
        {`
          .portal_open_image {
            float: left;
            width: 132px;
            height: 92px;
            background: url("./images/island/portal-image@2x.png");
            background-size: cover;
          }

          h2 {
            font-size: 22px;
            line-height: 32px;
            margin-bottom: 5px;
          }
        `}
      </style>
    </SharedBanner>
  )
}
