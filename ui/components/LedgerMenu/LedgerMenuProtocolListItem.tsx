import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import classNames from "classnames"
import { useDispatch } from "react-redux"
import {
  setSelectedNetwork,
  derivationPathChange,
} from "@tallyho/tally-background/redux-slices/ui"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import {
  ETHEREUM,
  ROOTSTOCK,
  DEFAULT_DERIVATION_PATH,
} from "@tallyho/tally-background/constants"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"

interface Props {
  network: EVMNetwork
  ecosystem?: EVMNetwork[]
  isSelected: boolean
}

export default function LedgerMenuProtocolListItem(props: Props): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.onboarding.selectLedgerApp",
  })
  const { isSelected, network, ecosystem } = props
  const dispatch = useDispatch()

  const onNetworkSelect = () => {
    dispatch(setSelectedNetwork(network))

    if (network.derivationPath && network.chainID === ROOTSTOCK.chainID) {
      dispatch(derivationPathChange(network.derivationPath))
    } else {
      dispatch(derivationPathChange(DEFAULT_DERIVATION_PATH))
    }
  }

  return (
    <li
      className={classNames({ select: isSelected })}
      onClick={onNetworkSelect}
      role="presentation"
    >
      <div className="left">
        <div className="icon_wrap">
          <SharedNetworkIcon network={network} size={36} />
        </div>
        {ecosystem && (
          <div className="ecosystem_networks">
            {ecosystem.map((ecosystemNetwork) => (
              <SharedNetworkIcon
                key={ecosystemNetwork.name}
                network={ecosystemNetwork}
                size={18}
              />
            ))}
          </div>
        )}
      </div>
      <div className="right">
        <div className="title">
          {network.chainID === ETHEREUM.chainID
            ? t("ecosystem", { network: network.name })
            : network.name}
        </div>
        {network.chainID === ETHEREUM.chainID && (
          <span className="sub_title">
            {t("includes")}
            {ecosystem &&
              ecosystem.map(({ name }) => (
                <span key={name} className="sub_title_item">
                  {name}
                </span>
              ))}
          </span>
        )}
      </div>
      <style jsx>
        {`
          li {
            display: flex;
            margin-bottom: 5px;
            cursor: pointer;
            padding: 10px;
          }
          li.select {
            background-color: var(--green-95);
            padding: 10px;
            border-radius: 4px;
            box-shadow: 0px 16px 16px rgba(0, 20, 19, 0.14),
              0px 6px 8px rgba(0, 20, 19, 0.24),
              0px 2px 4px rgba(0, 20, 19, 0.34);
          }
          li:not(.select):hover {
            background-color: #13302e;
            padding: 10px;
            border-radius: 4px;
            box-shadow: var(--shadow);
          }
          .icon_wrap {
            border-radius: 4px;
            background-color: var(--hunter-green);
            padding: 2px;
          }
          .ecosystem_networks {
            margin-top: 3px;
            margin-left: 1px;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
          }
          .left {
            margin-right: 16px;
            margin-left: 2px;
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
            margin-top: 5px;
            color: var(--green-5);
            font-size: 20px;
            font-weight: 600;
            line-height: 24px;
          }
          .sub_title {
            height: 17px;
            color: var(--green-60);
            font-size: 16px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .sub_title_item:not(:last-child):after {
            content: " & ";
          }
          .sub_title_item:before {
            content: " ";
          }
        `}
      </style>
    </li>
  )
}

LedgerMenuProtocolListItem.defaultProps = {
  isSelected: false,
}
