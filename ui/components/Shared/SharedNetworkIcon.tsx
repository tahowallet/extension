import { EVMNetwork } from "@tallyho/tally-background/networks"
import React, { ReactElement, useState, useEffect } from "react"
import {
  getNetworkIcon,
  getNetworkIconFallbackColor,
  getNetworkIconSquared,
} from "../../utils/networks"

export default function SharedNetworkIcon(props: {
  network: EVMNetwork
  size: number
  hasBackground?: boolean
  backgroundOpacity?: number
  padding?: number
  squared?: boolean
}): ReactElement {
  const {
    network,
    size,
    hasBackground = false,
    backgroundOpacity = 1,
    padding = 0,
    squared,
  } = props
  const [currentSource, setCurrentSource] = useState(0)

  const sources = [
    squared && getNetworkIconSquared(network),
    getNetworkIcon(network),
  ].filter((source): source is string => Boolean(source))

  const hasIconAvailable = currentSource < sources.length

  useEffect(() => {
    if (sources.length < 1 || !hasIconAvailable) return

    const img = new Image()

    img.onerror = () => {
      setCurrentSource(currentSource + 1)
    }

    img.src = sources[currentSource]
  }, [currentSource, sources, hasIconAvailable])

  return (
    <div className="icon_network_wrapper">
      {hasBackground && hasIconAvailable && (
        <div className="icon_network_background" />
      )}
      {hasIconAvailable ? (
        // The icon URL of a custom network is dapp- or user-supplied, so it
        // must never be interpolated into a styled-jsx template: that string
        // becomes stylesheet source, and a crafted URL could close the
        // declaration and add rules of its own anywhere in the wallet UI.
        // Setting it through a React style object keeps it a property value —
        // CSSOM drops it wholesale if it is not a valid one, and it cannot
        // introduce a new declaration or selector.
        <div
          className="icon_network"
          style={{ backgroundImage: `url("${sources[currentSource]}")` }}
        />
      ) : (
        <div className="icon_fallback">
          {network.name[0].toUpperCase() ?? network.chainID}
        </div>
      )}
      <style jsx>{`
        .icon_network_wrapper {
          position: relative;
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon_network_background {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 6px;
          background-color: ${hasBackground
            ? "var(--green-95)"
            : "transparent"};
          opacity: ${backgroundOpacity};
        }
        .icon_fallback {
          background: ${getNetworkIconFallbackColor(network)};
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          color: var(--white);
          border-radius: 2px;
        }
        .icon_network {
          background-size: cover;
          height: ${size - padding}px;
          width: ${size - padding}px;
          border-radius: 4px;
          z-index: 1;
        }
      `}</style>
    </div>
  )
}
