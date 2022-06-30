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
import {
  selectCurrentNetwork,
  selectMainCurrencyPricePoint,
} from "@tallyho/tally-background/redux-slices/selectors"
import { enrichAssetAmountWithMainCurrencyValues } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { PricePoint } from "@tallyho/tally-background/assets"
import { useBackgroundSelector } from "../../hooks"

const getFeeDollarValue = (
  currencyPrice: PricePoint | undefined,
  networkSettings: NetworkFeeSettings,
  estimatedSpendPerGas?: bigint
): string | undefined => {
  if (estimatedSpendPerGas) {
    const gasLimit =
      networkSettings.gasLimit ?? networkSettings.suggestedGasLimit

    if (!gasLimit || !currencyPrice) return undefined

    const [asset] = currencyPrice.pair
    const { localizedMainCurrencyAmount } =
      enrichAssetAmountWithMainCurrencyValues(
        {
          asset,
          amount:
            estimatedSpendPerGas +
            BigInt(networkSettings.values.maxPriorityFeePerGas) * gasLimit,
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
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)
  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)
  const selectedFeeType = useBackgroundSelector(selectFeeType)
  let networkSettings = useBackgroundSelector(selectDefaultNetworkFeeSettings)
  networkSettings = customNetworkSetting ?? networkSettings
  const baseFeePerGas =
    useBackgroundSelector((state) => {
      return state.networks.evm[currentNetwork.chainID].baseFeePerGas
    }) ??
    networkSettings.values?.baseFeePerGas ??
    0n

  const mainCurrencyPricePoint = useBackgroundSelector(
    selectMainCurrencyPricePoint
  )
  const gasLimit = networkSettings.gasLimit ?? networkSettings.suggestedGasLimit
  const estimatedSpendPerGas =
    baseFeePerGas + networkSettings.values.maxPriorityFeePerGas

  const estimatedGweiAmount =
    typeof estimatedFeesPerGas !== "undefined" &&
    typeof selectedFeeType !== "undefined"
      ? truncateDecimalAmount(weiToGwei(estimatedSpendPerGas ?? 0n), 0)
      : ""

  if (typeof estimatedFeesPerGas === "undefined") return <div>Unknown</div>

  const gweiValue = `${estimatedGweiAmount} Gwei`
  const dollarValue = getFeeDollarValue(
    mainCurrencyPricePoint,
    networkSettings,
    estimatedSpendPerGas
  )

  if (!dollarValue) return <div>~{gweiValue}</div>

  return (
    <div>
      {!gasLimit && CUSTOM_GAS_SELECT ? (
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
