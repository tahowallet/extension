import { createSelector } from "@reduxjs/toolkit"
import { PricePoint } from "../../assets"
import { selectCurrentNetwork } from "."
import { NetworksState } from "../networks"
import {
  TransactionConstruction,
  NetworkFeeSettings,
} from "../transaction-construction"
import { getAssetsState } from "./accountsSelectors"
import { selectMainCurrencySymbol } from "./uiSelectors"
import { selectAssetPricePoint } from "../assets"

export const selectDefaultNetworkFeeSettings = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction,
  (state: { networks: NetworksState }) => state.networks,
  selectCurrentNetwork,
  (transactionConstruction, networks, currentNetwork): NetworkFeeSettings => {
    const selectedFeesPerGas =
      transactionConstruction.estimatedFeesPerGas?.[currentNetwork.chainID]?.[
        transactionConstruction.feeTypeSelected
      ] ?? transactionConstruction.customFeesPerGas
    return {
      feeType: transactionConstruction.feeTypeSelected,
      gasLimit: undefined,
      suggestedGasLimit: transactionConstruction.transactionRequest?.gasLimit,
      values: {
        maxFeePerGas: selectedFeesPerGas?.maxFeePerGas ?? 0n,
        maxPriorityFeePerGas: selectedFeesPerGas?.maxPriorityFeePerGas ?? 0n,
        gasPrice: selectedFeesPerGas?.price ?? 0n,
        baseFeePerGas:
          networks.evm[currentNetwork.chainID].baseFeePerGas ?? undefined, // @TODO: Support multi-network
      },
    }
  }
)

export const selectEstimatedFeesPerGas = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.estimatedFeesPerGas,
  selectCurrentNetwork,
  (gasData, selectedNetwork) => gasData[selectedNetwork.chainID]
)

export const selectFeeType = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.feeTypeSelected,
  (feeTypeChosen) => feeTypeChosen
)

export const selectBaseAsset = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.transactionRequest?.network.baseAsset,
  (baseAsset) => baseAsset
)

export const selectTransactionMainCurrencyPricePoint = createSelector(
  selectBaseAsset, // Base asset for transaction
  getAssetsState,
  (state) => selectMainCurrencySymbol(state),
  selectCurrentNetwork,
  (
    baseAsset,
    assets,
    mainCurrencySymbol,
    currentNetwork
  ): PricePoint | undefined => {
    return selectAssetPricePoint(
      assets,
      baseAsset?.symbol ?? currentNetwork.baseAsset.symbol, // Fallback to current network's base asset
      mainCurrencySymbol
    )
  }
)

export const selectLastGasEstimatesRefreshTime = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.lastGasEstimatesRefreshed,
  (updateTime) => updateTime
)

export const selectTransactionData = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.transactionRequest,
  (transactionRequestData) => transactionRequestData
)

export const selectIsTransactionPendingSignature = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.status,
  (status) => status === "loaded" || status === "pending"
)

export const selectIsTransactionLoaded = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.status,
  (status) => status === "loaded"
)

export const selectIsTransactionSigned = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.status,
  (status) => status === "signed"
)

export const selectCurrentlyChosenNetworkFees = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction?.estimatedFeesPerGas?.[
      state.transactionConstruction.feeTypeSelected
    ],
  (feeData) => feeData
)
