import React, { ReactElement } from "react"
import { selectTransactionData } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { ROOTSTOCK } from "@tallyho/tally-background/constants"
import { useTranslation } from "react-i18next"
import { useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"

export default function NetworkSettingsRSK(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "networkFees.rsk",
  })
  const transactionData = useBackgroundSelector(selectTransactionData)

  if (transactionData?.network.chainID !== ROOTSTOCK.chainID) {
    throw new Error(
      "NetworkSettingsSelect mismatch - expected an RSK transaction",
    )
  }

  return (
    <div className="fees standard_width">
      <div className="title">{t("title")}</div>
      <div className="simple_text">{t("header")}</div>

      <div className="fees_chart">
        <div className="fees_chart_item">
          <div className="fees_icon icon_rsk" />
          <span>{t("minGasPrice")}</span>
        </div>
        <div className="fee_chart_sign">*</div>
        <div className="fees_chart_item">
          <div className="fees_icon">{t("multiplier")}</div>
          <span>1.1</span>
        </div>
        <div className="fee_chart_sign">=</div>

        <div className="fees_chart_item">
          <div className="fees_icon icon_gas" />
          <span>{t("estimatedGas")}</span>
        </div>
      </div>

      <div className="simple_text">{t("explainerOne")}</div>

      <div className="simple_text">
        {t("explainerTwo")}
        <br />
        {t("explainerThree")}
      </div>

      <SharedButton
        type="tertiary"
        size="medium"
        iconSmall="new-tab"
        onClick={() => {
          window
            .open("https://developers.rsk.co/rsk/rbtc/gas/", "_blank")
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
          .fees_icon.icon_rsk {
            background-image: url("/images/networks/rsk@2x.png");
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
