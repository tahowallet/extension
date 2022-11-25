import {
  selectMainCurrencySign,
  selectMainCurrencySymbol,
} from "@tallyho/tally-background/redux-slices/selectors"
import { formatCurrencyAmount } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import React, { ReactElement } from "react"
import NFTsExploreBanner from "../components/NFTS_update/NFTsExploreBanner"
import NFTsHeader from "../components/NFTS_update/NFTsHeader"
import { useBackgroundSelector } from "../hooks"

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
  const NFTsLoading = useBackgroundSelector(() => false)

  // TODO: Remove these stubs
  const someAmount = formatCurrencyAmount(mainCurrencySymbol, 240_241, 0)
  const someAmountInETH = "21.366 ETH"

  return (
    <div className="page_content">
      <NFTsHeader
        nfts={nftCounts}
        collections={collectionCount}
        badges={badgeCount}
        totalInCurrency={someAmount}
        totalInETH={someAmountInETH}
        mainCurrencySign={mainCurrencySign}
        loading={NFTsLoading}
      />

      {/* TODO: Move these to their respective tab */}
      <NFTsExploreBanner type="nfts" />
      <NFTsExploreBanner type="badge" />

      <style jsx>
        {`
          .page_content {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: center;
          }
        `}
      </style>
    </div>
  )
}
