import React, { ReactElement } from "react"
import {
  truncateDecimalAmount,
  weiToGwei,
} from "@tallyho/tally-background/lib/utils"
import { CUSTOM_GAS_SELECT } from "@tallyho/tally-background/features"
import {
  EstimatedFeesPerGas,
  NetworkFeeSettings,
  NetworkFeeTypeChosen,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import {
  selectDefaultNetworkFeeSettings,
  selectEstimatedFeesPerGas,
  selectFeeType,
  selectTransactionData,
  selectTransactionMainCurrencyPricePoint,
} from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { enrichAssetAmountWithMainCurrencyValues } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { EVM_ROLLUP_CHAIN_IDS } from "@tallyho/tally-background/constants"
import {
  EVMNetwork,
  isEIP1559EnrichedTransactionRequest,
  isEIP1559TransactionRequest,
} from "@tallyho/tally-background/networks"
import {
  PricePoint,
  unitPricePointForPricePoint,
  assetAmountToDesiredDecimals,
} from "@tallyho/tally-background/assets"
import type { EnrichedEVMTransactionRequest } from "@tallyho/tally-background/services/enrichment"
import { useBackgroundSelector } from "../../hooks"
import FeeSettingsTextDeprecated from "./FeeSettingsTextDeprecated"

const getFeeDollarValue = (
  currencyPrice: PricePoint | undefined,
  gasLimit?: bigint,
  estimatedSpendPerGas?: bigint,
  estimatedL1RollupFee?: bigint
): string | undefined => {
  if (estimatedSpendPerGas) {
    if (!gasLimit || !currencyPrice) return undefined

    const [asset] = currencyPrice.pair

    let currencyCostPerBaseAsset
    const unitPricePoint = unitPricePointForPricePoint(currencyPrice)

    if (unitPricePoint) {
      currencyCostPerBaseAsset = assetAmountToDesiredDecimals(
        unitPricePoint.unitPrice,
        2
      )
    }

    const { localizedMainCurrencyAmount } =
      enrichAssetAmountWithMainCurrencyValues(
        {
          asset,
          amount:
            estimatedSpendPerGas * gasLimit + (estimatedL1RollupFee ?? 0n),
        },
        currencyPrice,
        currencyCostPerBaseAsset && currencyCostPerBaseAsset < 1 ? 4 : 2
      )
    return localizedMainCurrencyAmount
  }
  return undefined
}

const estimateGweiAmount = (options: {
  estimatedFeesPerGas: EstimatedFeesPerGas | undefined
  selectedFeeType: NetworkFeeTypeChosen
  baseFeePerGas: bigint
  networkSettings: NetworkFeeSettings
  network: EVMNetwork
  transactionData?: EnrichedEVMTransactionRequest
}): string => {
  const {
    network,
    networkSettings,
    baseFeePerGas,
    estimatedFeesPerGas,
    selectedFeeType,
    transactionData,
  } = options

  let estimatedSpendPerGas =
    networkSettings.values.gasPrice ||
    baseFeePerGas + networkSettings.values.maxPriorityFeePerGas
  if (
    transactionData &&
    !isEIP1559EnrichedTransactionRequest(transactionData) &&
    EVM_ROLLUP_CHAIN_IDS.has(network.chainID)
  ) {
    estimatedSpendPerGas += transactionData.estimatedRollupGwei
  }

  const estimatedGweiAmount =
    typeof estimatedFeesPerGas !== "undefined" &&
    typeof selectedFeeType !== "undefined"
      ? truncateDecimalAmount(weiToGwei(estimatedSpendPerGas ?? 0n), 0)
      : ""

  return estimatedGweiAmount
}

export default function FeeSettingsText({
  customNetworkSetting,
}: {
  customNetworkSetting?: NetworkFeeSettings
}): ReactElement {
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)
  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)
  const transactionData = useBackgroundSelector(selectTransactionData)
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
    selectTransactionMainCurrencyPricePoint
  )
  const estimatedGweiAmount = estimateGweiAmount({
    estimatedFeesPerGas,
    selectedFeeType,
    baseFeePerGas,
    networkSettings,
    transactionData,
    network: currentNetwork,
  })

  const gasLimit = networkSettings.gasLimit ?? networkSettings.suggestedGasLimit
  const estimatedSpendPerGas =
    networkSettings.values.gasPrice ||
    baseFeePerGas + networkSettings.values.maxPriorityFeePerGas

  if (typeof estimatedFeesPerGas === "undefined") return <div>Unknown</div>

  const estimatedRollupFee =
    transactionData &&
    EVM_ROLLUP_CHAIN_IDS.has(transactionData.network.chainID) &&
    !isEIP1559TransactionRequest(transactionData)
      ? transactionData.estimatedRollupFee
      : 0n

  const gweiValue = `${estimatedGweiAmount} Gwei`
  const dollarValue = getFeeDollarValue(
    mainCurrencyPricePoint,
    gasLimit,
    estimatedSpendPerGas,
    estimatedRollupFee
  )

  if (!CUSTOM_GAS_SELECT) {
    return <FeeSettingsTextDeprecated />
  }

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
