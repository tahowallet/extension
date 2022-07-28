import React, { ReactElement, useState } from "react"
import { NFTItem } from "@tallyho/tally-background/redux-slices/nfts"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import NFTsImage from "./NFTsImage"

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
        <div className="preview_header">
          <div className="preview_text">{title}</div>
          <SharedIcon
            icon="icons/s/new-tab.svg"
            width={16}
            color="var(--green-40)"
            hoverColor="#fff"
            onClick={() => {
              window.open(`...`, "_blank")?.focus()
            }}
          />
        </div>
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
        .preview_header {
          margin: 0 24px;
          display: flex;
          align-items: center;
        }
        .preview_text {
          font-size: 18px;
          line-height: 24px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-right: 8px;
          max-width: calc(100% - 48px);
        }
        .preview {
          display: flex;
          align-items: center;
          justify-items: center;
          margin: 16px 24px;
          height: 460px;
          width: calc(100% - 48px);
        }
      `}</style>
    </button>
  )
}
