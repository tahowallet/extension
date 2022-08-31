import React, { ReactElement } from "react"
import SharedBackButton from "./SharedBackButton"

export default function SharedPageHeader({
  children,
  withoutBackText,
}: {
  children: React.ReactNode
  withoutBackText?: boolean
}): ReactElement {
  return (
    <div className="header_wrap">
      <SharedBackButton withoutBackText={withoutBackText} />
      <h1>{children}</h1>
      <style jsx>{`
        h1 {
          font-size: 22px;
          font-weight: 500;
          line-height: 32px;
          padding: 0px;
          margin: -5px 0px 0px 0px;
        }
        .header_wrap {
          display: flex;
          flex-direction: column;
          flex-direction: ${withoutBackText ? "row" : "column"};
          ${withoutBackText && "gap: 8px;"};
          margin-top: 25px;
        }
      `}</style>
    </div>
  )
}
