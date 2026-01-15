import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import classNames from "classnames"
import { EVMNetwork, sameNetwork } from "@tallyho/tally-background/networks"
import { MEZO_TESTNET } from "@tallyho/tally-background/constants"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"

type Props = {
  info: string
  network: EVMNetwork
  isSelected: boolean
  isHighlighted?: boolean
  isDisabled: boolean
  onSelect: (network: EVMNetwork) => void
  onMouseMove?: () => void
  showSelectedText?: boolean
}

const isFeaturedNetwork = (network: EVMNetwork) => {
  if (sameNetwork(network, MEZO_TESTNET)) {
    return Date.now() < new Date("2025-04-17").getTime()
  }
  return false
}

export default function TopMenuProtocolListItem(props: Props): ReactElement {
  const { t } = useTranslation()
  const {
    info,
    isSelected,
    isHighlighted,
    network,
    onSelect,
    onMouseMove,
    isDisabled,
    showSelectedText = true,
  } = props

  return (
    <li
      className={classNames({
        select: isSelected,
        highlighted: isHighlighted,
        disabled: isDisabled,
      })}
      onClick={() => {
        if (isDisabled) return
        onSelect(network)
      }}
      onMouseMove={onMouseMove}
      role="presentation"
    >
      <div className="left">
        <div className="icon_wrap">
          <SharedNetworkIcon size={24} network={network} />
        </div>
      </div>
      <div className="right">
        <div className="title">
          {network.name}
          {isFeaturedNetwork(network) && (
            <span className="featured">{t("protocol.newNetwork")}</span>
          )}
        </div>
        <div className="sub_title">
          {info}
          {isSelected && showSelectedText && (
            <span className="status">{t("protocol.connected")}</span>
          )}
        </div>
      </div>
      <style jsx>
        {`
          .featured {
            display: inline-block;
            box-sizing: border-box;
            vertical-align: top;
            padding: 2px 8px; 
            border-radius: 16px;
            width: 45px;
            height: 20px;
            text-transform: uppercase;
            color: var(--green-95);
            background-color: var(--success);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.03em;
            line-height: 16px;
            text-align: center;
            margin-left: 10px;
          }

          li {
            display: flex;
            margin-bottom: 0;
            cursor: pointer;
            padding: 12px 24px;
            margin-left: -24px;
            margin-right: -24px;
          }
          li.highlighted {
            background-color: var(--hunter-green);
          }
          .status {
            height: 17px;
            color: var(--success);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-left: 8px;
          }
          .icon_wrap {
            width: 40px;
            height: 40px;
            border-radius: 4px;
            background-color: var(--hunter-green);
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            border: 2px solid transparent;
          }
          .left {
            margin-right: 16px;
          }
          .right {
            height: 24px;
            color: var(--green-5);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          .title {
            height: 24px;
            color: var(--green-5);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          .sub_title {
            height: 17px;
            color: var(--green-60);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .select .icon_wrap {
            border: 2px solid var(--success);
          }
          .disabled {
            cursor: default;
          }
          .disabled .title {
            color var(--green-20);
          }
        `}
      </style>
    </li>
  )
}

TopMenuProtocolListItem.defaultProps = {
  isSelected: false,
  isDisabled: false,
}
