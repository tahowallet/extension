import React, { CSSProperties, ReactElement, ReactNode } from "react"

type Props = {
  header: string
  icon?: string
  style?: CSSProperties
  children?: ReactNode
}

export default function SharedSlideUpMenuPanel({
  header,
  icon,
  style,
  children,
}: Props): ReactElement {
  return (
    <div>
      <div className="header_wrap">
        {icon && (
          <img
            width="16"
            height="16"
            className="icon"
            src={`./images/${icon}`}
            alt={header}
          />
        )}
        <h3 style={style}>{header}</h3>
      </div>
      {children}
      <style jsx>{`
        h3 {
          margin: 0;
        }
        .header_wrap {
          background-color: var(--green-95);
          position: sticky;
          top: -25px;
          padding-top: 25px;
          margin-top: -25px;
          z-index: 1;

          display: flex;
          align-items: center;
          padding-left: 24px;
          padding-bottom: 16px;
        }
        .icon {
          margin-right: 5px;
        }
      `}</style>
    </div>
  )
}
