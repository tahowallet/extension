import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { selectHideBanners } from "@tallyho/tally-background/redux-slices/ui"
import classNames from "classnames"
import React, { ReactElement, useState } from "react"
import { useBackgroundSelector } from "../../../hooks"

import SharedBanner from "../../Shared/SharedBanner"
import SharedButton from "../../Shared/SharedButton"
import SharedIcon from "../../Shared/SharedIcon"
import useArbitrumCampaigns from "./useArbitrumCampaigns"
import useBannerCampaigns from "./useBannerCampaigns"
import WalletBannerSlideup from "./WalletBannerSlideup"

export default function WalletBanner(): ReactElement {
  const hideBanners = useBackgroundSelector(selectHideBanners)
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)
  const [showDismissSlideup, setShowDismissSlideup] = useState(false)
  const arbitrumCampaign = useArbitrumCampaigns()
  const campaignDetails = useBannerCampaigns(currentNetwork.chainID)
  const thumbnail = arbitrumCampaign?.thumbnail // TODO: add fallback thumbnail

  if (!campaignDetails) return <></>

  const { title, description, buttons } = campaignDetails

  return (
    <div
      className={classNames("wallet_banner_container", {
        hide: hideBanners,
      })}
    >
      <SharedBanner>
        <div className="wallet_banner">
          <SharedIcon
            onClick={() => setShowDismissSlideup(true)}
            icon="icons/s/close.svg"
            ariaLabel="close"
            width={16}
            color="var(--green-40)"
            hoverColor="var(--green-20)"
            customStyles={`
              position: absolute;
              top: 0;
              right: 0;
            `}
          />
          <img src={thumbnail} alt="Notification campaign" />
          <div className="wallet_banner_content">
            <h3>{title}</h3>
            {description && <p>{description}</p>}
            {buttons && (
              <div className="wallet_banner_buttons">
                {buttons.primary && (
                  <SharedButton
                    style={{ height: "auto" }}
                    size="medium"
                    type="tertiary"
                    iconSmall="new-tab"
                    onClick={() => {
                      window.open(buttons.primary?.link, "_blank")?.focus()
                    }}
                  >
                    {buttons.primary.title}
                  </SharedButton>
                )}
                {buttons.secondary && (
                  <SharedButton
                    style={{ height: "auto", marginLeft: "auto" }}
                    size="medium"
                    type="tertiaryGray"
                    iconSmall="new-tab"
                    onClick={() => {
                      window.open(buttons.secondary?.link, "_blank")?.focus() // TODO: this should be changed when the explainer is created
                    }}
                  >
                    {buttons.secondary.title}
                  </SharedButton>
                )}
              </div>
            )}
          </div>
        </div>
      </SharedBanner>
      <WalletBannerSlideup
        isOpen={showDismissSlideup}
        onClose={() => setShowDismissSlideup(false)}
      />
      <style jsx>{`
        img {
          width: 64px;
          height: 64px;
          border-radius: 8px;
          margin: 0 15px 0 5px;
        }
        h3 {
          margin: 0 0 5px;
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
          margin-right: 25px;
        }
        p {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          color: var(--green-40);
        }
        .wallet_banner {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .subtitle {
          margin-bottom: 4px;
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-40);
        }
        .wallet_banner_buttons {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: space-between;
          margin-top: 5px;
        }
        .wallet_banner_content {
          width: 100%;
        }
        .wallet_banner_container {
          margin: 10px 0 25px;
          max-height: 200px;
        }
        .wallet_banner_container.hide {
          max-height: 0;
          margin: 0;
          pointer-events: none;
          opacity: 0;
          transition: all 500ms ease;
        }
      `}</style>
    </div>
  )
}
