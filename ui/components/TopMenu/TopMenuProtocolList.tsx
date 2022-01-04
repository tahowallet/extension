import React, { ReactElement } from "react"

import {
  ETHEREUM,
  EVM_NETWORKS_BY_CHAIN_ID,
} from "@tallyho/tally-background/constants/networks"
import { selectCurrentAddressNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { setNewSelectedAccount } from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"

import TopMenuProtocolListItem from "./TopMenuProtocolListItem"

type NetworkDisplay = {
  name: string
  info: string
  width: number
  height: 29
  chainID: string
}

const networks: NetworkDisplay[] = [
  {
    name: "Ethereum",
    info: "Mainnet",
    width: 18,
    height: 29,
    chainID: "1",
  },
]

const testNetworks: NetworkDisplay[] = [
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

const ProtocolItemFromNetwork = ({
  name,
  chainID,
  height,
  width,
  info,
}: NetworkDisplay): ReactElement => {
  const { network: selectedNetwork, address } = useBackgroundSelector(
    selectCurrentAddressNetwork
  )
  const dispatch = useBackgroundDispatch()
  return (
    <TopMenuProtocolListItem
      isSelected={chainID === selectedNetwork.chainID}
      key={name}
      name={name}
      info={info}
      height={height}
      width={width}
      onClick={() =>
        dispatch(
          setNewSelectedAccount({
            network: EVM_NETWORKS_BY_CHAIN_ID[chainID] ?? ETHEREUM,
            address,
          })
        )
      }
    />
  )
}

export default function TopMenuProtocolList(): ReactElement {
  return (
    <div className="standard_width_padded center_horizontal">
      <ul>
        {networks.map(ProtocolItemFromNetwork)}
        {testNetworks.length > 0 && (
          <>
            <li className="divider">
              <div className="divider_label">Testnets</div>
              <div className="divider_line" />
            </li>
            {testNetworks.map(ProtocolItemFromNetwork)}
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
