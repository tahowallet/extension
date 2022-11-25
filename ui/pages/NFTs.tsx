import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
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
  const hasNFTs = useBackgroundSelector(() => true)
  const [panelNumber, setPanelNumber] = useState(0)

  const renderTabContent = useCallback(
    (value: number) => {
      switch (value) {
        case 0:
          return (
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
          )
        case 1:
          return <AchievementsOverview />
        default:
          return null
      }
    },
    [t]
  )

  return (
    <div className="page_content">
      <NFTsHeader hasNFTs={hasNFTs} />

      {/* TODO: Move these to their respective tab */}
      <NFTsExploreBanner type="nfts" />
      <NFTsExploreBanner type="badge" />
      <div className="panel_switcher_wrap">
        <SharedPanelSwitcher
          setPanelNumber={setPanelNumber}
          panelNumber={panelNumber}
          panelNames={PANEL_NAMES}
        />
      </div>
      {renderTabContent(panelNumber)}
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
        `}
      </style>
    </div>
  )
}
