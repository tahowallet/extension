import React, { ReactElement } from "react"
import {
  ARBITRUM_NOVA,
  ARBITRUM_ONE,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  ETHEREUM,
  GOERLI,
  isBuiltInNetwork,
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
import classNames from "classnames"
import { useBackgroundSelector } from "../../hooks"
import TopMenuProtocolListItem from "./TopMenuProtocolListItem"
import TopMenuProtocolListFooter from "./TopMenuProtocolListFooter"
import { i18n } from "../../_locales/i18n"

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

type TopMenuProtocolListProps = {
  onProtocolChange: () => void
}

export default function TopMenuProtocolList({
  onProtocolChange,
}: TopMenuProtocolListProps): ReactElement {
  const { t } = useTranslation()
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)
  const showTestNetworks = useBackgroundSelector(selectShowTestNetworks)
  const productionNetworks = useBackgroundSelector(selectProductionEVMNetworks)

  const customNetworksEnabled = isEnabled(FeatureFlags.SUPPORT_CUSTOM_NETWORKS)
  const builtinNetworks = productionNetworks.filter(isBuiltInNetwork)
  const customNetworks = productionNetworks.filter(
    (network) => !isBuiltInNetwork(network)
  )

  return (
    <>
      <div className="standard_width_padded center_horizontal">
        <div className={classNames(customNetworksEnabled && "networks_list")}>
          <ul>
            {builtinNetworks.map((network) => (
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
            {isEnabled(FeatureFlags.SUPPORT_CUSTOM_NETWORKS) &&
              customNetworks.length > 0 && (
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
        <style jsx>
          {`
            .networks_list {
              overflow-y: auto;
              overflow-x: hidden;
              max-height: 464px;
            }
            .protocol_divider {
              display: flex;
              margin-bottom: 16px;
              gap: 15px;
              margin-top: 32px;
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
      {customNetworksEnabled && <TopMenuProtocolListFooter />}
    </>
  )
}
