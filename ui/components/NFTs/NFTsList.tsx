import React, { ReactElement, useState } from "react"
import { NFTItem } from "@tallyho/tally-background/redux-slices/nfts"
import { VariableSizeGrid as List } from "react-window"
import NFTsListItem from "./NFTsListItem"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import NFTsSlideUpPreviewContent from "./NFTsSlideUpPreviewContent"

function NFTsList({
  NFTs,
  height = 538, // TODO: improve scroll, this number is full page NFT list height
}: {
  NFTs: NFTItem[]
  height?: number
}): ReactElement {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [currentNFTPreview, setCurrentNFTPreview] = useState<NFTItem | null>(
    null
  )
  const openPreview = (nft: NFTItem) => {
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
        rowCount={Math.ceil(NFTs.length / 2)}
        rowHeight={() => 216}
        columnWidth={(index) => (index ? 168 : 184)}
        height={height}
        width={352}
        itemData={NFTs}
      >
        {({ columnIndex, rowIndex, data, style }) => (
          <NFTsListItem
            NFT={data[rowIndex * 2 + columnIndex]}
            style={style}
            openPreview={openPreview}
          />
        )}
      </List>
      <SharedSlideUpMenu isOpen={isPreviewOpen} close={closePreview}>
        {currentNFTPreview && (
          <NFTsSlideUpPreviewContent NFT={currentNFTPreview} />
        )}
      </SharedSlideUpMenu>
    </>
  )
}

export default React.memo(NFTsList)
