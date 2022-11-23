import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedBanner from "../Shared/SharedBanner"

const HARDCODED_MARKETS = [
  {
    title: "Opensea",
    url: "https://opensea.io/",
    color: "#409FFF",
    icon: "opensea.png",
  },
  {
    title: "Looksrare",
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

type ExporeLinkProps = {
  url: string
  title: string
  color: string
  icon: string
}

function ExploreLink({
  url,
  title,
  color,
  icon,
}: ExporeLinkProps): JSX.Element {
  return (
    <a href={url} rel="noreferrer" target="_blank">
      <img width="16" src={`images/${icon}`} alt={title} />
      {title}
      <style jsx>{`
        a {
          display: flex;
          align-items: center;
          gap: 8px;
          color: ${color};
          padding: 8px;
          font-family: Segment;
          font-size: 16px;
          font-weight: 600;
          line-height: 24px;
          letter-spacing: 0.03em;
          text-align: center;
        }
      `}</style>
    </a>
  )
}

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
          <ExploreLink key={url} {...{ url, title, color, icon }} />
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
          margin-bottom: 8px;
        }

        nav {
          display: flex;
          justify-content: center;
          gap: 8px;
        }
      `}</style>
    </SharedBanner>
  )
}
