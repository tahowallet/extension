import React, { ReactElement, useState } from "react"
import { NFT } from "@tallyho/tally-background/redux-slices/nfts"
import NFTsListItem from "./NFTsListItem"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import NFTsSlideUpPreviewContent from "./NFTsSlideUpPreviewContent"

function NFTsList({ nfts }: { nfts: NFT[] }): ReactElement {
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
        {nfts.map((item) => (
          <NFTsListItem
            nft={item}
            openPreview={openPreview}
            key={`${item.tokenID}_${item.contract.address}`}
          />
        ))}
      </div>
      <style jsx>{`
        .nft_list {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
        }
      `}</style>
      <SharedSlideUpMenu isOpen={isPreviewOpen} close={closePreview}>
        {currentNFTPreview && (
          <NFTsSlideUpPreviewContent nft={currentNFTPreview} />
        )}
      </SharedSlideUpMenu>
    </>
  )
}

export default React.memo(NFTsList)
