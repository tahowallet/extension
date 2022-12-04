import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { NFT } from "@tallyho/tally-background/nfts"
import {
  fetchMoreNFTsFromCollection,
  fetchNFTsFromCollection,
  NFTCollectionCached,
  NFTWithCollection,
} from "@tallyho/tally-background/redux-slices/nfts_update"
import classNames from "classnames"
import NFTItem from "./NFTItem"
import { useBackgroundDispatch, useIntersectionObserver } from "../../hooks"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"

export default function NFTCollection(props: {
  collection: NFTCollectionCached
  openPreview: (current: NFTWithCollection) => void
}): ReactElement {
  const { collection, openPreview } = props
  const { id, owner, network, nfts, hasNextPage } = collection
  const dispatch = useBackgroundDispatch()

  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // initial update of collection
  const [isUpdating, setIsUpdating] = useState(false) // update on already loaded collection
  const [wasUpdated, setWasUpdated] = useState(false) // to fetch NFTs data only once during the component lifespan

  const fetchCollection = useCallback(
    () =>
      dispatch(
        fetchNFTsFromCollection({
          collectionID: id,
          account: { address: owner, network },
        })
      ),
    [id, owner, network, dispatch]
  )

  const fetchMore = useCallback(
    () =>
      dispatch(
        fetchMoreNFTsFromCollection({
          collectionID: id,
          account: { address: owner, network },
        })
      ),
    [id, owner, network, dispatch]
  )

  const intersectionCallback = useCallback(
    ([element]) => {
      if (element.isIntersecting && !wasUpdated) {
        // if collection doesn't have nfts then load some
        if (!nfts.length && !isLoading) {
          setIsLoading(true)
          fetchCollection().finally(() => {
            setIsLoading(false)
            setWasUpdated(true)
          })
        }

        // if we show only one element (no expanding option) then update on intersection
        if (nfts.length === 1 && !isUpdating) {
          setIsUpdating(true)
          fetchCollection().finally(() => {
            setIsUpdating(false)
            setWasUpdated(true)
          })
        }
      }
    },
    [fetchCollection, isLoading, isUpdating, wasUpdated, nfts.length]
  )

  const collectionRef = useIntersectionObserver<HTMLLIElement>(
    intersectionCallback,
    { threshold: 0.1 }
  )

  const loadMoreCallback = useCallback(
    ([element]) => {
      if (element.isIntersecting && !isUpdating) {
        if (hasNextPage) setIsUpdating(true) // if next page is known show loader
        fetchMore().finally(() => {
          setIsUpdating(false)
        })
      }
    },
    [fetchMore, hasNextPage, isUpdating]
  )

  const loadMoreRef = useIntersectionObserver<HTMLDivElement>(
    loadMoreCallback,
    { threshold: 0.1 }
  )

  useEffect(() => {
    // update collection on expand if needed
    if (isExpanded && !wasUpdated) {
      setIsUpdating(true)
      fetchCollection().finally(() => {
        setIsUpdating(false)
        setWasUpdated(true)
      })
    }
  }, [fetchCollection, isExpanded, wasUpdated])

  const toggleCollection = () => setIsExpanded((val) => !val)

  const onItemClick = (nft: NFT) => openPreview({ nft, collection })

  return (
    <>
      <li
        ref={collectionRef}
        className={classNames("nft_collection", {
          expanded: isExpanded && !isLoading,
        })}
      >
        <SharedSkeletonLoader
          isLoaded={!isLoading && !!nfts.length}
          width={168}
          height={168}
          customStyles="margin: 8px 0 34px;"
        >
          {nfts.length === 1 ? (
            <NFTItem
              item={{
                ...collection,
                thumbnail: nfts[0].thumbnail || collection.thumbnail,
              }}
              onClick={() => onItemClick(nfts[0])}
            />
          ) : (
            <NFTItem
              item={{
                ...collection,
                thumbnail: nfts[0]?.thumbnail || collection.thumbnail,
              }}
              onClick={toggleCollection}
              isCollection
              isExpanded={isExpanded}
            />
          )}
          {isExpanded && (
            <>
              {nfts.map((nft) => (
                <NFTItem key={nft.id} item={nft} onClick={onItemClick} />
              ))}
              <SharedSkeletonLoader
                isLoaded={!isUpdating}
                width={168}
                height={168}
                customStyles="margin: 8px 0;"
              />
              <div ref={loadMoreRef} className="nft_load_more" />
            </>
          )}
        </SharedSkeletonLoader>
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
        .nft_load_more {
          width: 100%;
          height: 1px;
        }
      `}</style>
    </>
  )
}
