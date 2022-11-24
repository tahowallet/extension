import { NFT } from "@tallyho/tally-background/nfts"
import { NFTCollectionCached } from "@tallyho/tally-background/redux-slices/nfts_update"
import React, { ReactElement } from "react"
import SharedButton from "../../Shared/SharedButton"
import SharedNetworkIcon from "../../Shared/SharedNetworkIcon"
import NFTImage from "./NFTImage"

export default function NFTPreview(props: {
  nft: NFT
  collection: NFTCollectionCached
}): ReactElement {
  const { nft, collection } = props
  const { thumbnail, name, network, owner, description, attributes } = nft
  const floorPrice =
    "floorPrice" in collection &&
    collection.floorPrice?.value &&
    collection.floorPrice
  return (
    <div className="preview_wrapper">
      <div className="preview_image">
        <NFTImage src={thumbnail} alt={name} />
        <SharedNetworkIcon network={network} size={24} hasBackground />
        <div className="preview_details">
          <div>
            <span className="preview_details_header">Owner</span>
            <span className="preview_details_value">{owner}</span>
          </div>
          <div>
            <span className="preview_details_header">Floor price</span>
            <span className="preview_details_value">
              {floorPrice
                ? `~${floorPrice.value} ${floorPrice.tokenSymbol}`
                : "-"}
            </span>
          </div>
        </div>
      </div>

      <div className="preview_header">
        <h1>{name}</h1>
        <SharedButton
          type="tertiary"
          size="small"
          iconSmall="send"
          iconPosition="left"
        >
          Send
        </SharedButton>
      </div>

      <div className="preview_section">
        <div className="preview_section_header">View on</div>
        <SharedButton type="secondary" size="small">
          Looksrare
        </SharedButton>
        <SharedButton type="secondary" size="small">
          Opensea
        </SharedButton>
        <SharedButton type="secondary" size="small">
          Galxe
        </SharedButton>
      </div>

      <div className="preview_section">
        <div className="preview_section_header">Description</div>
        <p>{description}</p>
      </div>

      <div className="preview_section preview_section_row">
        <div className="preview_section_column">
          <div className="preview_section_header">Items in collection</div>
          <p>TODO</p>
        </div>
        <div className="preview_section_column">
          <div className="preview_section_header">Creator</div>
          <p>TODO</p>
        </div>
      </div>

      <div className="preview_section">
        <div className="preview_section_header">Properties</div>
        {attributes.map(({ trait, value }) => (
          <div className="preview_property">
            <span className="preview_property_trait">{trait}</span>
            <span className="preview_property_value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
