import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import AchievementsOverview from "../components/NFTs/AchievementsOverview"
import NFTsOverview from "../components/NFTs/NFTsOverview"
import SharedBanner from "../components/Shared/SharedBanner"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"

const PANEL_NAMES = ["NFTs", "Badges"]

export default function NFTs(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "nfts",
  })
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
    <>
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
          .panel_switcher_wrap {
            width: 100%;
          }
        `}
      </style>
    </>
  )
}
