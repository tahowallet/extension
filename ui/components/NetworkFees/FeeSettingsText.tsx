import React, { ReactElement } from "react"
import {
  truncateDecimalAmount,
  weiToGwei,
} from "@tallyho/tally-background/lib/utils"
import { CUSTOM_GAS_SELECT } from "@tallyho/tally-background/features"
import { NetworkFeeSettings } from "@tallyho/tally-background/redux-slices/transaction-construction"
import {
  selectDefaultNetworkFeeSettings,
  selectEstimatedFeesPerGas,
  selectFeeType,
} from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { selectMainCurrencyPricePoint } from "@tallyho/tally-background/redux-slices/selectors"
import { enrichAssetAmountWithMainCurrencyValues } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { PricePoint } from "@tallyho/tally-background/assets"
import { useBackgroundSelector } from "../../hooks"

const getFeeDollarValue = (
  currencyPrice: PricePoint | undefined,
  networkSettings: NetworkFeeSettings
): string | undefined => {
  if (networkSettings.values?.baseFeePerGas) {
    const gasLimit =
      networkSettings.gasLimit ?? networkSettings.suggestedGasLimit

    if (!gasLimit || !currencyPrice) return undefined

    const [asset] = currencyPrice.pair
    const { localizedMainCurrencyAmount } =
      enrichAssetAmountWithMainCurrencyValues(
        {
          asset,
          amount: networkSettings.values?.baseFeePerGas * gasLimit,
        },
        currencyPrice,
        2
      )

    return localizedMainCurrencyAmount
  }
  return undefined
}

export default function FeeSettingsText({
  customNetworkSetting,
}: {
  customNetworkSetting?: NetworkFeeSettings
}): ReactElement {
  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)
  const selectedFeeType = useBackgroundSelector(selectFeeType)
  let networkSettings = useBackgroundSelector(selectDefaultNetworkFeeSettings)
  networkSettings = customNetworkSetting ?? networkSettings

  const mainCurrencyPricePoint = useBackgroundSelector(
    selectMainCurrencyPricePoint
  )

  const estimatedGweiAmount =
    typeof estimatedFeesPerGas !== "undefined" &&
    typeof selectedFeeType !== "undefined"
      ? truncateDecimalAmount(
          weiToGwei(networkSettings.values?.baseFeePerGas ?? 0n),
          0
        )
      : ""

  if (typeof estimatedFeesPerGas === "undefined") return <div>Unknown</div>

  const gweiValue = `${estimatedGweiAmount} Gwei`
  const dollarValue = getFeeDollarValue(mainCurrencyPricePoint, networkSettings)

  return (
    <div>
      {!networkSettings.gasLimit && CUSTOM_GAS_SELECT ? (
        <>TBD</>
      ) : (
        <>
          ~${dollarValue}
          <span className="fee_gwei">({gweiValue})</span>
        </>
      )}
      <style jsx>{`
        .fee_gwei {
          color: var(--green-60);
          margin-left: 5px;
        }
      `}</style>
    </div>
  )
}
