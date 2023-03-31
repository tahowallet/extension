import React, { ReactElement } from "react"
import {
  ARBITRUM_ONE,
  ETHEREUM,
  OPTIMISM,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  POLYGON,
  ROOTSTOCK,
} from "@tallyho/tally-background/constants"
import { sameNetwork } from "@tallyho/tally-background/networks"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundSelector } from "../../hooks"
import LedgerMenuProtocolListItem from "./LedgerMenuProtocolListItem"

const LEDGER_APPS = [
  {
    network: ETHEREUM,
    ecosystem: [OPTIMISM, ARBITRUM_ONE],
  },
  {
    network: POLYGON,
  },
  {
    network: ROOTSTOCK,
  },
  {
    network: AVALANCHE,
  },
  {
    network: BINANCE_SMART_CHAIN,
  },
]

export default function LedgerMenuProtocolList(): ReactElement {
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)

  return (
    <div className="standard_width_padded center_horizontal">
      <ul>
        {LEDGER_APPS.map((info) => (
          <LedgerMenuProtocolListItem
            isSelected={sameNetwork(currentNetwork, info.network)}
            key={info.network.name}
            network={info.network}
            ecosystem={info.ecosystem}
          />
        ))}
      </ul>
    </div>
  )
}
