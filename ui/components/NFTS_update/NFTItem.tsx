import React, { ReactElement, useState } from "react"
import {
  NFTCached,
  NFTCollectionCached,
} from "@tallyho/tally-background/redux-slices/nfts_update"
import { NETWORK_BY_CHAIN_ID } from "@tallyho/tally-background/constants"
import NFTImage from "./NFTImage"
import NFTHover from "./NFTHover"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"

export default function NFTItem<
  T extends NFTCached | NFTCollectionCached
>(props: {
  item: T
  isCollection?: boolean
  isExpanded?: boolean
  onClick: (value: T) => void
}): ReactElement {
  const { onClick, isCollection = false, isExpanded = false, item } = props
  const { name = "No title", chainID, thumbnailURL } = item
  const network = NETWORK_BY_CHAIN_ID[chainID]
  const floorPrice =
    "floorPrice" in item &&
    item.floorPrice?.value !== undefined &&
    item.floorPrice
  const nftsCount = "nftCount" in item && item.nftCount
  const isBadge = "isBadge" in item && item.isBadge

  const [hasHover, setHasHover] = useState(false)
  return (
    <div
      className="nft_item"
      data-testid={
        isCollection ? "nft_list_item_collection" : "nft_list_item_single"
      }
    >
      <div
        className="nft_image"
        onMouseEnter={() => setHasHover(true)}
        onMouseLeave={() => setHasHover(false)}
      >
        <NFTImage
          src={thumbnailURL}
          alt={name}
          width={168}
          height={168}
          isBadge={isBadge}
          isZoomed={hasHover || isExpanded}
        />
        <div className="nft_image_details">
          <SharedNetworkIcon
            network={network}
            size={24}
            hasBackground
            backgroundOpacity={0.75}
            padding={6}
            squared
          />
          {!!floorPrice && (
            <div className="nft_item_price">
              ~{`${floorPrice.value} ${floorPrice.tokenSymbol}`}
            </div>
          )}
        </div>
        <NFTHover
          onClick={() => onClick(item)}
          isCollection={isCollection}
          isExpanded={isExpanded}
        />
      </div>
      <div className="nft_item_details">
        <span className="ellipsis">{name?.length ? name : "No title"}</span>
        {!!nftsCount && <span className="nft_item_count">({nftsCount})</span>}
      </div>
      <style jsx>{`
        .nft_item {
          width: 168px;
          margin: 8px 0;
        }
        .nft_item_price {
          background: rgba(1, 56, 52, 0.75); // --green-95
          padding: 4px 5px;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          letter-spacing: 3%;
          border-radius: 6px;
        }
        .nft_image {
          position: relative;
        }
        .nft_image_details {
          position: absolute;
          top: 0;
          width: 100%;
          padding: 4px;
          display: flex;
          justify-content: space-between;
          width: calc(100% - 8px);
        }
        .nft_item_details {
          height: 16px;
          display: flex;
          font-size: 14px;
          font-weight: 500;
          line-height: 16px;
          margin: 8px 0 4px;
        }
        .nft_item_count {
          flex-shrink: 0;
          color: var(--green-40);
          margin-left: 3px;
        }
      `}</style>
    </div>
  )
}
