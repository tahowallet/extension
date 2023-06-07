import React, { ReactElement, useRef, useState } from "react"
import {
  selectAllNFTBadgesCount,
  selectAllNFTsCount,
} from "@tallyho/tally-background/redux-slices/selectors"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import NFTsHeader from "../components/NFTs/NFTsHeader"
import { useBackgroundSelector, useNFTsReload } from "../hooks"
import NFTListPortfolio from "../components/NFTs/NFTListPortfolio"
import SharedButtonUp from "../components/Shared/SharedButtonUp"

const PANEL_NAMES = ["NFTs", "Badges"]

export default function NFTs(): ReactElement {
  const allNftCount = useBackgroundSelector(selectAllNFTsCount)
  const allBadgesCount = useBackgroundSelector(selectAllNFTBadgesCount)
  const pageRef = useRef(null)

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
        {panelNumber === 0 && (
          <NFTListPortfolio type="nfts" isEmptyPortfolio={!(allNftCount > 0)} />
        )}
        {panelNumber === 1 && (
          <NFTListPortfolio
            type="badge"
            isEmptyPortfolio={!(allBadgesCount > 0)}
          />
        )}
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
        `}
      </style>
    </div>
  )
}
