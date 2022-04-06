import React, { ReactElement } from "react"
import { storageGatewayURL } from "@tallyho/tally-background/lib/storage-gateway"

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
  let httpURL = logoURL
  if (logoURL && new URL(logoURL) && logoURL.includes("ipfs")) {
    httpURL = String(storageGatewayURL(new URL(logoURL)))
  }

  return (
    <div className={`token_icon_wrap ${size}`}>
      {httpURL ? (
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
