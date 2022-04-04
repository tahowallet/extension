import React, { ReactElement } from "react"

interface Props {
  size: "small" | "medium" | "large"
  logoURL: string
  symbol: string
}

export default function SharedAssetIcon(props: Props): ReactElement {
  const { size, logoURL, symbol } = props

  const hardcodedIcons = ["ETH"]
  const hasHardcodedIcon = hardcodedIcons.includes(symbol)

  // If IPFS url, pass through gateway
  const httpURL =
    logoURL?.includes("ipfs") && logoURL.split("ipfs://")[1]
      ? `https://ipfs.io/ipfs/${logoURL.split("ipfs://")[1]}`
      : logoURL

  // Check if an http(s) address or if we have a hardcoded backup image
  const hasValidImage =
    (httpURL && httpURL.includes("http")) || hasHardcodedIcon

  return (
    <div className={`token_icon_wrap ${size}`}>
      {hasValidImage ? (
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
            background-color: var(--castle-black);
          }
          .token_icon_fallback {
            width: 100%;
            height: 100%;
            color: var(--green-60);
            font-weight: 900;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .medium .token_icon_fallback {
            margin-top: 1px;
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
      <style jsx>{`
        .token_icon {
          width: 100%;
          height: 100%;
          background-color: var(--castle-black);
          display: flex;
          align-items: center;
          justify-content: center;
          ${hasHardcodedIcon
            ? `background: url("${`./images/${symbol.toLowerCase()}@2x.png`}") center no-repeat;
            background-size: 45% auto;`
            : `background: url("${httpURL}");
            background-size: cover;`}
        }
      `}</style>
    </div>
  )
}

SharedAssetIcon.defaultProps = {
  size: "medium",
  logoURL: null,
  symbol: "ETH",
}
