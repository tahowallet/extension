import React, { ReactElement } from "react"
import { NFTItem } from "@tallyho/tally-background/redux-slices/nfts"

export default function NFTsListItem({ NFT }: { NFT: NFTItem }): ReactElement {
  if (!NFT.media[0].gateway) return <></>
  return (
    <div className="nft">
      <img width="398" alt={NFT.title} src={NFT.media[0].gateway} />
      <span className="title">{NFT.title}</span>
      <style jsx>{`
        .nft {
          display: flex;
          flex-direction: column;
          margin-bottom: 24px;
        }
        .title {
          max-width: 168px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 8px;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
        }
        img {
          width: 168px;
          height: 168px;
          border-radius: 8px;
          background-color: var(--green-120);
        }
      `}</style>
    </div>
  )
}
