import React, { ReactElement } from "react"
import { NFTItem } from "@tallyho/tally-background/redux-slices/nfts"
import NFTsListItem from "./NFTsListItem"

export default function NFTsList({ NFTs }: { NFTs: NFTItem[] }): ReactElement {
  return (
    <>
      <div className="wrap">
        {NFTs.flatMap((NFT) => {
          const src = NFT.media[0].gateway
          return src ? (
            <NFTsListItem
              NFT={NFT}
              key={`${NFT.contract.address}_${NFT.id.tokenId}`}
            />
          ) : (
            []
          )
        })}
      </div>
      <style jsx>{`
        .wrap {
          width: 100%;
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
        }
      `}</style>
    </>
  )
}
