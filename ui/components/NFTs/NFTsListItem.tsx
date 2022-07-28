import React, { ReactElement, useState } from "react"
import { NFTItem } from "@tallyho/tally-background/redux-slices/nfts"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import NFTsImage from "./NFTsImage"
import NFTsSlideUpPreviewContent from "./NFTsSlideUpPreviewContent"

export default function NFTsListItem({ NFT }: { NFT: NFTItem }): ReactElement {
  const {
    title,
    media,
    id: { tokenId },
    chainID,
    contract: { address },
  } = NFT
  const src = media[0].gateway ?? ""

  const parsedTokenID = parseInt(tokenId, 16)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  return (
    <>
      <SharedSlideUpMenu
        isOpen={isPreviewOpen}
        close={() => setIsPreviewOpen(false)}
      >
        <NFTsSlideUpPreviewContent
          title={title}
          src={src}
          chainID={chainID ?? 0}
          contractAddress={address}
          tokenID={parsedTokenID}
        />
      </SharedSlideUpMenu>

      <button
        className="nft"
        type="button"
        onClick={() => setIsPreviewOpen(true)}
      >
        <NFTsImage width="168" height="168" alt={title} src={src} />
        <span className="title">
          <span>{title}</span>
          {/* TODO: add token id properly */}
          <span>#{parsedTokenID}</span>
        </span>
      </button>
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
      `}</style>
    </>
  )
}
