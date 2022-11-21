import { NFT } from "@tallyho/tally-background/nfts"
import React, { ReactElement, useState } from "react"
import SharedSlideUpMenu from "../../Shared/SharedSlideUpMenu"
import NFTCollection from "./NFTCollection"
import NFTPreview from "./NFTPreview"

export default function NFTList(): ReactElement {
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
      <div className="nft_list">
        <NFTCollection openPreview={openPreview} />
        <NFTCollection openPreview={openPreview} />
        <NFTCollection openPreview={openPreview} />
        <NFTCollection openPreview={openPreview} />
      </div>
      <SharedSlideUpMenu isOpen={isPreviewOpen} close={closePreview}>
        {currentNFTPreview && <NFTPreview nft={currentNFTPreview} />}
      </SharedSlideUpMenu>
    </>
  )
}
