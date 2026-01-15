import { EVMNetwork } from "@tallyho/tally-background/networks"
import React, { ReactElement } from "react"
import SharedAssetIcon from "./SharedAssetIcon"
import SharedNetworkIcon from "./SharedNetworkIcon"

type Props = {
  size: "small" | "medium" | "large" | number
  logoURL: string
  symbol: string
  network?: EVMNetwork
}

const SIZE_MAP = { small: 32, medium: 40, large: 48 }

export default function SharedAssetIconWithNetwork(props: Props): ReactElement {
  const { size, logoURL, symbol, network } = props
  const numericSize = typeof size === "number" ? size : SIZE_MAP[size]
  const badgeSize = Math.max(10, Math.min(16, Math.round(numericSize * 0.4)))

  return (
    <div className="asset_icon_with_network">
      <SharedAssetIcon size={size} logoURL={logoURL} symbol={symbol} />
      {network !== undefined && (
        <div className="network_badge">
          <SharedNetworkIcon network={network} size={badgeSize} hasBackground />
        </div>
      )}
      <style jsx>{`
        .asset_icon_with_network {
          position: relative;
          width: ${numericSize}px;
          height: ${numericSize}px;
        }
        .network_badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
        }
      `}</style>
    </div>
  )
}
