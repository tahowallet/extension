import React, { ReactElement } from "react"
import {
  ARBITRUM_NOVA,
  ARBITRUM_ONE,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  ETHEREUM,
  SEPOLIA,
  ARBITRUM_SEPOLIA,
  isBuiltInNetwork,
  OPTIMISM,
  POLYGON,
  ROOTSTOCK,
  MEZO_TESTNET,
  TEST_NETWORK_BY_CHAIN_ID,
} from "@tallyho/tally-background/constants"
import { EVMNetwork, sameNetwork } from "@tallyho/tally-background/networks"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { selectShowTestNetworks } from "@tallyho/tally-background/redux-slices/ui"
import {
  selectProductionEVMNetworks,
  selectTestnetNetworks,
} from "@tallyho/tally-background/redux-slices/selectors/networks"
import { useTranslation } from "react-i18next"
import { useBackgroundSelector } from "../../hooks"
import TopMenuProtocolListItem from "./TopMenuProtocolListItem"
import TopMenuProtocolListFooter from "./TopMenuProtocolListFooter"
import { i18n } from "../../_locales/i18n"

export const productionNetworkDescription = {
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

const testNetworkDescription = {
  [MEZO_TESTNET.chainID]: i18n.t("protocol.mezoTestnet"),
  [SEPOLIA.chainID]: i18n.t("protocol.testnet"),
  [ARBITRUM_SEPOLIA.chainID]: i18n.t("protocol.testnet"),
}

type TopMenuProtocolListProps = {
  onProtocolChange: (network: EVMNetwork) => void
}

export default function TopMenuProtocolList({
  onProtocolChange,
}: TopMenuProtocolListProps): ReactElement {
  const { t } = useTranslation()
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)
  const showTestNetworks = useBackgroundSelector(selectShowTestNetworks)
  const productionNetworks = useBackgroundSelector(selectProductionEVMNetworks)
  const testnetNetworks = useBackgroundSelector(selectTestnetNetworks)

  const builtinNetworks = productionNetworks.filter(isBuiltInNetwork)

  const customNetworks = productionNetworks.filter(
    (network) => !isBuiltInNetwork(network),
  )

  const testNetworks = [...TEST_NETWORK_BY_CHAIN_ID].flatMap(
    (chainId) =>
      testnetNetworks.find((network) => network.chainID === chainId) ?? [],
  )

  return (
    <div className="container">
      <div className="networks_list">
        <ul className="standard_width center_horizontal">
          {builtinNetworks.map((network) => (
            <TopMenuProtocolListItem
              isSelected={sameNetwork(currentNetwork, network)}
              key={network.name}
              network={network}
              info={
                productionNetworkDescription[network.chainID] ||
                t("protocol.compatibleChain")
              }
              onSelect={onProtocolChange}
              isDisabled={disabledChainIDs.includes(network.chainID)}
            />
          ))}
          {customNetworks.length > 0 && (
            <>
              <li className="protocol_divider">
                <div className="divider_label">
                  {t("topMenu.protocolList.customNetworksSectionTitle")}
                </div>
                <div className="divider_line" />
              </li>
              {customNetworks.map((network) => (
                <TopMenuProtocolListItem
                  isSelected={sameNetwork(currentNetwork, network)}
                  key={network.name}
                  network={network}
                  info={t("protocol.compatibleChain")}
                  onSelect={onProtocolChange}
                />
              ))}
            </>
          )}
          {showTestNetworks && testNetworks.length > 0 && (
            <>
              <li className="protocol_divider">
                <div className="divider_label">
                  {t("topMenu.protocolList.testnetsSectionTitle")}
                </div>
                <div className="divider_line" />
              </li>
              {testNetworks.map((network) => (
                <TopMenuProtocolListItem
                  isSelected={sameNetwork(currentNetwork, network)}
                  key={network.name}
                  network={network}
                  info={testNetworkDescription[network.chainID]}
                  onSelect={onProtocolChange}
                />
              ))}
            </>
          )}
        </ul>
        <TopMenuProtocolListFooter />
      </div>
      <style jsx>
        {`
          .container {
            overflow-y: auto;
          }

          .networks_list {
            overflow-y: auto;
            overflow-x: hidden;
            display: flex;
            flex-direction: column;
            min-height: 512px;
          }

          ul {
            display: flex;
            padding: 0 24px;
            flex-direction: column;
          }

          .protocol_divider {
            display: flex;
            margin-top: 8px;
            margin-bottom: 16px;
            gap: 15px;
            position: relative;
          }
          .divider_line {
            flex-grow: 1;
            align-self: center;
            background: var(--green-120);
            height: 1px;
            margin-top: 1px;
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
