import React, { ReactElement, useState } from "react"
import classNames from "classnames"
import { selectNFTsCount } from "@tallyho/tally-background/redux-slices/selectors"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import NFTsExploreBanner from "../components/NFTS_update/NFTsExploreBanner"
import NFTsHeader from "../components/NFTS_update/NFTsHeader"
import { useBackgroundSelector } from "../hooks"
import NFTListPortfolio from "../components/NFTS_update/NFTListPortfolio"
import NFTListPortfolioBadges from "../components/NFTS_update/NFTListPortfolioBadges"

const PANEL_NAMES = ["NFTs", "Badges"]

export default function NFTs(): ReactElement {
  const nftCount = useBackgroundSelector(selectNFTsCount)

  const [panelNumber, setPanelNumber] = useState(0)

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
            <NFTListPortfolio />
          ) : (
            <NFTsExploreBanner type="nfts" />
          ))}
        {panelNumber === 1 &&
          (nftCount > 0 ? (
            <NFTListPortfolioBadges />
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
        `}
      </style>
    </div>
  )
}
