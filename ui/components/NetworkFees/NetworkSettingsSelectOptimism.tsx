import React, { ReactElement } from "react"
import { selectTransactionData } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import {
  ARBITRUM_ONE,
  NETWORK_BY_CHAIN_ID,
  OPTIMISM,
} from "@tallyho/tally-background/constants"
import { useTranslation } from "react-i18next"
import { useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"

export default function NetworkSettingsOptimism(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "networkFees.optimism",
  })

  const transactionData = useBackgroundSelector(selectTransactionData)

  const { name, chainID } =
    NETWORK_BY_CHAIN_ID[transactionData?.network.chainID ?? 1]
  if (chainID !== OPTIMISM.chainID && chainID !== ARBITRUM_ONE.chainID) {
    throw new Error(
      "NetworkSettingsSelect mismatch - expected an Optimism or Arbitrum transaction",
    )
  }

  return (
    <div className="fees standard_width">
      <div className="title">{t("title")}</div>
      <div className="simple_text">{t("header", { name })}</div>

      <div className="fees_chart">
        <div className="fees_chart_item">
          {name === "Optimism" ? (
            <div className="fees_icon icon_optimism" />
          ) : (
            <div className="fees_icon icon_arbitrum" />
          )}
          <span>{t("transactionFee")}</span>
        </div>
        <div className="fee_chart_sign">+</div>
        <div className="fees_chart_item">
          <div className="fees_icon icon_ethereum" />
          <span>{t("rollUp")}</span>
        </div>
        <div className="fee_chart_sign">=</div>

        <div className="fees_chart_item">
          <div className="fees_icon icon_gas" />
          <span>{t("estimatedGas")}</span>
        </div>
      </div>

      <div className="simple_text">{t("explainerOne", { name })}</div>

      <div className="simple_text">
        {t("explainerTwo", { name })}
        <br />
        {t("explainerThree")}
      </div>

      <SharedButton
        type="tertiary"
        size="medium"
        iconSmall="new-tab"
        onClick={() => {
          window
            .open(
              name === "Optimism"
                ? "https://help.optimism.io/hc/en-us/articles/4411895794715-Transaction-fees"
                : "https://developer.arbitrum.io/arbos/gas",
              "_blank",
            )
            ?.focus()
        }}
      >
        {t("learnMore")}
      </SharedButton>
      <style jsx>
        {`
          .title {
            color: var(--green-5);
            margin-bottom: 29px;
            font-weight: 600;
            font-size: 18px;
            line-height: 24px;
          }
          .simple_text {
            color: var(--green-5);
            margin-bottom: 8px;
          }
          .fees_chart {
            background: var(--hunter-green);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            color: var(--green-40);
            font-weight: 500;
            font-size: 12px;
            line-height: 16px;
            margin: 11px 0 16px;
          }
          .fees_icon {
            width: 32px;
            height: 32px;
            border-radius: 100%;
            background-size: contain;
            margin-bottom: 8px;
          }
          .fees_icon.icon_optimism {
            background-image: url("/images/networks/optimism@2x.png");
          }
          .fees_icon.icon_arbitrum {
            background-image: url("/images/networks/arbitrum_icon_small@2x.png");
          }
          .fees_icon.icon_ethereum {
            background-image: url("/images/ethereum-background@2x.png");
          }
          .fees_icon.icon_gas {
            background-image: url("/images/gas@2x.png");
          }
          .fees_chart_item {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .fee_chart_sign {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 25px;
          }
        `}
      </style>
    </div>
  )
}
