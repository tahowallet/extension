import React, { ReactElement } from "react"

interface Props {
  onClick?: (token: { name: string }) => void
}

export default function SharedAssetItem(props: Props): ReactElement {
  const { onClick } = props

  function handleClick() {
    onClick({ name: "ETH" })
  }

  return (
    <li>
      <button type="button" className="token_group" onClick={handleClick}>
        <div className="left">
          <div className="token_icon_wrap">
            <span className="icon_eth" />
          </div>
          <div className="right">
            <div className="name">ETH</div>
            <div className="token_subtitle">Ethereum</div>
          </div>
        </div>
      </button>
      <style jsx>
        {`
          .token_group {
            display: flex;
            align-items: center;
            width: 100%;
            padding: 7.5px 0px;
            padding-left: 24px;
          }
          .token_group:hover {
            background-color: var(--hunter-green);
          }
          .token_icon_wrap {
            width: 40px;
            height: 40px;
            border-radius: 46px;
            background-color: var(--hunter-green);
            border-radius: 80px;
            margin-right: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .token_group:hover .token_icon_wrap {
            background-color: var(--green-120);
          }
          .token_subtitle {
            width: 65px;
            height: 17px;
            color: var(--green-60);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-top: 5px;
          }
          .icon_eth {
            background: url("./images/eth@2x.png");
            background-size: 18px 29px;
            width: 18px;
            height: 29px;
          }
          .left {
            display: flex;
          }
          .name {
            color: #fff;
            font-size: 16px;
            font-weight: 500;
            line-height: 18px;
            text-transform: uppercase;
            margin-top: 2px;
          }
        `}
      </style>
    </li>
  )
}

SharedAssetItem.defaultProps = {
  onClick: () => {
    // do nothing by default
    // TODO replace this with support for undefined onClick
  },
}
