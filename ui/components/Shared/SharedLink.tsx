import React, { ReactElement } from "react"

type Props = {
  url: string
  children?: React.ReactNode
  text?: string
  styles?: React.CSSProperties & Record<string, string>
}

export default function SharedLink({
  text,
  children,
  url,
  styles = {},
}: Props): ReactElement {
  return (
    <a
      style={styles}
      href={url}
      target="_blank"
      rel="noreferrer"
      className="link"
    >
      {text ?? children}
      <style jsx>{`
        .link {
          color: var(--link-color, var(--trophy-gold));
        }
        .link:hover {
          color: var(--gold-40);
        }
      `}</style>
    </a>
  )
}
