import React from "react"

export default function TopMenuProfileButton() {
  return (
    <button type="button" className="wrap">
      Foxhunter
      <div className="avatar" />
      <style jsx>
        {`
          .avatar {
            border-radius: 12px;
            width: 32px;
            height: 32px;
            background-color: white;
            margin-left: 8px;
            background: url("./images/portrait.png");
          }
          .wrap {
            flex-shrink: 0;
            height: 64px;
            display: flex;
            align-items: center;
          }
        `}
      </style>
    </button>
  )
}
