import {
  selectNFTBadgesCollections,
  selectNFTCollections,
} from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useBackgroundSelector } from "../../hooks"
import NFTList from "./NFTList"
import NFTsExploreBanner from "./NFTsExploreBanner"
import NoMatchingNFTs from "./NoMatchingNFTs"

export default function NFTListPortfolio(props: {
  type: "badge" | "nfts"
  isEmptyPortfolio: boolean
}): ReactElement {
  const { type, isEmptyPortfolio } = props
  const { t } = useTranslation("translation", {
    keyPrefix: "nfts",
  })
  const collections = useBackgroundSelector(
    type === "nfts" ? selectNFTCollections : selectNFTBadgesCollections
  )

  if (isEmptyPortfolio) {
    return <NFTsExploreBanner type={type} />
  }

  return (
    <>
      {collections.length > 0 ? (
        <>
          <h2>
            {type === "nfts"
              ? t("units.collection_other")
              : t("units.badge_other")}
          </h2>
          <NFTList collections={collections} />
        </>
      ) : (
        <NoMatchingNFTs type={type} />
      )}
      <style jsx>
        {`
          h2 {
            font-weight: 600;
            font-size: 18px;
            line-height: 24px;
            margin: 10px 0 0;
          }
        `}
      </style>
    </>
  )
}
