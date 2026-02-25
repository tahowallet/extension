import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { selectHideBanners } from "@tallyho/tally-background/redux-slices/ui"
import classNames from "classnames"
import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useBackgroundSelector, useLocalStorage } from "../../../hooks"

import SharedBanner from "../../Shared/SharedBanner"
import SharedButton from "../../Shared/SharedButton"
import SharedIcon from "../../Shared/SharedIcon"
import useArbitrumCampaigns from "./useArbitrumCampaigns"
import useBannerCampaigns from "./useBannerCampaigns"
import WalletBannerSlideup from "./WalletBannerSlideup"

export default function WalletBanner(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet.banner",
  })
  const hideBanners = useBackgroundSelector(selectHideBanners)
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)

  const {
    campaigns: arbitrumCampaigns,
    loading,
    error,
  } = useArbitrumCampaigns()
  const campaignDetails = useBannerCampaigns(currentNetwork.chainID)

  const [showDismissSlideup, setShowDismissSlideup] = useState(false)
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [currentCampaignId, setCurrentCampaignId] = useState("")
  const [dismissedCampaignId, setDismissedCampaignId] = useLocalStorage(
    "dismissedCampaignBanner",
    "",
  )

  useEffect(() => {
    // don't show any thumbnail while fetching campaign
    if (!loading) {
      if (error) {
        setThumbnails(["./images/banner_thumbnail.png"])
      } else {
        const id = `${arbitrumCampaigns[0]?.id ?? ""}_${
          arbitrumCampaigns[1]?.id ?? ""
        }`
        setCurrentCampaignId(id)
        setThumbnails(arbitrumCampaigns.map((campaign) => campaign.thumbnail))
      }
    }
  }, [arbitrumCampaigns, loading, error])

  useEffect(() => {
    if (
      dismissedCampaignId &&
      currentCampaignId &&
      currentCampaignId !== dismissedCampaignId
    ) {
      setDismissedCampaignId("")
    }
  }, [currentCampaignId, dismissedCampaignId, setDismissedCampaignId])

  const isHidden =
    hideBanners ||
    !campaignDetails ||
    (currentCampaignId
      ? dismissedCampaignId === currentCampaignId
      : !!dismissedCampaignId)

  const { buttons } = campaignDetails ?? {}

  return (
    <div
      className={classNames("wallet_banner_container", {
        hide: isHidden,
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
            style={{ position: "absolute", top: 0, right: 0 }}
          />
          <div
            className={classNames("thumbnail_container", {
              hidden: !thumbnails.length,
            })}
          >
            <div
              className={classNames("thumbnail thumbnail_back", {
                hidden: !thumbnails[1],
              })}
            />
            <div
              className={classNames("thumbnail thumbnail_front", {
                hidden: !thumbnails[0],
                centered: thumbnails.length === 1,
              })}
            />
          </div>
          <div className="wallet_banner_content">
            <h3>{t("bannerTitle")}</h3>
            <ul
              className={classNames({
                hidden: loading,
              })}
            >
              {error ? (
                <li>{t("emptyBannerContent")}</li>
              ) : (
                arbitrumCampaigns?.map(({ name }) => (
                  <li key={name} className="list_item">
                    <div className="ellipsis">{name}</div>
                  </li>
                ))
              )}
            </ul>
            {buttons && (
              <div className="wallet_banner_buttons">
                {buttons.primary && (
                  <SharedButton
                    style={{ height: "auto" }}
                    size="medium"
                    type="tertiary"
                    iconSmall="new-tab"
                    onClick={() => {
                      setDismissedCampaignId(currentCampaignId)
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
                      window.open(buttons.secondary?.link, "_blank")?.focus()
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
        onDismiss={() => setDismissedCampaignId(currentCampaignId)}
        onClose={() => setShowDismissSlideup(false)}
      />
      <style jsx>{`
        .thumbnail_container {
          position: relative;
          height: 106px;
          width: 84px;
        }
        .thumbnail_front {
          background: ${
            thumbnails[0] ? `url(${thumbnails[0]})` : "transparent"
          };
          top: 12px;
        }
        .thumbnail_front.centered {
          top: 0;
        }
        .thumbnail_back {
          background: ${
            thumbnails[1] ? `url(${thumbnails[1]})` : "transparent"
          };
          left: 7px;
        }
        .thumbnail {
          position: absolute;
          flex-shrink: 0;
          width: 58px;
          height: 58px;
          border-radius: 8px;
          margin: 0 15px 0 5px;
          align-self: flex-start;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 1;
          transition: opacity 200ms ease-in;
        }
        ul.hidden,
        .thumbnail.hidden,
        .thubmnails_container.hidden {
          opacity: 0;
        }
        h3 {
          margin: 0 0 5px;
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
          margin-right: 25px;
          color: var(--success);
        }
        ul {
          width: 100%;
          height: 48px;
          display: flex;
          flex-direction: column;
          transition: opacity 200ms ease-in;
        }
        li {
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          color: var(--green-20);
        }
        .list_item {
          list-style-type: disc;
          position: relative;
          display: list-item;
          margin-left: 20px;
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
          width: calc(100% - 84px);
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
