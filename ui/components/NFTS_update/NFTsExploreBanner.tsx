import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedBanner from "../Shared/SharedBanner"
import ExploreMarketLink from "./ExploreMarketLink"

const HARDCODED_MARKETS = [
  {
    title: "OpenSea",
    url: "https://opensea.io/",
    color: "#409FFF",
    icon: "opensea.png",
  },
  {
    title: "LooksRare",
    url: "https://looksrare.org/",
    color: "#2DE370",
    icon: "looksrare.png",
  },
]

const HARDCODED_BADGES = [
  {
    title: "Galxe",
    url: "https://galxe.com/",
    color: "var(--white)",
    icon: "galxe.svg",
  },
]

export default function NFTsExploreBanner(props: {
  type: "badge" | "nfts"
}): ReactElement {
  const { type } = props
  const { t } = useTranslation("translation", {
    keyPrefix: "nfts",
  })

  const items = type === "badge" ? HARDCODED_BADGES : HARDCODED_MARKETS

  return (
    <SharedBanner>
      <header>{t(`emptyBannerTitle.${type}`)}</header>
      <nav>
        {items.map(({ title, url, color, icon }) => (
          <ExploreMarketLink key={url} {...{ url, title, color, icon }} />
        ))}
      </nav>
      <style jsx>{`
        header {
          font-family: Segment;
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          letter-spacing: 0em;
          text-align: center;
          margin-bottom: 16px;
        }

        nav {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 8px;
        }
      `}</style>
    </SharedBanner>
  )
}
