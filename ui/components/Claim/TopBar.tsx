import React, { ReactElement } from "react"
import { Link } from "react-router-dom"
import { useBackgroundSelector } from "../../hooks"

export default function TopBar(): ReactElement {
  const truncatedAccountAddress = useBackgroundSelector((background) => {
    return background.ui.selectedAccount?.truncatedAddress
  })

  return (
    <div className="nav">
      <Link to="/wallet">
        <div className="back__container">
          <img
            src="./images/transfer@2x.png"
            alt="return"
            className="nav__back"
          />
          <div className="back">Wallet</div>
        </div>
      </Link>
      <div className="account">
        {truncatedAccountAddress}
        <div className="avatar" />
      </div>
      <style jsx>
        {`
          .back__container {
            display: flex;
            align-items: center;
          }
          .nav__back {
            transform: rotate(180deg);
            width: 16px;
            margin-right: 4px;
          }
          .back {
            font-size: 16;
            color: white;
            text-decoration: none;
          }
          .nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 0 24px;
            z-index: 2;
          }
          .avatar {
            border-radius: 12px;
            width: 32px;
            height: 32px;
            background-color: white;
            margin-left: 8px;
            background: url("./images/portrait.png");
          }
          .account {
            flex-shrink: 0;
            height: 64px;
            display: flex;
            align-items: center;
            user-select: none;
          }
        `}
      </style>
    </div>
  )
}
