import React, { ReactElement } from "react"
import { NFTItem } from "@tallyho/tally-background/redux-slices/nfts"
import NFTsListItem from "./NFTsListItem"

export default function NFTsList({ NFTs }: { NFTs: NFTItem[] }): ReactElement {
  return (
    <>
      <div className="wrap">
        {NFTs.map((NFT) => {
          return <NFTsListItem NFT={NFT} />
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
