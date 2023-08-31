import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedBanner from "../Shared/SharedBanner"
import ExploreMarketLink, {
  HARDCODED_BADGES,
  HARDCODED_MARKETS,
} from "./ExploreMarketLink"

export default function NFTsExploreBanner(props: {
  type: "badge" | "nfts"
}): ReactElement {
  const { type } = props
  const { t } = useTranslation("translation", {
    keyPrefix: "nfts",
  })

  const items = type === "badge" ? HARDCODED_BADGES : HARDCODED_MARKETS

  return (
    <SharedBanner customStyles="margin-top: 10px;">
      <header>{t(`emptyBannerTitle.${type}`)}</header>
      <nav>
        {items.map(
          ({
            title,
            url,
            icon,
            color,
            hoverColor,
            smallHoverIcon,
            smallIcon,
          }) => (
            <ExploreMarketLink
              key={url}
              type="button"
              {...{
                url,
                title,
                color,
                hoverColor,
                smallIcon,
                smallHoverIcon,
                icon,
              }}
            />
          ),
        )}
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
