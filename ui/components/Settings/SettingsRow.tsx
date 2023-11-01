import React, { ReactElement } from "react"

type Props = {
  title?: string
  children: ReactElement
  tooltip?: ReactElement
}

export default function SettingsRow(props: Props): ReactElement {
  const { title, children, tooltip = () => null } = props

  return (
    <li>
      <div className="left">
        {title ?? ""}
        {tooltip}
      </div>
      <div className="right">{children}</div>
      <style jsx>
        {`
          .left {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          li {
            padding-top: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;

            color: var(--green-20);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
        `}
      </style>
    </li>
  )
}
