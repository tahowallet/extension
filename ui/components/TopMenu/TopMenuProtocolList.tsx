import React, { ReactElement } from "react"
import TopMenuProtocolListItem from "./TopMenuProtocolListItem"

const networks = [
  {
    name: "Ethereum",
    info: "Mainnet",
    width: 18,
    height: 29,
  },
  {
    name: "Arbitrum",
    info: "L2 scaling solution",
    width: 23.2,
    height: 26,
  },
  {
    name: "Optimism",
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
  return (
    <div className="standard_width_padded center_horizontal">
      <ul>
        {networks.map((network, index) => (
          <TopMenuProtocolListItem
            isSelected={index === 0}
            key={network.name}
            name={network.name}
            info={network.info}
            width={network.width}
            height={network.height}
          />
        ))}
        {/* <li className="divider">
          <div className="divider_label">Testnet</div>
          <div className="divider_line" />
        </li>
        {Array(3)
          .fill("")
          .map((_, index) => (
            <TopMenuProtocolListItem key={index.toString()} />
          ))} */}
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
