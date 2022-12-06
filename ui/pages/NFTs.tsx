import React, { ReactElement, useEffect, useState } from "react"
import classNames from "classnames"
import {
  selectNFTBadgesCount,
  selectNFTsCount,
} from "@tallyho/tally-background/redux-slices/selectors"
import { useTranslation } from "react-i18next"
import {
  cleanCachedNFTs,
  refetchCollections,
} from "@tallyho/tally-background/redux-slices/nfts_update"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import NFTsExploreBanner from "../components/NFTS_update/NFTsExploreBanner"
import NFTsHeader from "../components/NFTS_update/NFTsHeader"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"
import NFTListPortfolio from "../components/NFTS_update/NFTListPortfolio"
import NFTListPortfolioBadges from "../components/NFTS_update/NFTListPortfolioBadges"

const PANEL_NAMES = ["NFTs", "Badges"]

export default function NFTs(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const nftCount = useBackgroundSelector(selectNFTsCount)
  const badgesCount = useBackgroundSelector(selectNFTBadgesCount)
  const { t } = useTranslation("translation", {
    keyPrefix: "nfts",
  })

  const [panelNumber, setPanelNumber] = useState(0)

  useEffect(() => {
    dispatch(refetchCollections())
    return () => {
      dispatch(cleanCachedNFTs())
    }
  }, [dispatch])

  return (
    <div className="page_content">
      <NFTsHeader />
      <div
        className={classNames("panel_switcher_wrap", {
          margin: !(nftCount > 0),
        })}
      >
        <SharedPanelSwitcher
          setPanelNumber={setPanelNumber}
          panelNumber={panelNumber}
          panelNames={PANEL_NAMES}
        />
      </div>
      <div className="standard_width">
        {panelNumber === 0 &&
          (nftCount > 0 ? (
            <>
              <h2>{t("units.collection_other")}</h2>
              <NFTListPortfolio />
            </>
          ) : (
            <NFTsExploreBanner type="nfts" />
          ))}
        {panelNumber === 1 &&
          (badgesCount > 0 ? (
            <>
              <h2>{t("units.badge_other")}</h2>
              <NFTListPortfolioBadges />
            </>
          ) : (
            <NFTsExploreBanner type="badge" />
          ))}
      </div>
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
