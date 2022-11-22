import React, { ReactElement } from "react"
import { NFT } from "@tallyho/tally-background/nfts"
import { NFTCollectionCached } from "@tallyho/tally-background/redux-slices/nfts_update"
import NFTImage from "./NFTImage"
import NFTHover from "./NFTHover"

export default function NFTsItem<T extends NFT | NFTCollectionCached>(props: {
  item: T
  isCollection?: boolean
  isExpanded?: boolean
  onClick: (value: T) => void
}): ReactElement {
  const { onClick, isCollection = false, isExpanded = false, item } = props
  const { name = "No title", network, thumbnail } = item

  return (
    <div className="nft_item">
      <div>
        <NFTImage src={thumbnail} alt={name} width={100} />
        <div className="nft_network" />
        {"floorPrice" in item && (
          <div className="nft_item_price">{item.floorPrice}</div>
        )}
        <NFTHover
          onClick={() => onClick(item)}
          isCollection={isCollection}
          isExpanded={isExpanded}
        />
      </div>
      <div className="nft_item_details">
        <span className="nft_item_name">{name}</span>
        {"nfts" in item && <span>({item.nfts.length})</span>}
      </div>
      <style jsx>{`
        .nft_item {
        }
        .nft_item_price {
        }
        .nft_item_details {
        }
        .nft_item_name {
        }

        // TODO: name network icon component
        .nft_network {
          background: url("./images/networks/${network.name
            ?.replaceAll(" ", "")
            .toLowerCase()}-square@2x.png");
          background-size: cover;
          height: 16px;
          width: 16px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}
