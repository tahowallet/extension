import browser from "webextension-polyfill"
import React, { ReactElement } from "react"
import classNames from "classnames"

import MEZO_CAMPAIGN, {
  MezoClaimStatus,
} from "@tallyho/tally-background/services/campaign/matsnet-nft"
import { assertUnreachable } from "@tallyho/tally-background/lib/utils/type-guards"
import { AnalyticsEvent } from "@tallyho/tally-background/lib/posthog"
import {
  markDismissableItemAsShown,
  sendEvent,
} from "@tallyho/tally-background/redux-slices/ui"

import SharedButton from "../../Shared/SharedButton"
import SharedIcon from "../../Shared/SharedIcon"
import SharedBanner from "../../Shared/SharedBanner"
import { useBackgroundDispatch } from "../../../hooks"

const claimStateBanners = {
  eligible: {
    bannerId: MEZO_CAMPAIGN.bannerIds.eligible,
    title: "Get the gift of sats",
    body: "Enjoy 20,000 sats on the Mezo testnet. Try Mezo borrow and get an exclusive Taho x Mezo NFT.",
    action: "Login to claim",
  },
  "can-borrow": {
    bannerId: MEZO_CAMPAIGN.bannerIds.canBorrow,
    title: "Put those sats to work",
    body: "Use testnet sats to borrow mUSD and spend it in the Mezo Market. The exclusive NFT awaits.",
    action: "Borrow mUSD",
  },
  "can-claim-nft": {
    bannerId: MEZO_CAMPAIGN.bannerIds.canClaimNFT,
    title: "The exclusive NFT awaits",
    body: "Spend testnet mUSD in the Mezo Market. How about an exclusive Taho x Mezo NFT?",
    action: "Visit the Mezo Store",
  },
} as const

export default function MezoWalletCampaignBanner({
  state,
}: {
  state: Extract<MezoClaimStatus, "eligible" | "can-borrow" | "can-claim-nft">
}): ReactElement {
  const dispatch = useBackgroundDispatch()

  const onClick = () => {
    browser.permissions.request({ permissions: ["notifications"] })
    switch (state) {
      case "eligible":
        dispatch(sendEvent(AnalyticsEvent.CAMPAIGN_MEZO_NFT_ELIGIBLE_BANNER))
        browser.tabs.create({
          url: MEZO_CAMPAIGN.bannerUrls.eligible,
        })
        break
      case "can-borrow":
        dispatch(sendEvent(AnalyticsEvent.CAMPAIGN_MEZO_NFT_BORROW_BANNER))
        browser.tabs.create({
          url: MEZO_CAMPAIGN.bannerUrls.canBorrow,
        })
        break
      case "can-claim-nft":
        dispatch(sendEvent(AnalyticsEvent.CAMPAIGN_MEZO_NFT_CLAIM_NFT_BANNER))
        browser.tabs.create({
          url: MEZO_CAMPAIGN.bannerUrls.canClaimNFT,
        })
        break
      default:
        assertUnreachable(state)
    }
  }

  // Turn off related notifications
  const handleBannerDismiss = () => {
    switch (state) {
      case "eligible":
        dispatch(
          markDismissableItemAsShown(MEZO_CAMPAIGN.notificationIds.eligible),
        )
        break
      case "can-borrow":
        dispatch(
          markDismissableItemAsShown(MEZO_CAMPAIGN.notificationIds.canBorrow),
        )
        break
      case "can-claim-nft":
        dispatch(
          markDismissableItemAsShown(MEZO_CAMPAIGN.notificationIds.canBorrow),
        )
        break
      default:
        assertUnreachable(state)
    }
  }

  return (
    <SharedBanner
      id={claimStateBanners[state].bannerId}
      canBeClosed
      onDismiss={() => handleBannerDismiss()}
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
            "banner-img-claimed-sats": state === "can-borrow",
            "banner-img-borrowed": state === "can-claim-nft",
          })}
        />
        <h2 className="serif_header">{claimStateBanners[state].title}</h2>
        <p>{claimStateBanners[state].body}</p>
        <SharedButton type="tertiary" size="medium" onClick={onClick}>
          {claimStateBanners[state].action}
          <SharedIcon
            icon="new_tab@2x.png"
            width={16}
            color="currentColor"
            style={{
              marginLeft: 4,
              marginTop: 1,
            }}
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
