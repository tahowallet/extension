import React, { ReactElement } from "react"
import SharedBackButton from "./SharedBackButton"

export default function SharedPageHeader({
  children,
}: {
  children: React.ReactNode
}): ReactElement {
  return (
    <div className="header_wrap">
      <SharedBackButton />
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
          margin-top: 25px;
        }
      `}</style>
    </div>
  )
}
