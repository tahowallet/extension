import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { NFT } from "@tallyho/tally-background/nfts"
import {
  fetchNFTsFromCollection,
  NFTCollectionCached,
} from "@tallyho/tally-background/redux-slices/nfts_update"
import NFTItem from "./NFTItem"
import { useBackgroundDispatch } from "../../../hooks"

export default function NFTCollection(props: {
  collection: NFTCollectionCached
  openPreview: (current: { nft: NFT; collection: NFTCollectionCached }) => void
}): ReactElement {
  const { collection, openPreview } = props
  const { id, owner, network } = collection
  const dispatch = useBackgroundDispatch()
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleCollection = useCallback(() => setIsExpanded((val) => !val), [])

  const onItemClick = (nft: NFT) => openPreview({ nft, collection })

  useEffect(() => {
    if (isExpanded) {
      dispatch(
        fetchNFTsFromCollection({
          collectionID: id,
          account: { address: owner, network },
        })
      )
    }
  }, [dispatch, isExpanded, id, owner, network])

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
