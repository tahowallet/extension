import { ESTIMATED_FEE_MULTIPLIERS_BY_TYPE } from "@tallyho/tally-background/constants/network-fees"
import {
  truncateDecimalAmount,
  weiToGwei,
} from "@tallyho/tally-background/lib/utils"
import {
  selectDefaultNetworkFeeSettings,
  selectEstimatedFeesPerGas,
  selectFeeType,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import { ETH } from "@tallyho/tally-background/constants"
import { selectMainCurrencyPricePoint } from "@tallyho/tally-background/redux-slices/selectors"
import { enrichAssetAmountWithMainCurrencyValues } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { PricePoint } from "@tallyho/tally-background/assets"
import React, { ReactElement } from "react"
import { getGasLimit } from "@tallyho/tally-background/redux-slices/utils/transacation-utils"
import { useBackgroundSelector } from "../../hooks"

const getFeeDollarValue = (
  currencyPrize: PricePoint | undefined,
  networkSettings: {
    gasLimit: string
    suggestedGasLimit: bigint | undefined
    values: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }
  }
) => {
  const {
    values: { maxFeePerGas, maxPriorityFeePerGas },
  } = networkSettings

  const gasLimit = getGasLimit(networkSettings)

  if (!gasLimit) return null

  const { localizedMainCurrencyAmount } =
    enrichAssetAmountWithMainCurrencyValues(
      {
        asset: ETH,
        amount: (maxFeePerGas + maxPriorityFeePerGas) * gasLimit,
      },
      currencyPrize,
      2
    )

  return localizedMainCurrencyAmount
}

export default function FeeSettingsText({
  showDollarValue = false,
}: {
  showDollarValue?: boolean
}): ReactElement {
  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)
  const selectedFeeType = useBackgroundSelector(selectFeeType)
  const networkSettings = useBackgroundSelector(selectDefaultNetworkFeeSettings)
  const mainCurrencyPricePoint = useBackgroundSelector(
    selectMainCurrencyPricePoint
  )

  const dollarValue = getFeeDollarValue(mainCurrencyPricePoint, networkSettings)

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

  if (typeof estimatedFeesPerGas === "undefined") return <div>Unknown</div>

  const gweiValue = `${estimatedGweiAmount} Gwei`

  if (!showDollarValue || !dollarValue) return <div>~{gweiValue}</div>

  return (
    <div>
      ~${dollarValue}
      <span className="fee_gwei">({gweiValue})</span>
      <style jsx>{`
        .fee_gwei {
          color: var(--green-60);
          margin-left: 5px;
        }
      `}</style>
    </div>
  )
}
