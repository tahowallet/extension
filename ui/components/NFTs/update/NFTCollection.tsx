import { ETHEREUM } from "@tallyho/tally-background/constants"
import { NFT } from "@tallyho/tally-background/nfts"
import React, { ReactElement, useCallback, useState } from "react"
import NFTItem from "./NFTItem"

const fakeItem: NFT = {
  id: "test",
  name: "test",
  network: ETHEREUM,
  collectionID: "testCollection",
  attributes: [],
  contract: "",
  owner: "",
  achievement: null,
}

export default function NFTCollection(props: {
  openPreview: (nft: NFT) => void
}): ReactElement {
  const { openPreview } = props
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleCollection = useCallback(() => setIsExpanded((val) => !val), [])
  const openPreviewWithNFT = () => openPreview(fakeItem)
  return (
    <div className="nft_collection">
      <div className="nft_collection_item">
        <NFTItem
          item={fakeItem}
          onClick={toggleCollection}
          isCollection
          isExpanded={isExpanded}
        />
      </div>
      {isExpanded && (
        <>
          <NFTItem item={fakeItem} onClick={openPreviewWithNFT} />
          <NFTItem item={fakeItem} onClick={openPreviewWithNFT} />
          <NFTItem item={fakeItem} onClick={openPreviewWithNFT} />
          <NFTItem item={fakeItem} onClick={openPreviewWithNFT} />
          <NFTItem item={fakeItem} onClick={openPreviewWithNFT} />
        </>
      )}
    </div>
  )
}
