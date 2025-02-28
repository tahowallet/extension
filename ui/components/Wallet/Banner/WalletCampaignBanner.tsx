import browser from "webextension-polyfill"
import React, { ReactElement } from "react"
import classNames from "classnames"

import { MezoClaimStatus } from "@tallyho/tally-background/redux-slices/ui"
import { assertUnreachable } from "@tallyho/tally-background/lib/utils/type-guards"

import SharedButton from "../../Shared/SharedButton"
import SharedIcon from "../../Shared/SharedIcon"
import SharedBanner from "../../Shared/SharedBanner"

const claimStateBanners = {
  eligible: {
    bannerId: "mezo-1-claim-banner",
    title: "Get the gift of sats",
    body: "Enjoy 20,000 sats on the Mezo testnet. Try borrow and get an exclusive Taho x Mezo NFT.",
    action: "Login to claim",
  },
  "claimed-sats": {
    bannerId: "mezo-1-borrow-banner",
    title: "Bank on yourself",
    body: "Use testnet sats to borrow mUSD and spend in the Mezo store. An exclusive NFT awaits.",
    action: "Borrow mUSD",
  },
  borrowed: {
    bannerId: "mezo-1-nft-banner",
    title: "Treat yourself with mUSD",
    body: "Spend testnet mUSD in the Mezo store. How about an exclusive Taho x Mezo NFT?",
    action: "Visit the Mezo Store",
  },
} as const

export default function MezoWalletCampaignBanner({
  state,
}: {
  state: Extract<MezoClaimStatus, "eligible" | "claimed-sats" | "borrowed">
}): ReactElement {
  const onClick = () => {
    browser.permissions.request({ permissions: ["notifications"] })
    switch (state) {
      case "eligible":
        browser.tabs.create({ url: "https://mezo.org/matsnet" })
        break
      case "claimed-sats":
        browser.tabs.create({ url: "https://mezo.org/matsnet/borrow" })
        break
      case "borrowed":
        browser.tabs.create({ url: "https://mezo.org/matsnet/store" })
        break
      default:
        assertUnreachable(state)
        break
    }
  }

  return (
    <SharedBanner
      id={claimStateBanners[state].bannerId}
      canBeClosed
      style={{
        padding: 0,
        marginBottom: 18,
        background: "url('images/banner-bg.svg') center/cover no-repeat",
      }}
    >
      <div className="inner">
        <i
          className={classNames({
            "banner-img-eligible": state === "eligible",
            "banner-img-claimed-sats": state === "claimed-sats",
            "banner-img-borrowed": state === "borrowed",
          })}
        />
        <h2 className="serif_header">{claimStateBanners[state].title}</h2>
        <p
          style={{
            // Text should wrap earlier in this banner
            maxWidth: state === "claimed-sats" ? "200" : undefined,
          }}
        >
          {claimStateBanners[state].body}
        </p>
        <SharedButton type="tertiary" size="medium" onClick={onClick}>
          {claimStateBanners[state].action}
          <SharedIcon
            icon="new_tab@2x.png"
            width={16}
            color="var(--trophy-gold)"
            style={{ marginLeft: 5, marginBottom: 4 }}
          />
        </SharedButton>
      </div>
      <style jsx>
        {`
          .inner {
            padding: 12px 0 0 22px;
          }
          .banner-img-eligible {
            position: absolute;
            right: 0;
            width: 82px;
            height: 126px;
            background: url("./images/mezo-1.png") center/contain no-repeat;
            margin-right: 21px;
            margin-bottom: 9px;
          }

          .banner-img-claimed-sats {
            position: absolute;
            right: 0;
            width: 82px;
            height: 126px;
            background: url("./images/mezo-2.png") center/contain no-repeat;
            margin-right: 21px;
            margin-bottom: 12px;
          }

          .banner-img-borrowed {
            display: block;
            position: absolute;
            right: 0;
            width: 84px;
            height: 92px;
            background: url("./images/mezo-3.png") center/contain no-repeat;
            margin-right: 5px;
            margin-top: 28px;
          }

          h2 {
            font-size: 22px;
            line-height: 32px;
            margin: 0 0;
            color: var(--subscape);
          }

          p {
            margin: 0;
            max-width: 220px;
            font-weight: 500;
            font-size: 15px;
            line-height: 18px;
            color: #81aba8;
          }
        `}
      </style>
    </SharedBanner>
  )
}
