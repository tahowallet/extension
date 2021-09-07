import React, { ReactElement } from "react"

interface Props {
  label: string
  activity: string
}

export default function SharedActivityHeader(props: Props): ReactElement {
  const { label, activity } = props

  return (
    <h1>
      <span className="icon_activity" />
      {label}
      <style jsx>
        {`
          h1 {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            margin-top: 17px;
            height: 32px;
            color: #ffffff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .icon_activity {
            background: url("./images/activity_${activity}_medium@2x.png");
            background-size: cover;
            width: 24px;
            height: 24px;
            margin-right: 8px;
          }
        `}
      </style>
    </h1>
  )
}
