import React, { CSSProperties, ReactElement, ReactNode } from "react"

type Props = {
  header: string
  style?: CSSProperties
  children?: ReactNode
}

export default function SharedSlideUpMenuPanel({
  header,
  style,
  children,
}: Props): ReactElement {
  return (
    <div>
      <div className="header_wrap">
        <h3 style={style}>{header}</h3>
      </div>
      {children}
      <style jsx>{`
        h3 {
          padding-left: 24px;
          padding-bottom: 16px;
          margin: 0;
        }
        .header_wrap {
          width: 100%;
          background-color: var(--green-95);
          position: sticky;
          top: -25px;
          padding-top: 25px;
          margin-top: -25px;
          z-index: 1;
      `}</style>
    </div>
  )
}
