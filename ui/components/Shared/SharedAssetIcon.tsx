import React, { ReactElement } from "react"
import { storageGatewayURL } from "@tallyho/tally-background/lib/storage-gateway"

interface Props {
  size: "small" | "medium" | "large"
  logoURL: string
  symbol: string
}

export default function SharedAssetIcon(props: Props): ReactElement {
  const { size, logoURL, symbol } = props

  const hardcodedIcons = ["ETH", "DOGGO"]
  const hasHardcodedIcon = hardcodedIcons.includes(symbol)

  // Passes IPFS and Arweave through HTTP gateway
  function getAsHttpURL(anyURL: string) {
    let httpURL = anyURL
    try {
      httpURL = storageGatewayURL(new URL(anyURL)).href
    } catch (err) {
      httpURL = ""
    }
    return httpURL
  }

  const httpURL = getAsHttpURL(logoURL)

  const shouldDisplayTokenIcon = Boolean(httpURL || hasHardcodedIcon)

  return (
    <div className={`token_icon_wrap ${size}`}>
      {shouldDisplayTokenIcon ? (
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
            flex-shrink: 0;
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
            ? `background: url("${`./images/assets/${symbol.toLowerCase()}.png`}");
            background-size: cover;
            `
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
