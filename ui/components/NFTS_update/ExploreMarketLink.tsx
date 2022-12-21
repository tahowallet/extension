import {
  CHAIN_ID_TO_OPENSEA_CHAIN,
  ETHEREUM,
} from "@tallyho/tally-background/constants"
import { POAP_CONTRACT } from "@tallyho/tally-background/lib/poap_update"
import { NFT } from "@tallyho/tally-background/nfts"
import React from "react"

type ExploreMarketLinkProps = {
  url: string
  title: string
  color: string
  hoverColor: string
  icon?: string
  hoverIcon?: string
  type?: "link" | "button"
}

type MarketDetails = {
  title: string
  url: string
  hoverColor: string
  color: string
  icon: string
  hoverIcon?: string
  getNFTLink: (nft: NFT) => string
}

export const MARKET_LINK: Record<string, MarketDetails> = {
  opensea: {
    title: "OpenSea",
    url: "https://opensea.io/",
    color: "#409FFF",
    hoverColor: "#A8D4FF",
    icon: "opensea.png",
    getNFTLink: (nft: NFT): string =>
      `https://opensea.io/assets/${
        CHAIN_ID_TO_OPENSEA_CHAIN[
          parseInt(
            nft.network.chainID,
            10
          ) as keyof typeof CHAIN_ID_TO_OPENSEA_CHAIN
        ]
      }/${nft.contract}/${nft.tokenId}`,
  },
  looksrare: {
    title: "LooksRare",
    url: "https://looksrare.org/",
    color: "#2DE370",
    hoverColor: "#B3F5CB",
    icon: "looksrare.png",
    getNFTLink: (nft: NFT): string =>
      `https://looksrare.org/collections/${nft.contract}/${nft.tokenId}`,
  },
  galxe: {
    title: "Galxe",
    url: "https://galxe.com/",
    color: "#D6EAE9",
    hoverColor: "#ffffff",
    icon: "galxe.svg",
    getNFTLink: (nft: NFT): string =>
      `https://galxe.com/nft/${nft.tokenId}/${nft.contract}`,
  },
  poap: {
    title: "POAP",
    url: "https://poap.xyz/",
    color: "#8076fa",
    hoverColor: "#E8E5FF",
    icon: "poap.png",
    hoverIcon: "poap_white.png",
    getNFTLink: (nft: NFT): string =>
      `https://app.poap.xyz/token/${nft.tokenId}`,
  },
}

export function getRelevantMarketsList(nft: NFT): MarketDetails[] {
  if (nft.contract === POAP_CONTRACT) {
    return [MARKET_LINK.poap]
  }
  if (nft.isBadge) {
    return [MARKET_LINK.galxe]
  }
  if (nft.network.chainID !== ETHEREUM.chainID) {
    return [MARKET_LINK.opensea]
  }
  return [MARKET_LINK.opensea, MARKET_LINK.looksrare]
}

export const HARDCODED_MARKETS = [MARKET_LINK.opensea, MARKET_LINK.looksrare]

export const HARDCODED_BADGES = [MARKET_LINK.galxe, MARKET_LINK.poap]

export default function ExploreMarketLink({
  url,
  title,
  color,
  hoverColor,
  icon,
  hoverIcon,
  type = "link",
}: ExploreMarketLinkProps): JSX.Element {
  return (
    <a className={type} href={url} rel="noreferrer" target="_blank">
      {title}
      {!!icon && <div className="market_icon" />}
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

        .market_icon {
          width: 16px;
          height: 16px;
          background-image: url("images/${icon}");
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
        }

        a:hover {
          color: ${hoverColor};
        }
        a.button:hover {
          border-color: ${hoverColor};
        }
        a:hover .market_icon {
          background-image: url("images/${hoverIcon ?? icon}");
        }
      `}</style>
    </a>
  )
}
