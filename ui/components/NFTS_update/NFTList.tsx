import {
  NFTCollectionCached,
  NFTWithCollection,
} from "@tallyho/tally-background/redux-slices/nfts_update"
import { selectIsReloadingNFTs } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement, useState } from "react"
import { useBackgroundSelector } from "../../hooks"
import SharedLoadingDoggo from "../Shared/SharedLoadingDoggo"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import NFTCollection from "./NFTCollection"
import NFTItem from "./NFTItem"
import NFTPreview from "./NFTPreview"

export default function NFTList(props: {
  collections: NFTCollectionCached[]
  expandBadgesCollections?: boolean
}): ReactElement {
  const { collections, expandBadgesCollections = false } = props
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [currentNFTPreview, setCurrentNFTPreview] =
    useState<NFTWithCollection | null>(null)

  const isReloading = useBackgroundSelector(selectIsReloadingNFTs)

  const openPreview = (current: NFTWithCollection) => {
    setIsPreviewOpen(true)
    setCurrentNFTPreview(current)
  }

  const closePreview = () => {
    setIsPreviewOpen(false)
    setCurrentNFTPreview(null)
  }

  if (isReloading)
    return (
      <SharedLoadingDoggo
        size={78}
        message="Fetching NFTs"
        padding="20px 0 0"
      />
    )

  return (
    <>
      <ul className="nft_list">
        {collections.map((collection) =>
          collection.hasBadges &&
          expandBadgesCollections &&
          collection.nfts.length ? (
            collection.nfts.map((nft) => (
              <NFTItem
                key={`${nft.id}_${nft.owner}`}
                item={nft}
                onClick={() => openPreview({ nft, collection })}
              />
            ))
          ) : (
            <NFTCollection
              key={`${collection.id}_${collection.owner}`}
              openPreview={openPreview}
              collection={collection}
            />
          )
        )}
      </ul>
      <SharedSlideUpMenu
        isOpen={isPreviewOpen}
        close={closePreview}
        size="large"
        isFullScreen
      >
        {currentNFTPreview && (
          <NFTPreview
            nft={currentNFTPreview.nft}
            collection={currentNFTPreview.collection}
          />
        )}
      </SharedSlideUpMenu>
      <style jsx>{`
        .nft_list {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          margin: 8px 0;
        }
      `}</style>
    </>
  )
}
