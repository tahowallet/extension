import React, { ReactElement } from "react"

interface Props {
  size?: "small" | "medium" | "large"
  logoURL?: string
  symbol?: string
}

export default function SharedAssetIcon(props: Props): ReactElement {
  const { size, logoURL, symbol } = props

  return (
    <div className={`token_icon_wrap ${size}`}>
      {logoURL ? (
        <div className="token_icon" />
      ) : (
        <div className={`token_icon_fallback ${size}`}>
          {symbol.slice(0)[0]}
        </div>
      )}
      <style jsx>
        {`
          .token_icon_wrap {
            width: 40px;
            height: 40px;
            border-radius: 80px;
            overflow: hidden;
          }
          .token_icon {
            width: 100%;
            height: 100%;
            background-color: var(--castle-black);
            background: url("${logoURL}");
            background-size: cover;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .token_icon_fallback {
            width: 100%;
            height: 100%;
            background-color: var(--castle-black);
            color: var(--green-60);
            font-weight: 900;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .small {
            width: 32px;
            height: 32px;
          }
          .small .icon_eth {
            width: 16px;
            height: 24px;
          }
          .large {
            width: 48px;
            height: 48px;
          }
        `}
      </style>
    </div>
  )
}

SharedAssetIcon.defaultProps = {
  size: "medium",
  logoURL: null,
  symbol: "ETH",
}
