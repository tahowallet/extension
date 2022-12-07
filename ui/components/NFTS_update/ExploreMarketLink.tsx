import React from "react"

type ExploreMarketLinkProps = {
  url: string
  title: string
  color: string
  icon: string
  type?: "link" | "button"
}

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
      <img width="16" height="16" src={`images/${icon}`} alt={title} />
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
