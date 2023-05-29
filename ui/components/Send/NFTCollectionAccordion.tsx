import React, { useEffect, useState } from "react"
import { NETWORK_BY_CHAIN_ID } from "@tallyho/tally-background/constants"
import {
  NFTCollectionCached,
  fetchNFTsFromCollection,
  NFTCached,
} from "@tallyho/tally-background/redux-slices/nfts_update"
import { useBackgroundDispatch } from "../../hooks"
import { blockExplorer } from "../../utils/constants"
import SharedAccordion from "../Shared/SharedAccordion"
import SharedIcon from "../Shared/SharedIcon"
import SharedLoadingDoggo from "../Shared/SharedLoadingDoggo"
import NFTListItem from "./NFTCollectionListItem"
import SharedImageWithFallback from "../Shared/SharedImageWithFallback"

export default function NFTCollectionAccordion({
  collection,
  onSelectNFT,
}: {
  collection: NFTCollectionCached
  onSelectNFT: (nft: NFTCached) => void
}): JSX.Element {
  const dispatch = useBackgroundDispatch()
  const [isExpanded, setIsExpanded] = useState(false)

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isExpanded) {
      setIsLoading(true)
      dispatch(
        fetchNFTsFromCollection({
          collectionID: collection.id,
          account: {
            address: collection.owner,
            network: NETWORK_BY_CHAIN_ID[collection.chainID],
          },
        })
      ).then(() => setIsLoading(false))
    }
  }, [
    dispatch,
    isExpanded,
    collection.id,
    collection.owner,
    collection.chainID,
  ])

  return (
    <div key={collection.id} className="list_item_container">
      <SharedAccordion
        headerElement={
          <div key={collection.id} className="nft_collection">
            <SharedImageWithFallback
              alt={collection.name}
              fallback="images/no_preview.svg"
              width="32"
              height="32"
              src={collection.thumbnailURL}
              customStyles="border-radius: 4px;"
            />
            <span className="ellipsis">{collection.name}</span>
          </div>
        }
        onChange={setIsExpanded}
        contentElement={(isOpen) =>
          isLoading ? (
            <SharedLoadingDoggo
              size={96}
              message="Loading NFTs"
              padding="0 0 8px"
              animated={isOpen}
            />
          ) : (
            <div className="nft_list">
              {collection.nfts.map((nft) => (
                <NFTListItem
                  key={nft.id}
                  id={nft.id}
                  name={nft.name}
                  thumbnailURL={nft.thumbnailURL}
                  onClick={() => onSelectNFT(nft)}
                />
              ))}
            </div>
          )
        }
        style={{
          "--background": "var(--hunter-green)",
          "--background-hover": "var(--hunter-green)",
          "--header-padding": "4px 8px 4px 4px",
          borderRadius: 6,
        }}
      />
      {collection.owner && (
        <SharedIcon
          icon="icons/s/new-tab.svg"
          width={16}
          color="var(--green-40)"
          disabled={collection.nfts.length < 1 || isLoading}
          hoverColor="var(--trophy-gold)"
          onClick={() => {
            const { contract } = collection.nfts[0] ?? {}

            const url = `${
              blockExplorer[collection.chainID].url
            }/token/${contract}`

            window.open(url, "_blank")?.focus()
          }}
          customStyles="margin: 12px 0 auto;"
        />
      )}
      <style jsx>
        {`
          .list_item_container {
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .list_item_container > :global([aria-expanded]) {
            max-width: calc(100% - 24px);
            flex-grow: 1;
          }

          .nft_collection {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-grow: 1;
          }

          .nft_list {
            padding: 10px 0 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
        `}
      </style>
    </div>
  )
}
