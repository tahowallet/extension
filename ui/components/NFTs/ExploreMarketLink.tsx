import {
  CHAIN_ID_TO_OPENSEA_CHAIN,
  ETHEREUM,
  POLYGON,
} from "@tallyho/tally-background/constants"
import { POAP_CONTRACT } from "@tallyho/tally-background/lib/poap"
import { NFTCached } from "@tallyho/tally-background/redux-slices/nfts"
import React, { ReactElement } from "react"
import SharedTooltip from "../Shared/SharedTooltip"

type ExploreMarketButtonProps = {
  title: string
  color: string
  hoverColor: string
  icon: string
  smallIcon?: string
  smallHoverIcon?: string
}

type ExploreMarketIconProps = {
  title: string
  icon: string
}

type ExploreMarketLinkProps = { url: string } & (
  | ({ type: "button" } & ExploreMarketButtonProps)
  | ({ type: "icon" } & ExploreMarketIconProps)
)

type MarketDetails = {
  title: string
  url: string
  hoverColor: string
  color: string
  icon: string
  smallIcon?: string
  smallHoverIcon?: string
  getNFTLink: (nft: NFTCached) => string
}

export const MARKET_LINK: Record<string, MarketDetails> = {
  opensea: {
    title: "OpenSea",
    url: "https://opensea.io/",
    color: "#409FFF",
    hoverColor: "#A8D4FF",
    icon: "opensea.svg",
    getNFTLink: (nft: NFTCached): string =>
      `https://opensea.io/assets/${
        CHAIN_ID_TO_OPENSEA_CHAIN[
          parseInt(nft.chainID, 10) as keyof typeof CHAIN_ID_TO_OPENSEA_CHAIN
        ]
      }/${nft.contract}/${nft.tokenId}`,
  },
  looksrare: {
    title: "LooksRare",
    url: "https://looksrare.org/",
    color: "#2DE370",
    hoverColor: "#B3F5CB",
    icon: "looksrare.svg",
    getNFTLink: (nft: NFTCached): string =>
      `https://looksrare.org/collections/${nft.contract}/${nft.tokenId}`,
  },
  rarible: {
    title: "Rarible",
    url: "https://rarible.com/",
    icon: "rarible.svg",
    color: "#FEDA03",
    hoverColor: "#EDDF8E",
    getNFTLink: (nft: NFTCached): string =>
      `https://rarible.com/token/${
        nft.chainID === POLYGON.chainID ? "polygon/" : ""
      }${nft.contract}:${nft.tokenId}`,
  },
  galxe: {
    title: "Galxe",
    url: "https://galxe.com/",
    color: "#D6EAE9",
    hoverColor: "#ffffff",
    icon: "galxe.svg",
    getNFTLink: (nft: NFTCached): string =>
      `https://galxe.com/nft/${nft.tokenId}/${nft.contract}`,
  },
  poap: {
    title: "POAP",
    url: "https://poap.xyz/",
    color: "#8076fa",
    hoverColor: "#E8E5FF",
    icon: "poap.svg",
    smallIcon: "poap_color.png",
    smallHoverIcon: "poap_white.png",
    getNFTLink: (nft: NFTCached): string =>
      `https://app.poap.xyz/token/${nft.tokenId}`,
  },
}

export function getRelevantMarketsList(nft: NFTCached): MarketDetails[] {
  if (nft.contract === POAP_CONTRACT) return [MARKET_LINK.poap]

  if (nft.isBadge) return [MARKET_LINK.galxe]

  if (nft.chainID === POLYGON.chainID)
    return [MARKET_LINK.rarible, MARKET_LINK.opensea]

  if (nft.chainID === ETHEREUM.chainID)
    return [MARKET_LINK.rarible, MARKET_LINK.looksrare, MARKET_LINK.opensea]

  if (CHAIN_ID_TO_OPENSEA_CHAIN[nft.chainID]) {
    return [MARKET_LINK.opensea]
  }

  return []
}

export const HARDCODED_MARKETS = [
  MARKET_LINK.opensea,
  MARKET_LINK.looksrare,
  MARKET_LINK.rarible,
]

export const HARDCODED_BADGES = [MARKET_LINK.galxe, MARKET_LINK.poap]

function ExploreMarketButton(props: ExploreMarketButtonProps): ReactElement {
  const { title, icon, smallIcon, smallHoverIcon, color, hoverColor } = props
  return (
    <div className="market_wrapper">
      <div className="market_icon" />
      {title}
      <style jsx>{`
        .market_wrapper {
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

        .market_icon {
          width: 16px;
          height: 16px;
          background-image: url("images/marketplaces/${smallIcon ?? icon}");
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
        }

        .market_wrapper:hover {
          color: ${hoverColor};
        }

        .market_wrapper:hover .market_icon {
          background-image: url("images/marketplaces/${smallHoverIcon ??
          smallIcon ??
          icon}");
        }
      `}</style>
    </div>
  )
}

function ExploreMarketIcon(props: ExploreMarketIconProps): ReactElement {
  const { icon, title } = props
  return (
    <div className="market_wrapper">
      <SharedTooltip
        type="dark"
        verticalPosition="bottom"
        horizontalPosition="center"
        horizontalShift={10}
        width={75}
        height={34}
        IconComponent={() => <div className="market_icon" />}
      >
        <div className="market_title">{title}</div>
      </SharedTooltip>
      <style jsx>{`
        .market_icon {
          width: 32px;
          height: 32px;
          background-image: url("images/marketplaces/${icon}");
          opacity: 0.8;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          text-align: center;
        }
        .market_title {
          text-align: center;
        }
        .market_wrapper:hover .market_icon {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}

export default function ExploreMarketLink(
  props: ExploreMarketLinkProps,
): ReactElement {
  const { type, title, url } = props
  return (
    <a
      className={type}
      title={title}
      href={url}
      rel="noreferrer"
      target="_blank"
    >
      {type === "button" ? (
        // As we know how props are going to look like let's spread them
        // eslint-disable-next-line react/jsx-props-no-spreading
        <ExploreMarketButton {...props} />
      ) : (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <ExploreMarketIcon {...props} />
      )}
    </a>
  )
}
