import React, { ReactElement } from "react"
import { NFT } from "@tallyho/tally-background/redux-slices/nfts"
import NFTsImage from "./NFTsImage"

function NFTsListItem({
  nft,
  style,
  openPreview,
}: {
  nft?: NFT
  openPreview: (nft: NFT) => void
  style?: React.CSSProperties
}): ReactElement {
  // getting undefined sometimes, react-window renders second column even if there is no item?
  if (!nft) return <></>

  const { name, media } = nft
  const src = media[0]?.url ?? ""

  return (
    <>
      <button
        className="nft"
        type="button"
        onClick={() => openPreview(nft)}
        style={style}
      >
        <NFTsImage width={168} height={168} alt={name} src={src} />
        <span className="title">
          <span>{name || "No title"}</span>
        </span>
      </button>
      <style jsx>{`
        .nft {
          display: flex;
          flex-direction: column;
          position: relative;
          cursor: pointer;
          padding-top: 16px;
        }
        .nft:hover:after {
          content: "";
          width: 168px;
          height: 168px;
          border-radius: 8px;
          position: absolute;
          background: #fff;
          opacity: 0.2;
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
      `}</style>
    </>
  )
}

export default React.memo(NFTsListItem)
