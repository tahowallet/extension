import React from "react"
import { NFT } from "@tallyho/tally-background/nfts"
import SharedIcon from "../Shared/SharedIcon"

export default function NFTCollectionListItem({
  id,
  name = id,
  thumbnail = "/images/no_preview.svg",
  onClick,
}: Pick<NFT, "id" | "name" | "thumbnail"> & {
  onClick: () => void
}): JSX.Element {
  return (
    <div key={id}>
      <img width="64" height="64" src={thumbnail} loading="lazy" alt={name} />
      <button type="button" className="label" onClick={onClick}>
        <p className="ellipsis">{name}</p>
        <SharedIcon height={16} width={16} icon="icons/s/continue.svg" />
      </button>
      <style jsx>{`
        img {
          border-radius: 4px;
          object-position: center;
          object-fit: cover;
        }

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
        }

        .label:hover {
          color: var(--trophy-gold);
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
