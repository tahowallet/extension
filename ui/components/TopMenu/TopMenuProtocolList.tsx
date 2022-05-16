import {
  ARBITRUM_ONE,
  ETHEREUM,
  OPTIMISM,
  POLYGON,
} from "@tallyho/tally-background/constants"
import { sameNetwork } from "@tallyho/tally-background/networks"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../../hooks"
import TopMenuProtocolListItem from "./TopMenuProtocolListItem"

const networks = [
  {
    ...ETHEREUM,
    info: "Mainnet",
    width: 18,
    height: 29,
  },
  {
    ...POLYGON,
    info: /* ( ͡° ͜ʖ ͡°) */ "L2 scaling solution",
    width: 24,
    height: 24,
  },
  {
    ...ARBITRUM_ONE,
    info: "L2 scaling solution",
    width: 23.2,
    height: 26,
  },
  {
    ...OPTIMISM,
    info: "L2 scaling solution",
    width: 24,
    height: 24,
  },
  // {
  //   name: "Binance Smart Chain",
  //   info: "Ethereum-compatible blockchain",
  //   width: 24,
  //   height: 24,
  // },
  // {
  //   name: "Celo",
  //   info: "Global payments infrastructure",
  //   width: 24,
  //   height: 24,
  // },
]

export default function TopMenuProtocolList(): ReactElement {
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)

  return (
    <div className="standard_width_padded center_horizontal">
      <ul>
        {networks.map((network) => (
          <TopMenuProtocolListItem
            isSelected={sameNetwork(currentNetwork, network)}
            key={network.name}
            name={network.name}
            info={network.info}
            width={network.width}
            height={network.height}
          />
        ))}
      </ul>
      <style jsx>
        {`
          .divider {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
            margin-top: 32px;
          }
          .divider_line {
            width: 286px;
            border-bottom: 1px solid var(--green-120);
            margin-left: 19px;
            position: absolute;
            right: 0px;
          }
          .divider_label {
            color: var(--green-40);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
          }
        `}
      </style>
    </div>
  )
}
