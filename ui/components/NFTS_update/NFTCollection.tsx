import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { NFT } from "@tallyho/tally-background/nfts"
import {
  fetchNFTsFromCollection,
  NFTCollectionCached,
} from "@tallyho/tally-background/redux-slices/nfts_update"
import classNames from "classnames"
import NFTItem from "./NFTItem"
import { useBackgroundDispatch } from "../../hooks"

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
    <>
      <li
        className={classNames("nft_collection", {
          expanded: isExpanded,
        })}
      >
        <NFTItem
          item={collection}
          onClick={toggleCollection}
          isCollection
          isExpanded={isExpanded}
        />
        {isExpanded &&
          collection.nfts.map((nft) => (
            <NFTItem key={nft.id} item={nft} onClick={onItemClick} />
          ))}
      </li>
      <style jsx>{`
        .nft_collection {
          margin: 0;
          padding: 0;
          background: transparent;
          width: 168px;
          transition: all 200ms ease-in-out;
        }
        .nft_collection.expanded {
          margin: 8px -16px;
          width: 100%;
          padding: 8px 16px 6px;
          background: var(--green-120);
          border-radius: 16px;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
        }
      `}</style>
    </>
  )
}
