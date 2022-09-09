import React, { ReactElement } from "react"
import { selectTransactionData } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { OPTIMISM } from "@tallyho/tally-background/constants"
import { useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"

export default function NetworkSettingsOptimism(): ReactElement {
  const transactionData = useBackgroundSelector(selectTransactionData)
  if (transactionData?.network.chainID !== OPTIMISM.chainID) {
    throw new Error(
      "NetworkSettingsSelect mismatch - expected an Optimism transaction"
    )
  }

  return (
    <div className="fees standard_width">
      <div className="title">Network Fees</div>
      <div className="simple_text">
        Gas fees on Optimism work differently from Ethereum.
      </div>

      <div className="fees_chart">
        <div className="fees_chart_item">
          <div className="fees_icon icon_optimism" />
          <span>Transaction fee</span>
        </div>
        <div className="fee_chart_sign">+</div>
        <div className="fees_chart_item">
          <div className="fees_icon icon_ethereum" />
          <span>Roll-up</span>
        </div>
        <div className="fee_chart_sign">=</div>

        <div className="fees_chart_item">
          <div className="fees_icon icon_gas" />
          <span>Estimated Gas</span>
        </div>
      </div>

      <div className="simple_text">
        The estimated gas cost for Optimism transactions includes Optimism fee +
        Ethereum roll-up fee (fee to register transaction on Ethereum chain).
      </div>

      <div className="simple_text">
        Tally Ho stays in sync with the current Optimism and Ethereum network
        fees to estimate the fee for a given transaction.
        <br />
        Only in rare cases will the actual fee you pay change by more than 25%
        from the estimate.
      </div>

      <SharedButton
        type="tertiary"
        size="medium"
        iconSmall="new-tab"
        onClick={() => {
          window
            .open(
              "https://help.optimism.io/hc/en-us/articles/4411895794715-Transaction-fees",
              "_blank"
            )
            ?.focus()
        }}
      >
        Learn More
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
