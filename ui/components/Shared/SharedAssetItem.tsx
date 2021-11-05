import React, { ReactElement } from "react"

interface Asset {
  symbol: string
  name: string
}

interface Props {
  asset: Asset
  onClick?: (asset: Asset) => void
}

export default function SharedAssetItem(props: Props): ReactElement {
  const { onClick, asset } = props

  function handleClick() {
    onClick?.(asset)
  }

  return (
    <li>
      <button type="button" className="token_group" onClick={handleClick}>
        <div className="left">
          <div className="token_icon_wrap">
            {asset.symbol === "ETH" && <span className="icon_eth" />}
          </div>
          <div className="right">
            <div className="symbol">{asset.symbol}</div>
            <div className="token_subtitle">{asset.name}</div>
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
          .symbol {
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
  asset: {
    symbol: "ETH",
    name: "Ethereum",
  },
}
