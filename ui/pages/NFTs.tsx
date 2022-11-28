import React, { ReactElement, useState } from "react"
import classNames from "classnames"
import {
  selectMainCurrencySign,
  selectMainCurrencySymbol,
} from "@tallyho/tally-background/redux-slices/selectors"
import { formatCurrencyAmount } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import NFTsExploreBanner from "../components/NFTS_update/NFTsExploreBanner"
import NFTsHeader from "../components/NFTS_update/NFTsHeader"
import { useBackgroundSelector } from "../hooks"
import NFTListPortfolio from "../components/NFTS_update/NFTListPortfolio"
import NFTListPortfolioBadges from "../components/NFTS_update/NFTListPortfolioBadges"

const PANEL_NAMES = ["NFTs", "Badges"]

// TODO: Remove these stubs
const stubSelectNFTCount = () => 16
const stubSelectCollectionCount = () => 2
const stubSelectBadgeCount = () => 5

export default function NFTs(): ReactElement {
  const nftCounts = useBackgroundSelector(stubSelectNFTCount)
  const collectionCount = useBackgroundSelector(stubSelectCollectionCount)
  const badgeCount = useBackgroundSelector(stubSelectBadgeCount)

  const mainCurrencySign = useBackgroundSelector(selectMainCurrencySign)
  const mainCurrencySymbol = useBackgroundSelector(selectMainCurrencySymbol)
  const isLoading = useBackgroundSelector(() => false)

  // TODO: Remove these stubs
  const someAmount = formatCurrencyAmount(mainCurrencySymbol, 240_241, 0)
  const someAmountInETH = "21.366 ETH"
  const [panelNumber, setPanelNumber] = useState(0)

  return (
    <div className="page_content">
      <NFTsHeader
        nfts={nftCounts}
        collections={collectionCount}
        badges={badgeCount}
        totalInCurrency={someAmount}
        totalInETH={someAmountInETH}
        mainCurrencySign={mainCurrencySign}
        loading={isLoading}
      />
      <div
        className={classNames("panel_switcher_wrap", {
          margin: !(nftCounts > 0),
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
          (nftCounts > 0 ? (
            <NFTListPortfolio />
          ) : (
            <NFTsExploreBanner type="nfts" />
          ))}
        {panelNumber === 1 &&
          (nftCounts > 0 ? (
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
