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
  const [currentNFTPreview, setCurrentNFTPreview] = useState<NFT | null>(null)

  const openPreview = (nft: NFT) => {
    setIsPreviewOpen(true)
    setCurrentNFTPreview(nft)
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
      <SharedSlideUpMenu isOpen={isPreviewOpen} close={closePreview}>
        {currentNFTPreview && <NFTPreview nft={currentNFTPreview} />}
      </SharedSlideUpMenu>
    </>
  )
}
