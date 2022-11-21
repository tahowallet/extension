import React, { ReactElement } from "react"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import NFTImage from "./NFTImage"
import NFTHover from "./NFTHover"

export default function NFTsItem(props: {
  item: {
    id: string
    name?: string
    network: EVMNetwork
    thumbnail?: string
    floorPriceValue?: string
    count?: number
  }
  isCollection?: boolean
  isExpanded?: boolean
  onClick: (id: string) => void
}): ReactElement {
  const { onClick, isCollection = false, isExpanded = false, item } = props
  const {
    id,
    name = "No title",
    network,
    thumbnail,
    floorPriceValue,
    count = 0,
  } = item

  return (
    <div className="nft_item">
      <div>
        <NFTImage src={thumbnail} alt={name} width={100} />
        <div className="nft_network" />
        {floorPriceValue && (
          <div className="nft_item_price">{floorPriceValue}</div>
        )}
        <NFTHover
          onClick={() => onClick(id)}
          isCollection={isCollection}
          isExpanded={isExpanded}
        />
      </div>
      <div className="nft_item_details">
        <span className="nft_item_name">{name}</span>
        {count && <span>({count})</span>}
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
