import browser from "webextension-polyfill"
import React, { ReactElement } from "react"
import { selectHasIslandAssets } from "@tallyho/tally-background/redux-slices/claim"
import { useBackgroundSelector } from "../../../hooks"
import SharedButton from "../../Shared/SharedButton"
import SharedIcon from "../../Shared/SharedIcon"
import SharedBanner from "../../Shared/SharedBanner"

const PORTAL_ID_WITH_ASSETS = "testnet-portal-is-open-banner-with-assets"
const PORTAL_ID_NO_ASSETS = "testnet-portal-is-open-banner-no-assets"

export default function PortalBanner(): ReactElement | null {
  const hasIslandAssets = useBackgroundSelector(selectHasIslandAssets)

  const showIslandAndDismissBanner = () => {
    browser.permissions.request({ permissions: ["notifications"] })
    browser.tabs.create({ url: "https://app.taho.xyz" })
  }

  return (
    <SharedBanner
      id={hasIslandAssets ? PORTAL_ID_WITH_ASSETS : PORTAL_ID_NO_ASSETS}
      canBeClosed
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
      <i className="portal_open_title_image" />
      <h2 className="serif_header">Subscape is online</h2>
      <p>
        {hasIslandAssets
          ? "You're eligible for the Beta."
          : "Try the live Beta."}
      </p>
      <SharedButton
        type="primary"
        size="medium"
        onClick={showIslandAndDismissBanner}
        style={{ marginTop: "5px" }}
      >
        {hasIslandAssets ? "Explore Subscape" : "Check eligibility"}
        <SharedIcon
          icon="new_tab@2x.png"
          width={16}
          color="var(--castle-black)"
          customStyles="margin-left: 5px;"
        />
      </SharedButton>
      <style jsx>
        {`
          .portal_open_title_image {
            float: left;
            width: 120px;
            height: 117px;
            background: url("./images/island/portal-image-title@2x.png");
            background-size: cover;
            margin-right: 10px;
            margin-bottom: 12px;
          }

          h2 {
            font-size: 22px;
            line-height: 32px;
            margin: 0 0 5px;
          }

          p {
            margin: 0 0 16px;
            color: var(--green-40);
          }
        `}
      </style>
    </SharedBanner>
  )
}
