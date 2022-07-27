import React, { ReactElement, useState } from "react"
import { NFTItem } from "@tallyho/tally-background/redux-slices/nfts"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"

function NFTImage({
  width,
  height,
  alt,
  src,
}: {
  width?: string
  height?: string
  alt: string
  src: string
}): ReactElement {
  return (
    <>
      <img
        alt={alt}
        src={src}
        onError={({ currentTarget }) => {
          // if NFT is incognito let's display placeholder
          currentTarget.onerror = null // eslint-disable-line no-param-reassign
          currentTarget.src = "./images/empty_bowl_@2.png" // eslint-disable-line no-param-reassign
        }}
      />
      <style jsx>{`
        img {
          width: ${width ?? "auto"};
          height: ${height ?? "auto"};
          max-height: 100%;
          border-radius: 8px;
          background-color: var(--green-120);
        }
      `}</style>
    </>
  )
}

export default function NFTsListItem({ NFT }: { NFT: NFTItem }): ReactElement {
  const {
    title,
    media,
    id: { tokenId },
  } = NFT
  const src = media[0].gateway ?? ""

  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  return (
    <button
      className="nft"
      type="button"
      onClick={() => setIsPreviewOpen(true)}
    >
      <SharedSlideUpMenu
        isOpen={isPreviewOpen}
        close={() => setIsPreviewOpen(false)}
      >
        <div>{title}</div>
        <div className="preview">
          <NFTImage alt={title} src={src} />
        </div>
      </SharedSlideUpMenu>
      <NFTImage width="168" height="168" alt={title} src={src} />

      <span className="title">
        <span>{title}</span>
        {/* TODO: add token id properly */}
        <span>#{parseInt(tokenId, 16)}</span>
      </span>
      <style jsx>{`
        .nft {
          display: flex;
          flex-direction: column;
          margin-bottom: 24px;
          position: relative;
          cursor: pointer;
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
        .preview {
          margin: 16px;
          height: 470px;
          width: calc(100% - 32px);
        }
      `}</style>
    </button>
  )
}
