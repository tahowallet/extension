import React, { ReactElement } from "react"
import {
  ARBITRUM_NOVA,
  ARBITRUM_ONE,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  ETHEREUM,
  GOERLI,
  OPTIMISM,
  POLYGON,
  ROOTSTOCK,
} from "@tallyho/tally-background/constants"
import { sameNetwork } from "@tallyho/tally-background/networks"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { selectShowTestNetworks } from "@tallyho/tally-background/redux-slices/ui"
import { selectProductionEVMNetworks } from "@tallyho/tally-background/redux-slices/selectors/networks"
import { useTranslation } from "react-i18next"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { useHistory } from "react-router-dom"
import classNames from "classnames"
import { useBackgroundSelector } from "../../hooks"
import TopMenuProtocolListItem from "./TopMenuProtocolListItem"
import { i18n } from "../../_locales/i18n"
import SharedButton from "../Shared/SharedButton"
import SharedIcon from "../Shared/SharedIcon"

const productionNetworkInfo = {
  [ETHEREUM.chainID]: i18n.t("protocol.mainnet"),
  [POLYGON.chainID]: i18n.t("protocol.l2"),
  [OPTIMISM.chainID]: i18n.t("protocol.l2"),
  [ARBITRUM_ONE.chainID]: i18n.t("protocol.l2"),
  [ROOTSTOCK.chainID]: i18n.t("protocol.beta"),
  [AVALANCHE.chainID]: i18n.t("protocol.avalanche"),
  [BINANCE_SMART_CHAIN.chainID]: i18n.t("protocol.compatibleChain"),
  [ARBITRUM_NOVA.chainID]: i18n.t("comingSoon"),
}

const disabledChainIDs = [ARBITRUM_NOVA.chainID]

const testNetworks = [
  {
    network: GOERLI,
    info: i18n.t("protocol.testnet"),
    isDisabled: false,
  },
]

interface TopMenuProtocolListProps {
  onProtocolChange: () => void
}

export default function TopMenuProtocolList({
  onProtocolChange,
}: TopMenuProtocolListProps): ReactElement {
  const { t } = useTranslation()
  const history = useHistory()
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)
  const showTestNetworks = useBackgroundSelector(selectShowTestNetworks)
  const productionNetworks = useBackgroundSelector(selectProductionEVMNetworks)

  const customNetworksEnabled = isEnabled(FeatureFlags.SUPPORT_CUSTOM_NETWORKS)

  return (
    <div className="standard_width_padded center_horizontal">
      <div className={classNames(customNetworksEnabled && "networks_list")}>
        <ul>
          {productionNetworks.map((network) => (
            <TopMenuProtocolListItem
              isSelected={sameNetwork(currentNetwork, network)}
              key={network.name}
              network={network}
              info={
                productionNetworkInfo[network.chainID] ||
                t("protocol.compatibleChain")
              }
              onSelect={onProtocolChange}
              isDisabled={disabledChainIDs.includes(network.chainID)}
            />
          ))}
          {showTestNetworks && testNetworks.length > 0 && (
            <>
              <li className="protocol_divider">
                <div className="divider_label">
                  {t("topMenu.protocolList.testnetsSectionTitle")}
                </div>
                <div className="divider_line" />
              </li>
              {testNetworks.map((info) => (
                <TopMenuProtocolListItem
                  isSelected={sameNetwork(currentNetwork, info.network)}
                  key={info.network.name}
                  network={info.network}
                  info={info.info}
                  onSelect={onProtocolChange}
                  isDisabled={info.isDisabled ?? false}
                />
              ))}
            </>
          )}
        </ul>
      </div>
      {customNetworksEnabled && (
        <footer className="custom_rpc_footer">
          <h2>{t("topMenu.protocolList.customRPCFooterTitle")}</h2>
          <p>{t("topMenu.protocolList.customRPCFooterDesc")}</p>
          <ul className="custom_rpc_icons">
            {(
              [
                [OPTIMISM, 1],
                [ARBITRUM_ONE, 0.8],
                [BINANCE_SMART_CHAIN, 0.7],
                [POLYGON, 0.5],
                [ARBITRUM_NOVA, 0.3],
                [ROOTSTOCK, 0.1],
              ] as const
            ).map(([network, opacity]) => {
              const icon = network.name.replaceAll(" ", "").toLowerCase()

              return (
                <img
                  key={icon}
                  width="24"
                  height="24"
                  alt={network.name}
                  src={`/images/networks/${icon}@2x.png`}
                  style={{ opacity }}
                />
              )
            })}
          </ul>
          <SharedButton
            size="medium"
            onClick={() => history.push("/settings/custom-networks")}
            type="tertiary"
          >
            <SharedIcon
              width={16}
              height={16}
              customStyles="margin-right: 4px"
              icon="icons/s/settings2.svg"
              color="currentColor"
            />
            {t("topMenu.protocolList.networkSettingsBtn")}
          </SharedButton>
        </footer>
      )}
      <style jsx>
        {`
          .networks_list {
            overflow-y: auto;
            overflow-x: hidden;
            max-height: 304px;
          }
          .custom_rpc_footer {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 8px;
            margin-bottom: 32px;
          }

          .custom_rpc_footer ul {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
          }

          .custom_rpc_footer h2 {
            font-family: "Segment";
            font-style: normal;
            font-weight: 600;
            font-size: 18px;
            line-height: 24px;
            color: var(--white);
            margin: 0;
          }
          .custom_rpc_footer p {
            margin: 0;
            font-family: "Segment";
            font-style: normal;
            font-weight: 500;
            font-size: 14px;
            line-height: 16px;
            line-height: 16px;
            letter-spacing: 0.03em;
            color: var(--green-40);
          }

          .protocol_divider {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
            margin-top: 32px;
          }
          .divider_line {
            width: 286px;
            border-bottom-color: var(--green-120);
            border-bottom-style: solid;
            border-bottom-width: 1px;
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
