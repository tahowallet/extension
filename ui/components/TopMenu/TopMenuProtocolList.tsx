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
import t from "../../utils/i18n"

const listItemInfo = [
  {
    network: ETHEREUM,
    info: t("protocolMainnet"),
    width: 18,
    height: 29,
  },
  {
    network: POLYGON,
    info: t("protocolL2"),
    width: 24,
    height: 24,
  },
  {
    network: ARBITRUM_ONE,
    info: t("protocolL2"),
    width: 23.2,
    height: 26,
  },
  {
    network: OPTIMISM,
    info: t("protocolL2"),
    width: 24,
    height: 24,
  },
  // {
  //   name: "Binance Smart Chain",
  //   info: t("protocolCompatibleChain"),
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
        {listItemInfo.map((info) => (
          <TopMenuProtocolListItem
            isSelected={sameNetwork(currentNetwork, info.network)}
            key={info.network.name}
            network={info.network}
            height={info.height}
            width={info.width}
            info={info.info}
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
