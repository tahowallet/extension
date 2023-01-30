import React, { ReactElement } from "react"

type Props = {
  text: string
  url: string
}

export default function SharedLink({ text, url }: Props): ReactElement {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="link">
      {text}
      <style jsx>{`
        .link {
          color: var(--trophy-gold);
        }
        .link:hover {
          color: var(--gold-40);
        }
      `}</style>
    </a>
  )
}
