import React, { ReactElement } from "react"
import {
  selectEstimatedFeesPerGas,
  selectFeeType,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import { ESTIMATED_FEE_MULTIPLIERS_BY_TYPE } from "@tallyho/tally-background/constants/networkFees"
import {
  truncateDecimalAmount,
  weiToGwei,
} from "@tallyho/tally-background/lib/utils"
import { useBackgroundSelector } from "../../hooks"

interface FeeSettingsButtonProps {
  onClick: () => void
}

export default function FeeSettingsButton({
  onClick,
}: FeeSettingsButtonProps): ReactElement {
  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)
  const selectedFeeType = useBackgroundSelector(selectFeeType)

  const estimatedGweiAmount =
    typeof estimatedFeesPerGas !== "undefined" &&
    typeof selectedFeeType !== "undefined"
      ? truncateDecimalAmount(
          weiToGwei(
            (estimatedFeesPerGas?.baseFeePerGas *
              ESTIMATED_FEE_MULTIPLIERS_BY_TYPE[selectedFeeType]) /
              10n
          ),
          0
        )
      : ""

  return (
    <button className="settings" type="button" onClick={onClick}>
      <div>
        {typeof estimatedFeesPerGas !== "undefined"
          ? `~${estimatedGweiAmount} Gwei`
          : "Unknown"}
      </div>
      <img className="settings_image" src="./images/cog@2x.png" alt="" />
      <style jsx>
        {`
          .settings {
            height: 32px;
            display: flex;
            align-items: center;
            color: var(--gold-5);
            font-size: 16px;
            line-height: 20px;
            border-radius: 4px;
            padding-left: 4px;
            border: 1px solid #33514e;
            transition: all 0.3s ease;
          }
          .settings_image {
            width: 14px;
            height: 14px;
            padding: 0 8px;
            transition: all 0.3s ease;
          }
          .settings:hover {
            border: 1px solid #578f89;
          }
          .settings:hover .settings_image {
            filter: brightness(1.5);
          }
        `}
      </style>
    </button>
  )
}
