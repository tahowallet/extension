import { createSelector } from "@reduxjs/toolkit"
import { PricePoint } from "../../assets"
import { getPricesState, selectCurrentNetwork } from "."
import { NetworksState } from "../networks"
import {
  AnyTransactionRequest,
  isSparkTransactionRequest,
  LegacyEVMTransactionRequest,
} from "../../networks"
import type { EnrichedEVMTransactionRequest } from "../../services/enrichment"
import { ROOTSTOCK } from "../../constants/networks"
import {
  TransactionConstruction,
  NetworkFeeSettings,
} from "../transaction-construction"
import { selectMainCurrencySymbol } from "./uiSelectors"
import { selectUnreachableNetworks } from "./networks"
import { selectAssetPricePoint } from "../prices"

/**
 * The transaction awaiting signature, on any network family; what the
 * signing screen shows.
 */
export const selectPendingTransactionRequest = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.transactionRequest,
  (transactionRequest): AnyTransactionRequest | undefined => transactionRequest,
)

/**
 * The pending transaction if it is an EVM one. Gas, nonce and simulation
 * machinery only applies to EVM transactions, so it reads this.
 */
const selectEVMTransactionRequest = createSelector(
  selectPendingTransactionRequest,
  (transactionRequest): EnrichedEVMTransactionRequest | undefined =>
    transactionRequest === undefined ||
    isSparkTransactionRequest(transactionRequest)
      ? undefined
      : transactionRequest,
)

export const selectTransactionNetwork = createSelector(
  selectEVMTransactionRequest,
  (transactionRequest) => transactionRequest?.network,
)

export const selectDefaultNetworkFeeSettings = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction,
  (state: { networks: NetworksState }) => state.networks,
  selectCurrentNetwork,
  selectTransactionNetwork,
  selectEVMTransactionRequest,
  (
    transactionConstruction,
    networks,
    selectedNetwork,
    transactionNetwork,
    evmTransactionRequest,
  ): NetworkFeeSettings => {
    const currentNetwork = transactionNetwork || selectedNetwork
    const selectedFeesPerGas =
      transactionConstruction.estimatedFeesPerGas?.[currentNetwork.chainID]?.[
        transactionConstruction.feeTypeSelected
      ] ?? transactionConstruction.customFeesPerGas
    return {
      feeType: transactionConstruction.feeTypeSelected,
      gasLimit: undefined,
      suggestedGasLimit: evmTransactionRequest?.gasLimit,
      values: {
        maxFeePerGas: selectedFeesPerGas?.maxFeePerGas ?? 0n,
        maxPriorityFeePerGas: selectedFeesPerGas?.maxPriorityFeePerGas ?? 0n,
        gasPrice:
          currentNetwork.chainID === ROOTSTOCK.chainID
            ? (evmTransactionRequest as LegacyEVMTransactionRequest)?.gasPrice
            : (selectedFeesPerGas?.price ?? 0n),
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

/** The pending EVM transaction, for gas and fee settings UI. */
export const selectTransactionData = selectEVMTransactionRequest

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

/**
 * Whether the network a pending transaction would be signed against cannot be
 * reached.
 *
 * Composed on the transaction's own network rather than the selected one, which
 * also settles a question the signing frame would otherwise have to ask: the
 * frame is shared with message and typed-data signing, neither of which needs
 * anything from the chain. Those requests carry no network, so this is false
 * for them without any branching on request type.
 */
export const selectIsSigningNetworkUnreachable = createSelector(
  selectTransactionNetwork,
  selectUnreachableNetworks,
  (network, unreachableNetworks) =>
    network !== undefined && unreachableNetworks[network.chainID] === true,
)

export const selectHasInsufficientFunds = createSelector(
  selectPendingTransactionRequest,
  (transactionRequest) =>
    transactionRequest !== undefined &&
    (isSparkTransactionRequest(transactionRequest)
      ? !!transactionRequest.warnings?.includes("insufficient-funds")
      : !!transactionRequest.annotation?.warnings?.includes(
          "insufficient-funds",
        )),
)

export const selectTransactionLikelyFails = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.transactionLikelyFails,
  (transactionLikelyFails) => transactionLikelyFails,
)

export const selectGasEstimationError = createSelector(
  (state: { transactionConstruction: TransactionConstruction }) =>
    state.transactionConstruction.gasEstimationError,
  (gasEstimationError) => gasEstimationError,
)
