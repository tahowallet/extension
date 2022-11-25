import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import classNames from "classnames"
import AchievementsOverview from "../components/NFTs/AchievementsOverview"
import NFTsOverview from "../components/NFTs/NFTsOverview"
import SharedBanner from "../components/Shared/SharedBanner"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import NFTsExploreBanner from "../components/NFTS_update/NFTsExploreBanner"
import NFTsHeader from "../components/NFTS_update/NFTsHeader"
import { useBackgroundSelector } from "../hooks"

const PANEL_NAMES = ["NFTs", "Badges"]

export default function NFTs(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "nfts",
  })
  const hasNFTs = useBackgroundSelector(() => false)
  const [panelNumber, setPanelNumber] = useState(0)

  return (
    <div className="page_content">
      <NFTsHeader hasNFTs={hasNFTs} />
      <div
        className={classNames("panel_switcher_wrap", {
          margin: !hasNFTs,
        })}
      >
        <SharedPanelSwitcher
          setPanelNumber={setPanelNumber}
          panelNumber={panelNumber}
          panelNames={PANEL_NAMES}
        />
      </div>
      {panelNumber === 0 &&
        (hasNFTs ? (
          <>
            <SharedBanner
              icon="notif-announcement"
              iconColor="var(--link)"
              canBeClosed
              id="nft_soon"
              customStyles="margin: 8px 0;"
            >
              {t("NFTPricingComingSoon")}
            </SharedBanner>
            <NFTsOverview />
          </>
        ) : (
          <NFTsExploreBanner type="nfts" />
        ))}
      {panelNumber === 1 &&
        (hasNFTs ? (
          <AchievementsOverview />
        ) : (
          <NFTsExploreBanner type="badge" />
        ))}
      <style jsx>
        {`
          .page_content {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: center;
          }
          .panel_switcher_wrap {
            width: 100%;
          }
          .panel_switcher_wrap.margin {
            margin-bottom: 16px;
          }
        `}
      </style>
    </div>
  )
}
