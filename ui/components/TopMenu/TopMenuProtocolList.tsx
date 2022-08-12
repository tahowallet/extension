import {
  ARBITRUM_ONE,
  ETHEREUM,
  OPTIMISM,
  POLYGON,
} from "@tallyho/tally-background/constants"
import {
  SUPPORT_ARBITRUM,
  SUPPORT_OPTIMISM,
} from "@tallyho/tally-background/features"
import { sameNetwork } from "@tallyho/tally-background/networks"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../../hooks"
import TopMenuProtocolListItem from "./TopMenuProtocolListItem"
import { i18n } from "../../_locales/i18n"

const listItemInfo = [
  {
    network: ETHEREUM,
    info: i18n.t("protocol.mainnet"),
  },
  {
    network: POLYGON,
    info: i18n.t("protocol.l2"),
  },
  ...(SUPPORT_ARBITRUM
    ? [
        {
          network: ARBITRUM_ONE,
          info: i18n.t("protocol.l2"),
        },
      ]
    : []),
  ...(SUPPORT_OPTIMISM
    ? [
        {
          network: OPTIMISM,
          info: i18n.t("protocol.l2"),
        },
      ]
    : []),
  // {
  //   name: "Binance Smart Chain",
  //   info: i18n.t("protocol.compatibleChain"),
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

interface TopMenuProtocolListProps {
  onProtocolChange: () => void
}

export default function TopMenuProtocolList({
  onProtocolChange,
}: TopMenuProtocolListProps): ReactElement {
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)

  return (
    <div className="standard_width_padded center_horizontal">
      <ul>
        {listItemInfo.map((info) => (
          <TopMenuProtocolListItem
            isSelected={sameNetwork(currentNetwork, info.network)}
            key={info.network.name}
            network={info.network}
            info={info.info}
            onSelect={onProtocolChange}
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
