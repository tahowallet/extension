import React, { ReactElement } from "react"
import { NFT } from "@tallyho/tally-background/nfts"
import { NFTCollectionCached } from "@tallyho/tally-background/redux-slices/nfts_update"
import NFTImage from "./NFTImage"
import NFTHover from "./NFTHover"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"

export default function NFTItem<T extends NFT | NFTCollectionCached>(props: {
  item: T
  isCollection?: boolean
  isExpanded?: boolean
  onClick: (value: T) => void
}): ReactElement {
  const { onClick, isCollection = false, isExpanded = false, item } = props
  const { name, network, thumbnail } = item
  const floorPrice =
    "floorPrice" in item && item.floorPrice?.value && item.floorPrice
  const nftsCount = "nfts" in item && item.nfts.length
  const isBadge = "isBadge" in item && item.isBadge
  return (
    <div className="nft_item">
      <div className="nft_image">
        <NFTImage
          src={thumbnail}
          alt={name}
          width={168}
          height={168}
          isBadge={isBadge}
        />
        <div className="nft_image_details">
          <SharedNetworkIcon
            network={network}
            size={24}
            hasBackground
            backgroundOpacity={0.75}
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
          border-radius: 4px;
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
