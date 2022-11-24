import { NFT } from "@tallyho/tally-background/nfts"
import { NFTCollectionCached } from "@tallyho/tally-background/redux-slices/nfts_update"
import React, { ReactElement, useState } from "react"
import SharedSlideUpMenu from "../../Shared/SharedSlideUpMenu"
import NFTCollection from "./NFTCollection"
import NFTPreview from "./NFTPreview"

export default function NFTList(props: {
  collections: NFTCollectionCached[]
}): ReactElement {
  const { collections } = props
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [currentNFTPreview, setCurrentNFTPreview] = useState<{
    nft: NFT
    collection: NFTCollectionCached
  } | null>(null)

  const openPreview = (current: {
    nft: NFT
    collection: NFTCollectionCached
  }) => {
    setIsPreviewOpen(true)
    setCurrentNFTPreview(current)
  }

  const closePreview = () => {
    setIsPreviewOpen(false)
    setCurrentNFTPreview(null)
  }

  return (
    <>
      <ul className="nft_list">
        {collections.map((collection) => (
          <NFTCollection
            key={collection.id}
            openPreview={openPreview}
            collection={collection}
          />
        ))}
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
