import React, { ReactElement, useCallback, useState } from "react"
import { NFT } from "@tallyho/tally-background/nfts"
import { NFTCollectionCached } from "@tallyho/tally-background/redux-slices/nfts_update"
import NFTItem from "./NFTItem"

export default function NFTCollection(props: {
  collection: NFTCollectionCached
  openPreview: (current: { nft: NFT; collection: NFTCollectionCached }) => void
}): ReactElement {
  const { collection, openPreview } = props
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleCollection = useCallback(() => setIsExpanded((val) => !val), [])

  const onItemClick = (nft: NFT) => openPreview({ nft, collection })

  return (
    <li className="nft_collection">
      <div className="nft_collection_item">
        <NFTItem
          item={collection}
          onClick={toggleCollection}
          isCollection
          isExpanded={isExpanded}
        />
      </div>
      {isExpanded &&
        collection.nfts.map((nft) => (
          <NFTItem item={nft} onClick={onItemClick} />
        ))}
    </li>
  )
}
