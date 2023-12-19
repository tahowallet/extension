import React from "react"
import { NFT } from "@tallyho/tally-background/nfts"
import SharedIcon from "../Shared/SharedIcon"
import SharedImageWithFallback from "../Shared/SharedImageWithFallback"

export const noPreviewImg = "/images/no_preview.svg"

export default function NFTCollectionListItem({
  id,
  name = id,
  thumbnailURL = noPreviewImg,
  onClick,
}: Pick<NFT, "id" | "name" | "thumbnailURL"> & {
  onClick: () => void
}): JSX.Element {
  return (
    <div key={id}>
      <SharedImageWithFallback
        width="64"
        height="64"
        src={thumbnailURL}
        fallback={noPreviewImg}
        loading="lazy"
        alt={name}
        style={{
          borderRadius: 4,
          objectPosition: "center",
          objectFit: "cover",
        }}
      />
      <button type="button" className="label" onClick={onClick}>
        <p className="ellipsis">{name}</p>
        <SharedIcon height={16} width={16} icon="icons/s/continue.svg" />
      </button>
      <style jsx>{`
        div {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .label {
          font-family: "Segment";
          font-style: normal;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;

          display: flex;
          align-items: center;
          letter-spacing: 0.03em;
          justify-content: space-between;
          color: var(--white);
          flex-grow: 1;
          overflow: hidden;
          gap: 8px;
        }

        .label:hover {
          color: var(--trophy-gold);
        }

        .label p {
          max-width: calc(100% - 24px);
        }

        .label :global(.icon) {
          background-color: var(--green-40);
        }

        .label:hover :global(.icon) {
          background-color: currentColor;
        }
      `}</style>
    </div>
  )
}
