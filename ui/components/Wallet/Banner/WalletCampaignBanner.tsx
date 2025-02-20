import browser from "webextension-polyfill"
import React, { ReactElement } from "react"
import { MezoClaimStatus } from "@tallyho/tally-background/redux-slices/ui"
import SharedButton from "../../Shared/SharedButton"
import SharedIcon from "../../Shared/SharedIcon"
import SharedBanner from "../../Shared/SharedBanner"

const claimStateToBannerId = {
  eligible: "mezo-claim-banner",
  "claimed-sats": "mezo-borrow-banner",
} as const

export default function MezoWalletCampaignBanner({
  state,
}: {
  state: Extract<MezoClaimStatus, "eligible" | "claimed-sats">
}): ReactElement {
  const onClick = () => {
    browser.permissions.request({ permissions: ["notifications"] })
    if (state === "eligible") {
      browser.tabs.create({ url: "https://mezo.org/matsnet" })
    } else {
      browser.tabs.create({ url: "https://mezo.org/matsnet/borrow" })
    }
  }

  return (
    <SharedBanner
      id={claimStateToBannerId[state]}
      canBeClosed
      style={{
        padding: "8px 11px 0 0",
        marginBottom: 18,
        background:
          "var(--gradients-bg-cards, radial-gradient(57.41% 54.95% at 64.58% 47.64%,rgba(27, 97, 94, 0.00) 0%,rgba(27, 97, 94, 0.20) 100%),linear-gradient(156deg,rgba(26, 94, 91, 0.90) 5.26%,rgba(26, 106, 103, 0.00) 71.95%),rgba(6, 48, 46, 0.50))",
      }}
    >
      <i className="portal_open_title_image" />
      <h2 className="serif_header">Mezo.org</h2>
      <p>Get rewarded</p>
      <SharedButton
        type="primary"
        size="medium"
        onClick={onClick}
        style={{ marginTop: "5px" }}
      >
        {state === "eligible" ? "Claim sats" : "Try borrowing"}
        <SharedIcon
          icon="new_tab@2x.png"
          width={16}
          color="var(--castle-black)"
          style={{ marginLeft: 5 }}
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
