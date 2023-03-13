import React from "react"
import { useTranslation } from "react-i18next"
import {
  ARBITRUM_ONE,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  ETHEREUM,
  OPTIMISM,
  POLYGON,
} from "@tallyho/tally-background/constants"
import { getNetworkIcon } from "../../utils/networks"

// @TODO Rethink what networks we show once custom networks are supported
const productionNetworks = [
  ETHEREUM,
  POLYGON,
  OPTIMISM,
  ARBITRUM_ONE,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
]

/**
 * Renders a list of production network icons
 */
export default function SupportedChains(): JSX.Element {
  const { t } = useTranslation("translation", { keyPrefix: "onboarding" })
  return (
    <div className="supported_chains">
      <span>{t("supportedChains")}</span>
      <div className="chain_logos">
        {productionNetworks.map((network) => (
          <img
            width="24"
            height="24"
            key={network.chainID}
            src={getNetworkIcon(network)}
            alt={network.name}
          />
        ))}
      </div>
      <style jsx>{`
        .supported_chains {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }

        .supported_chains span {
          font-size: 12px;
          line-height: 16px;
          color: var(--green-40);
        }

        .chain_logos {
          display: flex;
          gap: 10px;
          opacity: 0.8;
        }
      `}</style>
    </div>
  )
}
