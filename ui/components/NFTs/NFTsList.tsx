import React, { ReactElement, useState } from "react"
import { NFT } from "@tallyho/tally-background/redux-slices/nfts"
import { VariableSizeGrid as List } from "react-window"
import NFTsListItem from "./NFTsListItem"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import NFTsSlideUpPreviewContent from "./NFTsSlideUpPreviewContent"

function NFTsList({
  nfts,
  height = 538, // TODO: improve scroll, this number is full page NFT list height
}: {
  nfts: NFT[]
  height?: number
}): ReactElement {
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
      <List
        columnCount={2}
        rowCount={Math.ceil(nfts.length / 2)}
        rowHeight={() => 216}
        columnWidth={(index) => (index ? 168 : 184)}
        height={height}
        width={352}
        itemData={nfts}
      >
        {({ columnIndex, rowIndex, data, style }) => (
          <NFTsListItem
            nft={data[rowIndex * 2 + columnIndex]}
            style={style}
            openPreview={openPreview}
          />
        )}
      </List>
      <SharedSlideUpMenu isOpen={isPreviewOpen} close={closePreview}>
        {currentNFTPreview && (
          <NFTsSlideUpPreviewContent nft={currentNFTPreview} />
        )}
      </SharedSlideUpMenu>
    </>
  )
}

export default React.memo(NFTsList)
