import React, { ReactElement } from "react"

export default function TopMenuProfileButton(props: {
  address: string
  nickname?: string
  avatar?: string
  onClick?: () => void
}): ReactElement {
  const { address, nickname, avatar, onClick } = props
  return (
    <button type="button" onClick={onClick}>
      {nickname ?? address}
      <div className="avatar" />
      <style jsx>
        {`
          button {
            flex-shrink: 0;
            height: 64px;
            display: flex;
            align-items: center;
            user-select: none;
          }
          .avatar {
            border-radius: 12px;
            width: 32px;
            height: 32px;
            background-color: white;
            margin-left: 8px;
            background: url("${avatar ?? "./images/portrait.png"}");
            background-size: cover;
          }
        `}
      </style>
    </button>
  )
}
