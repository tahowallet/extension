import { createSelector } from "@reduxjs/toolkit"
import { PricePoint } from "../../assets"
import { getPricesState, selectCurrentNetwork } from "."
import { NetworksState } from "../networks"
import { LegacyEVMTransactionRequest } from "../../networks"
import { ROOTSTOCK } from "../../constants/networks"
import {
  TransactionConstruction,
  NetworkFeeSettings,
} from "../transaction-construction"
import { selectMainCurrencySymbol } from "./uiSelectors"
import { selectAssetPricePoint } from "../prices"

export const selectTransactionNetwork = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.transactionRequest?.network,
  (network) => network,
)

export const selectDefaultNetworkFeeSettings = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction,
  (state: { networks: NetworksState }) => state.networks,
  selectCurrentNetwork,
  selectTransactionNetwork,
  (
    transactionConstruction,
    networks,
    selectedNetwork,
    transactionNetwork,
  ): NetworkFeeSettings => {
    const currentNetwork = transactionNetwork || selectedNetwork
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
        gasPrice:
          currentNetwork.chainID === ROOTSTOCK.chainID
            ? (
                transactionConstruction.transactionRequest as LegacyEVMTransactionRequest
              )?.gasPrice
            : selectedFeesPerGas?.price ?? 0n,
        baseFeePerGas:
          networks.blockInfo[currentNetwork.chainID]?.baseFeePerGas ??
          undefined,
      },
    }
  },
)

export const selectEstimatedFeesPerGas = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.estimatedFeesPerGas,
  selectTransactionNetwork,
  selectCurrentNetwork,
  (gasData, transactionNetwork, selectedNetwork) =>
    transactionNetwork
      ? gasData[transactionNetwork.chainID]
      : gasData[selectedNetwork.chainID],
)

export const selectFeeType = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.feeTypeSelected,
  (feeTypeChosen) => feeTypeChosen,
)

export const selectBaseAsset = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.transactionRequest?.network.baseAsset,
  (baseAsset) => baseAsset,
)

export const selectTransactionMainCurrencyPricePoint = createSelector(
  [
    selectBaseAsset, // Base asset for transaction
    getPricesState,
    (state) => selectMainCurrencySymbol(state),
    selectCurrentNetwork,
  ],
  (
    baseAsset,
    prices,
    mainCurrencySymbol,
    currentNetwork,
  ): PricePoint | undefined =>
    selectAssetPricePoint(
      prices,
      baseAsset ?? currentNetwork.baseAsset, // Fallback to current network's base asset
      mainCurrencySymbol,
    ),
)

export const selectTransactionData = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.transactionRequest,
  (transactionRequestData) => transactionRequestData,
)

export const selectIsTransactionPendingSignature = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.status,
  (status) => status === "loaded" || status === "pending",
)

export const selectIsTransactionLoaded = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.status,
  (status) => status === "loaded",
)

export const selectIsTransactionSigned = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.status,
  (status) => status === "signed",
)

export const selectCurrentlyChosenNetworkFees = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction?.estimatedFeesPerGas?.[
      state.transactionConstruction.feeTypeSelected
    ],
  (feeData) => feeData,
)

export const selectHasInsufficientFunds = createSelector(
  selectTransactionData,
  (transactionDetails) =>
    !!transactionDetails?.annotation?.warnings?.includes("insufficient-funds"),
)
