import {
  selectIsReloadingNFTs,
  selectFilteredNFTBadgesCollections,
  selectFilteredNFTBadgesCount,
  selectFilteredNFTCollections,
  selectFilteredNFTCollectionsCount,
} from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useBackgroundSelector } from "../../hooks"
import SharedBanner from "../Shared/SharedBanner"
import NFTList from "./NFTList"
import NFTsExploreBanner from "./NFTsExploreBanner"
import NoMatchingNFTs from "./NoMatchingNFTs"
import SharedLoadingDoggo from "../Shared/SharedLoadingDoggo"

export default function NFTListPortfolio(props: {
  type: "badge" | "nfts"
  isEmptyPortfolio: boolean
}): ReactElement {
  const { type, isEmptyPortfolio } = props
  const { t } = useTranslation("translation", {
    keyPrefix: "nfts",
  })
  const collections = useBackgroundSelector(
    type === "nfts"
      ? selectFilteredNFTCollections
      : selectFilteredNFTBadgesCollections,
  )
  const nftCount = useBackgroundSelector(
    type === "nfts"
      ? selectFilteredNFTCollectionsCount
      : selectFilteredNFTBadgesCount,
  )
  const isLoading = useBackgroundSelector(selectIsReloadingNFTs)

  if (isEmptyPortfolio) {
    return (
      <>
        {isLoading && (
          <SharedLoadingDoggo
            size={78}
            message="Fetching NFTs"
            padding="20px 0"
          />
        )}
        <NFTsExploreBanner type={type} />
      </>
    )
  }

  return (
    <>
      {nftCount || isLoading ? (
        <>
          <h2>
            {type === "nfts"
              ? t("units.collection_other")
              : t("units.badge_other")}
          </h2>
          <NFTList
            collections={collections}
            expandBadgesCollections={type !== "nfts"}
          />
          {!isLoading && (
            <SharedBanner
              id="nfts_networks_banner"
              canBeClosed
              style={{ margin: "15px 0 30px" }}
              hasShadow
            >
              <div className="simple_text">{t("networksBanner")}</div>
            </SharedBanner>
          )}
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
          .simple_text {
            color: var(--green-20);
            margin: 0 25px 0 4px;
          }
        `}
      </style>
    </>
  )
}
