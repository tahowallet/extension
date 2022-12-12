import React, { ReactElement, useRef, useState } from "react"
import {
  selectNFTBadgesCount,
  selectNFTsCount,
  selectIsReloadingNFTs,
} from "@tallyho/tally-background/redux-slices/selectors"
import { useTranslation } from "react-i18next"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import NFTsExploreBanner from "../components/NFTS_update/NFTsExploreBanner"
import NFTsHeader from "../components/NFTS_update/NFTsHeader"
import { useBackgroundSelector, useNFTsReload } from "../hooks"
import NFTListPortfolio from "../components/NFTS_update/NFTListPortfolio"
import NFTListPortfolioBadges from "../components/NFTS_update/NFTListPortfolioBadges"
import SharedButtonUp from "../components/Shared/SharedButtonUp"

const PANEL_NAMES = ["NFTs", "Badges"]

export default function NFTs(): ReactElement {
  const nftCount = useBackgroundSelector(selectNFTsCount)
  const badgesCount = useBackgroundSelector(selectNFTBadgesCount)
  const isLoading = useBackgroundSelector(selectIsReloadingNFTs)
  const pageRef = useRef(null)

  const { t } = useTranslation("translation", {
    keyPrefix: "nfts",
  })

  const [panelNumber, setPanelNumber] = useState(0)

  useNFTsReload()

  return (
    <div className="page_content" ref={pageRef}>
      <NFTsHeader />
      <div className="panel_switcher_wrap">
        <SharedPanelSwitcher
          setPanelNumber={setPanelNumber}
          panelNumber={panelNumber}
          panelNames={PANEL_NAMES}
        />
      </div>
      <div className="standard_width">
        {panelNumber === 0 &&
          (nftCount || isLoading ? (
            <>
              <h2>{t("units.collection_other")}</h2>
              <NFTListPortfolio />
            </>
          ) : (
            <NFTsExploreBanner type="nfts" />
          ))}
        {panelNumber === 1 &&
          (badgesCount || isLoading ? (
            <>
              <h2>{t("units.badge_other")}</h2>
              <NFTListPortfolioBadges />
            </>
          ) : (
            <NFTsExploreBanner type="badge" />
          ))}
      </div>
      <SharedButtonUp elementRef={pageRef} offset={100} />
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
          .page_content h2 {
            font-weight: 600;
            font-size: 18px;
            line-height: 24px;
            margin: 10px 0 0;
          }
        `}
      </style>
    </div>
  )
}
