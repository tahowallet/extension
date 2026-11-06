import React, { ReactElement, useCallback, useEffect, useState } from "react"
import {
  fetchMoreNFTsFromCollection,
  fetchNFTsFromCollection,
  NFTCached,
  NFTCollectionCached,
  NFTWithCollection,
} from "@tallyho/tally-background/redux-slices/nfts"
import classNames from "classnames"
import { NETWORK_BY_CHAIN_ID } from "@tallyho/tally-background/constants"
import { isHexString } from "@tallyho/tally-background/lib/utils/hex"
import NFTItem from "./NFTItem"
import { useBackgroundDispatch, useIntersectionObserver } from "../../hooks"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"

export default function NFTCollection(props: {
  collection: NFTCollectionCached
  isExpanded: boolean
  setExpandedID: (id: string | null, owner: string | null) => void
  openPreview: (current: NFTWithCollection) => void
}): ReactElement | null {
  const { collection, openPreview, isExpanded, setExpandedID } = props
  const { id, owner, chainID, nfts, nftCount, hasNextPage } = collection
  const dispatch = useBackgroundDispatch()
  const network = NETWORK_BY_CHAIN_ID[chainID]

  const [isLoading, setIsLoading] = useState(false) // initial update of collection
  const [isUpdating, setIsUpdating] = useState(false) // update on already loaded collection
  const [wasUpdated, setWasUpdated] = useState(false) // to fetch NFTs data only once during the component lifespan

  const fetchCollection = useCallback(async () => {
    // Collection owners are stored normalized, so this only skips malformed
    // data.
    if (!isHexString(owner)) return
    await dispatch(
      fetchNFTsFromCollection({
        collectionID: id,
        account: { address: owner, network },
      }),
    )
  }, [id, owner, network, dispatch])

  const fetchMore = useCallback(async () => {
    // Collection owners are stored normalized, so this only skips malformed
    // data.
    if (!isHexString(owner)) return
    await dispatch(
      fetchMoreNFTsFromCollection({
        collectionID: id,
        account: { address: owner, network },
      }),
    )
  }, [id, owner, network, dispatch])

  const intersectionCallback = useCallback<IntersectionObserverCallback>(
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
    [fetchCollection, isLoading, isUpdating, wasUpdated, nfts.length],
  )

  const collectionRef = useIntersectionObserver<HTMLLIElement>(
    intersectionCallback,
    { threshold: 0.1 },
  )

  const loadMoreCallback = useCallback<IntersectionObserverCallback>(
    ([element]) => {
      if (element.isIntersecting && !isUpdating) {
        if (hasNextPage) setIsUpdating(true) // if next page is known show loader
        fetchMore().finally(() => {
          setIsUpdating(false)
        })
      }
    },
    [fetchMore, hasNextPage, isUpdating],
  )

  const loadMoreRef = useIntersectionObserver<HTMLDivElement>(
    loadMoreCallback,
    { threshold: 0.1 },
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

  const toggleCollection = () =>
    isExpanded ? setExpandedID(null, null) : setExpandedID(id, owner)

  const onItemClick = (nft: NFTCached) => openPreview({ nft, collection })

  if ((!nftCount || !nfts.length) && !isLoading && wasUpdated) return null

  return (
    <>
      <div
        className={classNames("nft_collection_wrapper", {
          expanded: isExpanded && !isLoading,
          invisible: !nftCount,
        })}
        data-testid="nft_list_item"
      >
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
            style={{ margin: "8px 0 34px" }}
          >
            {nfts.length === 1 ? (
              <NFTItem
                item={{
                  ...collection,
                  thumbnailURL: nfts[0].thumbnailURL || collection.thumbnailURL,
                }}
                onClick={() => onItemClick(nfts[0])}
              />
            ) : (
              <NFTItem
                item={{
                  ...collection,
                  thumbnailURL:
                    nfts[0]?.thumbnailURL || collection.thumbnailURL,
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
                  style={{ margin: "8px 0" }}
                />
                <div ref={loadMoreRef} className="nft_load_more" />
              </>
            )}
          </SharedSkeletonLoader>
        </li>
      </div>
      <style jsx>{`
        .nft_collection_wrapper {
          position: relative;
          width: 168px;
          min-height: 212px;
        }
        .nft_collection {
          position: absolute;
          margin: 0;
          padding: 0;
          background: transparent;
          width: 168px;
          transition:
            width 200ms ease-in-out,
            margin 200ms ease-in-out,
            padding 200ms ease-in-out,
            border-radius 200ms ease-in-out,
            background var(--fade),
            box-shadow var(--fade);
        }
        .nft_collection.expanded {
          width: 352px;
          z-index: 3;
          margin: 8px -16px;
          padding: 8px 16px 6px;
          background: var(--green-120);
          box-shadow: var(--shadow-heavy);
          border-radius: 16px;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
        }
        .nft_collection_wrapper:nth-child(even) .nft_collection.expanded {
          right: 0;
        }
        .nft_collection_wrapper.invisible {
          opacity: 0;
          pointer-events: none;
          position: absolute;
          bottom: 0;
        }
        .nft_load_more {
          width: 100%;
          height: 1px;
        }
      `}</style>
      <style jsx global>{`
        @keyframes show {
          0% {
            opacity: 0;
            position: absolute;
          }
          50% {
            position: static;
          }
          100% {
            opacity: 1;
          }
        }
        .nft_collection.expanded .nft_item:not(:first-child),
        .nft_collection.expanded .skeleton {
          animation-name: show;
          animation-timing-function: ease-in-out;
          animation-duration: 0.8s;
        }
      `}</style>
    </>
  )
}
