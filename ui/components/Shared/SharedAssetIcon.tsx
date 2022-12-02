import React, { ReactElement, useEffect, useState } from "react"
import { storageGatewayURL } from "@tallyho/tally-background/lib/storage-gateway"
import classNames from "classnames"

type Props = {
  size: "small" | "medium" | "large" | number
  logoURL: string
  symbol: string
}

const hardcodedIcons = new Set(["ETH", "MATIC", "DOGGO", "RBTC", "AVAX"])

// Passes IPFS and Arweave through HTTP gateway
function getAsHttpURL(anyURL: string) {
  let httpURL = anyURL
  try {
    httpURL = storageGatewayURL(anyURL).href
  } catch (err) {
    httpURL = ""
  }
  return httpURL
}

export default function SharedAssetIcon(props: Props): ReactElement {
  const { size, logoURL, symbol } = props

  const [imageURL, setImageURL] = useState(() => getAsHttpURL(logoURL))

  const hasHardcodedIcon = hardcodedIcons.has(symbol)

  const sizeClass = typeof size === "string" ? size : "custom_size"

  const shouldDisplayTokenIcon = Boolean(imageURL || hasHardcodedIcon)

  useEffect(() => {
    const isIpfsURL = /^ipfs:/.test(logoURL)

    if (isIpfsURL) {
      fetch(imageURL)
        .then(async (response) => {
          if (
            response.ok &&
            response.headers.get("content-type") === "text/html"
          ) {
            const base = "data:image/svg+xml;base64,"
            setImageURL(
              base +
                Buffer.from(await response.arrayBuffer()).toString("base64")
            )
          } else {
            throw new Error("INVALID_RESPONSE")
          }
        })
        .catch(() => {
          // noop
        })
    }
  }, [imageURL, logoURL])

  return (
    <div className={classNames("token_icon_wrap", sizeClass)}>
      {shouldDisplayTokenIcon ? (
        <div className="token_icon" />
      ) : (
        <div className={classNames("token_icon_fallback", sizeClass)}>
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
        ${typeof size === "number"
          ? `.token_icon_wrap.custom_size {
              width: ${size}px;
              height: ${size}px;
            }`
          : ""}
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
            : `background: url("${imageURL}");
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
