import React, { ReactElement } from "react"

import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundSelector } from "../../hooks"

import TopMenuProtocolListItem from "./TopMenuProtocolListItem"

const networks = [
  {
    name: "Ethereum",
    info: "Mainnet",
    width: 18,
    height: 29,
    chainID: "1",
  },
]

const testNetworks = [
  {
    name: "Kovan",
    info: "Ethereum Proof-of-Authority Testnet",
    width: 18,
    height: 29,
    chainID: "42",
  },
]

// const l2s = [
//   {
//     name: "Arbitrum",
//     info: "L2 scaling solution",
//     width: 23.2,
//     height: 26,
//   },
//   {
//     name: "Optimism",
//     info: "L2 scaling solution",
//     width: 24,
//     height: 24,
//   },
//   {
//     name: "Binance Smart Chain",
//     info: "Ethereum-compatible blockchain",
//     width: 24,
//     height: 24,
//   },
//   {
//     name: "Celo",
//     info: "Global payments infrastructure",
//     width: 24,
//     height: 24,
//   },
// ]

export default function TopMenuProtocolList(): ReactElement {
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)
  return (
    <div className="standard_width_padded center_horizontal">
      <ul>
        {networks.map((network) => (
          <TopMenuProtocolListItem
            isSelected={network.chainID === selectedNetwork.chainID}
            key={network.name}
            name={network.name}
            info={network.info}
            width={network.width}
            height={network.height}
          />
        ))}
        {testNetworks.length > 0 && (
          <>
            <li className="divider">
              <div className="divider_label">Testnets</div>
              <div className="divider_line" />
            </li>
            {testNetworks.map((network) => (
              <TopMenuProtocolListItem
                isSelected={network.chainID === selectedNetwork.chainID}
                key={network.name}
                name={network.name}
                info={network.info}
                width={network.width}
                height={network.height}
              />
            ))}
          </>
        )}
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
