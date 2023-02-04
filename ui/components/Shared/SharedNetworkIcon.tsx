import { EVMNetwork } from "@tallyho/tally-background/networks"
import React, { ReactElement } from "react"
import { getNetworkIconName } from "../../utils/networks"

export default function SharedNetworkIcon(props: {
  network: EVMNetwork
  size: number
  hasBackground?: boolean
  backgroundOpacity?: number
}): ReactElement {
  const { network, size, hasBackground = false, backgroundOpacity = 1 } = props
  const iconName = getNetworkIconName(network)

  return (
    <>
      <div className="icon_network_wrapper">
        {hasBackground && <div className="icon_network_background" />}
        <div className="icon_network" />
      </div>
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
        .icon_network {
          background: url("./images/networks/${iconName}-square@2x.png");
          background-size: cover;
          height: ${size - 6}px;
          width: ${size - 6}px;
          border-radius: 4px;
          z-index: 1;
        }
      `}</style>
    </>
  )
}
