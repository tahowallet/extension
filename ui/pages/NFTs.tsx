import React, { ReactElement, useState } from "react"
import classNames from "classnames"
import {
  selectAllNFTBadgesCount,
  selectAllNFTsCount,
} from "@tallyho/tally-background/redux-slices/selectors"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import NFTsHeader from "../components/NFTS_update/NFTsHeader"
import { useBackgroundSelector, useNFTsReload } from "../hooks"
import NFTListPortfolio from "../components/NFTS_update/NFTListPortfolio"

const PANEL_NAMES = ["NFTs", "Badges"]

export default function NFTs(): ReactElement {
  const allNftCount = useBackgroundSelector(selectAllNFTsCount)
  const allBadgesCount = useBackgroundSelector(selectAllNFTBadgesCount)

  const [panelNumber, setPanelNumber] = useState(0)

  useNFTsReload()

  return (
    <div className="page_content">
      <NFTsHeader />
      <div
        className={classNames("panel_switcher_wrap", {
          margin: !(allNftCount > 0),
        })}
      >
        <SharedPanelSwitcher
          setPanelNumber={setPanelNumber}
          panelNumber={panelNumber}
          panelNames={PANEL_NAMES}
        />
      </div>
      <div className="standard_width">
        {panelNumber === 0 && (
          <NFTListPortfolio type="nfts" isEmptyPortfolio={!(allNftCount > 0)} />
        )}
        {panelNumber === 0 && (
          <NFTListPortfolio
            type="badge"
            isEmptyPortfolio={!(allBadgesCount > 0)}
          />
        )}
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
