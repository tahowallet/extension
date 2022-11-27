import { NFT } from "@tallyho/tally-background/nfts"
import React from "react"

type ExploreMarketLinkProps = {
  url: string
  title: string
  color: string
  icon?: string
  type?: "link" | "button"
}

export const MARKET_LINK = {
  opensea: {
    title: "OpenSea",
    url: "https://opensea.io/",
    color: "#409FFF",
    icon: "opensea.png",
    getNFTLink: (nft: NFT): string =>
      `https://opensea.io/assets/${nft.network.name.toLowerCase()}/${
        nft.contract
      }/${nft.tokenId}`,
  },
  looksrare: {
    title: "LooksRare",
    url: "https://looksrare.org/",
    color: "#2DE370",
    icon: "looksrare.png",
    getNFTLink: (nft: NFT): string =>
      `https://looksrare.org/collections/${nft.contract}/${nft.tokenId}`,
  },
  galxe: {
    title: "Galxe",
    url: "https://galxe.com/",
    color: "var(--white)",
    icon: "galxe.svg",
    getNFTLink: (nft: NFT): string =>
      `https://galxe.com/nft/${nft.tokenId}/${nft.contract}`,
  },
  poap: {
    title: "POAP",
    url: "https://poap.xyz/",
    color: "#8076fa",
    icon: "", // TODO add poap icon
    getNFTLink: (nft: NFT): string =>
      `https://app.poap.xyz/token/${nft.tokenId}`,
  },
}

export const HARDCODED_MARKETS = [MARKET_LINK.opensea, MARKET_LINK.looksrare]

export const HARDCODED_BADGES = [MARKET_LINK.galxe, MARKET_LINK.poap]

export default function ExploreMarketLink({
  url,
  title,
  color,
  icon,
  type = "link",
}: ExploreMarketLinkProps): JSX.Element {
  return (
    <a className={type} href={url} rel="noreferrer" target="_blank">
      {title}
      {!!icon && (
        <img width="16" height="16" src={`images/${icon}`} alt={title} />
      )}
      <style jsx>{`
        a {
          display: flex;
          align-items: center;
          gap: 8px;
          color: ${color};
          padding: 0px 4px;
          font-family: Segment;
          font-size: 16px;
          font-weight: 600;
          line-height: 24px;
          letter-spacing: 0.03em;
          text-align: center;
        }

        a.button {
          border: 2px solid ${color};
          border-radius: 4px;
          padding: 8px 16px;
        }

        img {
          object-position: center;
          object-fit: contain;
        }
      `}</style>
    </a>
  )
}
