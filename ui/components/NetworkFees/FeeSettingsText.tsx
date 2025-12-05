import React, { ReactElement } from "react"
import {
  truncateDecimalAmount,
  weiToGwei,
} from "@tallyho/tally-background/lib/utils"
import { NetworkFeeSettings } from "@tallyho/tally-background/redux-slices/transaction-construction"
import {
  heuristicDesiredDecimalsForUnitPrice,
  enrichAssetAmountWithMainCurrencyValues,
  convertUSDPricePointToCurrency,
} from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import {
  selectDefaultNetworkFeeSettings,
  selectEstimatedFeesPerGas,
  selectTransactionData,
  selectTransactionBaseAssetPricePoint,
} from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import {
  selectCurrentNetwork,
  selectDisplayCurrency,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  ARBITRUM_ONE,
  BINANCE_SMART_CHAIN,
  isBuiltInNetwork,
  OPTIMISM,
  ROOTSTOCK,
} from "@tallyho/tally-background/constants"
import {
  EVMNetwork,
  isEIP1559EnrichedTransactionRequest,
  isEIP1559TransactionRequest,
} from "@tallyho/tally-background/networks"
import { useTranslation } from "react-i18next"
import {
  PricePoint,
  unitPricePointForPricePoint,
  assetAmountToDesiredDecimals,
  DisplayCurrency,
} from "@tallyho/tally-background/assets"
import type { EnrichedEVMTransactionRequest } from "@tallyho/tally-background/services/enrichment"
import { currencies } from "@thesis-co/cent"
import { useBackgroundSelector } from "../../hooks"

const getFeeFiatValue = (
  feePricePoint: PricePoint | undefined,
  currency: DisplayCurrency,
  gasLimit?: bigint,
  estimatedSpendPerGas?: bigint,
  estimatedL1RollupFee?: bigint,
): string | undefined => {
  if (estimatedSpendPerGas) {
    if (!gasLimit || !feePricePoint) return undefined

    const [asset] = feePricePoint.pair

    let currencyCostPerBaseAsset
    const unitPricePoint = unitPricePointForPricePoint(feePricePoint)

    if (unitPricePoint) {
      currencyCostPerBaseAsset = assetAmountToDesiredDecimals(
        unitPricePoint.unitPrice,
        2,
      )
    }

    const assetAmount = {
      asset,
      amount: estimatedSpendPerGas * gasLimit + (estimatedL1RollupFee ?? 0n),
    }

    const { localizedMainCurrencyAmount } =
      enrichAssetAmountWithMainCurrencyValues(
        assetAmount,
        feePricePoint,
        currencyCostPerBaseAsset && currencyCostPerBaseAsset < 1 ? 4 : 2,
        currency,
      )
    return localizedMainCurrencyAmount
  }
  return undefined
}

const estimateGweiAmount = (options: {
  baseFeePerGas: bigint
  networkSettings: NetworkFeeSettings
  network: EVMNetwork
  transactionData?: EnrichedEVMTransactionRequest
}): string => {
  const { network, networkSettings, baseFeePerGas, transactionData } = options
  let estimatedSpendPerGas =
    baseFeePerGas + networkSettings.values.maxPriorityFeePerGas

  if (
    transactionData &&
    !isEIP1559EnrichedTransactionRequest(transactionData) &&
    network.chainID === OPTIMISM.chainID
  ) {
    estimatedSpendPerGas =
      (networkSettings.values.gasPrice || estimatedSpendPerGas) +
      transactionData.estimatedRollupGwei
  }

  let desiredDecimals = 0

  if (ROOTSTOCK.chainID === network.chainID) {
    estimatedSpendPerGas = networkSettings.values.gasPrice ?? 0n
    desiredDecimals = 2
  }

  if (network.chainID === ARBITRUM_ONE.chainID) {
    estimatedSpendPerGas = baseFeePerGas
    desiredDecimals = 2
  }

  if (network.chainID === BINANCE_SMART_CHAIN.chainID) {
    estimatedSpendPerGas = networkSettings.values.gasPrice ?? 0n
    desiredDecimals = 2
  }

  const estimatedSpendPerGasInGwei = weiToGwei(estimatedSpendPerGas ?? 0n)
  const decimalLength = heuristicDesiredDecimalsForUnitPrice(
    desiredDecimals,
    Number(estimatedSpendPerGasInGwei),
  )
  const estimatedGweiAmount = truncateDecimalAmount(
    estimatedSpendPerGasInGwei,
    decimalLength,
  )

  return estimatedGweiAmount
}

export default function FeeSettingsText({
  customNetworkSetting,
}: {
  customNetworkSetting?: NetworkFeeSettings
}): ReactElement {
  const { t } = useTranslation()
  const transactionData = useBackgroundSelector(selectTransactionData)
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)
  const currentNetwork = transactionData?.network || selectedNetwork
  const networkIsBuiltIn = isBuiltInNetwork(currentNetwork)
  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)
  let networkSettings = useBackgroundSelector(selectDefaultNetworkFeeSettings)
  networkSettings = customNetworkSetting ?? networkSettings
  const baseFeePerGas =
    useBackgroundSelector(
      (state) =>
        state.networks.blockInfo[currentNetwork.chainID]?.baseFeePerGas,
    ) ??
    networkSettings.values?.baseFeePerGas ??
    0n

  const displayCurrency = useBackgroundSelector(selectDisplayCurrency)

  const baseAssetPricePoint = useBackgroundSelector(
    selectTransactionBaseAssetPricePoint,
  )
  const mainCurrencyPricePoint = baseAssetPricePoint
    ? convertUSDPricePointToCurrency(baseAssetPricePoint, displayCurrency)
    : undefined

  const estimatedGweiAmount = estimateGweiAmount({
    baseFeePerGas,
    networkSettings,
    transactionData,
    network: currentNetwork,
  })

  const gasLimit = networkSettings.gasLimit ?? networkSettings.suggestedGasLimit
  const estimatedSpendPerGas =
    networkSettings.values.gasPrice ||
    baseFeePerGas + networkSettings.values.maxPriorityFeePerGas

  if (typeof estimatedFeesPerGas === "undefined")
    return <div>{t("networkFees.unknownFee")}</div>

  const estimatedRollupFee =
    transactionData &&
    transactionData.network.chainID === OPTIMISM.chainID &&
    !isEIP1559TransactionRequest(transactionData)
      ? transactionData.estimatedRollupFee
      : 0n

  const gweiValue = `${estimatedGweiAmount} Gwei`
  const currencyValue = getFeeFiatValue(
    mainCurrencyPricePoint,
    displayCurrency,
    gasLimit,
    estimatedSpendPerGas,
    estimatedRollupFee,
  )

  if (!currencyValue) return <div>~{gweiValue}</div>

  return (
    <div className="fee_settings_text_container">
      {!gasLimit ? (
        <>{t("networkFees.toBeDetermined")}</>
      ) : (
        <>
          {/* TODO: Add proper currency formatting */}
          {networkIsBuiltIn && (
            <span>
              ~{currencies[displayCurrency.code].symbol}
              {currencyValue}
            </span>
          )}
          <span className="fee_gwei">({gweiValue})</span>
        </>
      )}
      <style jsx>{`
        .fee_gwei {
          color: var(--green-60);
          margin-left: 5px;
        }
        .fee_settings_text_container {
          display: flex;
          justify-content: space-around;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  )
}
