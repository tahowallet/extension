import { ESTIMATED_FEE_MULTIPLIERS_BY_TYPE } from "@tallyho/tally-background/constants/network-fees"
import {
  truncateDecimalAmount,
  weiToGwei,
} from "@tallyho/tally-background/lib/utils"
import {
  selectEstimatedFeesPerGas,
  selectFeeType,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../../hooks"

export default function FeeSettingsText(): ReactElement {
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
    <div>
      {typeof estimatedFeesPerGas !== "undefined"
        ? `~${estimatedGweiAmount} Gwei`
        : "Unknown"}
    </div>
  )
}
