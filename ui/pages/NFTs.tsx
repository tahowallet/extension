import { getHasAccounts } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import NFTsExploreBanner from "../components/NFTS_update/NFTsExploreBanner"
import NFTsHeader from "../components/NFTS_update/NFTsHeader"
import { useBackgroundSelector } from "../hooks"

export default function NFTs(): ReactElement {
  const hasAccounts = useBackgroundSelector(getHasAccounts)

  return (
    <div className="page_content">
      <NFTsHeader hasAccounts={hasAccounts} />

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
