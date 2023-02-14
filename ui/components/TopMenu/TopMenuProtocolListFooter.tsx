import React from "react"
import {
  ARBITRUM_NOVA,
  ARBITRUM_ONE,
  BINANCE_SMART_CHAIN,
  OPTIMISM,
  POLYGON,
  ROOTSTOCK,
} from "@tallyho/tally-background/constants"
import { useTranslation } from "react-i18next"
import { useHistory } from "react-router-dom"
import SharedButton from "../Shared/SharedButton"
import SharedIcon from "../Shared/SharedIcon"
import { getNetworkIconName } from "../../utils/networks"

export default function TopMenuProtocolListFooter(): JSX.Element {
  const history = useHistory()
  const { t } = useTranslation()

  return (
    <footer>
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
          const icon = getNetworkIconName(network)

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
      <style jsx>
        {`
          footer {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 8px;
            margin-bottom: 16px;
          }

          footer ul {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
          }

          footer h2 {
            font-family: "Segment";
            font-style: normal;
            font-weight: 600;
            font-size: 18px;
            line-height: 24px;
            color: var(--white);
            margin: 0;
          }

          footer p {
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
        `}
      </style>
    </footer>
  )
}
