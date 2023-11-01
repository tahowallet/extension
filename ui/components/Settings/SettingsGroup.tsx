import React, { ReactElement, ReactNode } from "react"

type Props = {
  title: string
  children: ReactNode[]
}

export default function SettingsGroup({
  title,
  children,
}: Props): ReactElement {
  return (
    <div className="group" key={title}>
      <span className="group_title">{title}</span>
      {children}

      <style jsx>
        {`
          .group {
            border-bottom: 1px solid var(--green-80);
            margin-bottom: 24px;
            padding-bottom: 24px;
          }
          .group:last-child {
            border-bottom: none;
            padding: 0px;
            margin: 0px;
          }
          .group_title {
            color: var(--green-40);
            font-family: "Segment";
            font-style: normal;
            font-weight: 400;
            font-size: 16px;
            line-height: 24px;
          }
        `}
      </style>
    </div>
  )
}
