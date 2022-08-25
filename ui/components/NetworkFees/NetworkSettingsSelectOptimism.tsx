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

      <div className="explainer">
        <span>
          Gas Fees on Optimism work differently from Ethereum. The bulk of the
          cost of an Optimism transaction is automatically deducted by the
          network to pay the Ethereum rollup fee and is not editable by the
          user.
        </span>
        <br />
        <span>
          Tally Ho stays in sync with the current Optimism and Ethereum network
          fees to estimate the fee for a given transaction. Only in rare cases
          will the actual fee you pay deviate by more than 25% from the provided
          estimate.
        </span>
        <br />
        <SharedButton
          type="tertiary"
          size="medium"
          iconMedium="new-tab"
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
      </div>
      <style jsx>
        {`
          .explainer {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: space-between;
            flex-direction: column;
            align-items: center;
            background: #002522;
            box-sizing: border-box;
            padding: 12px;
            margin: 8px 0;
            color: var(--green-20);
            border-radius: 4px;
            box-shadow: 0px 16px 16px rgba(0, 20, 19, 0.14),
              0px 6px 8px rgba(0, 20, 19, 0.24),
              0px 2px 4px rgba(0, 20, 19, 0.34);
          }
        `}
      </style>
    </div>
  )
}
