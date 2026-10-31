import { ethers, utils } from "ethers"
import { Logger, UnsignedTransaction } from "ethers/lib/utils"
import {
  ARBITRUM_ONE,
  EIP_1559_COMPLIANT_CHAIN_IDS,
  ETHEREUM,
  OPTIMISM,
} from "../../constants"
import { FeatureFlags, isEnabled } from "../../features"
import logger from "../../lib/logger"
import type {
  EVMNetwork,
  SignedTransaction,
  TransactionRequest,
} from "../../networks"
import type {
  EnrichedEIP1559TransactionRequest,
  EnrichedEIP1559TransactionSignatureRequest,
  EnrichedEVMTransactionRequest,
  EnrichedEVMTransactionSignatureRequest,
  EnrichedLegacyTransactionRequest,
  EnrichedLegacyTransactionSignatureRequest,
} from "../enrichment"
import type NonceAllocator from "./nonce-allocator"
import type SerialFallbackProvider from "./serial-fallback-provider"
import type TransactionTracker from "./transaction-tracker"
import {
  ethersTransactionFromSignedTransaction,
  ethersTransactionFromTransactionRequest,
  unsignedTransactionFromEVMTransaction,
} from "./utils"
import {
  OPTIMISM_GAS_ORACLE_ABI,
  OPTIMISM_GAS_ORACLE_ADDRESS,
} from "./utils/optimismGasPriceOracle"

export type TransactionSubmitterDependencies = {
  providerFor: (network: EVMNetwork) => SerialFallbackProvider
  nonceAllocator: NonceAllocator
  transactionTracker: TransactionTracker
  onSent: (hash: string) => void
  onSendFailed: () => void
}

/**
 * Populates transaction requests, estimates their gas, and broadcasts them
 * once signed.
 */
export default class TransactionSubmitter {
  constructor(
    private readonly dependencies: TransactionSubmitterDependencies,
  ) {}

  /**
   * Populates the provided partial legacy transaction request with all fields
   * except the nonce. This leaves the transaction ready for user review, and
   * the nonce ready to be filled in immediately prior to signing to minimize the
   * likelihood for nonce reuse.
   *
   * Note that if the partial request already has a defined nonce, it is not
   * cleared.
   */
  private async populatePartialLegacyEVMTransactionRequest(
    network: EVMNetwork,
    partialRequest: EnrichedLegacyTransactionSignatureRequest,
  ): Promise<{
    transactionRequest: EnrichedLegacyTransactionRequest
    gasEstimationError: string | undefined
  }> {
    const {
      from,
      to,
      value,
      gasLimit,
      input,
      gasPrice,
      nonce,
      annotation,
      broadcastOnSign,
    } = partialRequest

    // we know that a transactionRequest will fail with gasPrice 0
    // and sometimes 3rd party api's (like 0x) may return transaction requests
    // with gasPrice === 0, so we override the set gasPrice in those cases
    const safeGasEstimate = async (price?: bigint) => {
      // This prevents the tx being rejected because of a small gas price
      // difference
      if (network.chainID === ARBITRUM_ONE.chainID) {
        return this.estimateGasPrice(network)
      }

      return price || this.estimateGasPrice(network)
    }

    // Basic transaction construction based on the provided options, with extra data from the chain service
    const transactionRequest: EnrichedLegacyTransactionRequest = {
      from,
      to,
      value: value ?? 0n,
      gasLimit: gasLimit ?? 0n,
      input: input ?? null,
      gasPrice: await safeGasEstimate(gasPrice),
      type: 0 as const,
      network,
      chainID: network.chainID,
      nonce,
      annotation,
      estimatedRollupGwei:
        network.chainID === OPTIMISM.chainID
          ? await this.estimateL1RollupGasPrice(network)
          : 0n,
      estimatedRollupFee: 0n,
      broadcastOnSign,
    }

    if (network.chainID === OPTIMISM.chainID) {
      transactionRequest.estimatedRollupFee =
        await this.estimateL1RollupFeeForOptimism(
          network,
          unsignedTransactionFromEVMTransaction(transactionRequest),
        )
    }

    // Always estimate gas to decide whether the transaction will likely fail.
    let estimatedGasLimit: bigint | undefined
    let gasEstimationError: string | undefined
    try {
      estimatedGasLimit = await this.estimateGasLimit(
        network,
        transactionRequest,
      )
    } catch (error) {
      logger.error("Error estimating gas limit: ", error)
      // Try to identify unpredictable gas errors to bubble that information
      // out.
      if (error instanceof Error) {
        // Ethers does some heavily loose typing around errors to carry
        // arbitrary info without subclassing Error, so an any cast is needed.
        // oxlint-disable-next-line typescript/no-explicit-any
        const anyError: any = error

        if (
          "code" in anyError &&
          anyError.code === Logger.errors.UNPREDICTABLE_GAS_LIMIT
        ) {
          // anyError.error can be an object with properties like code, body, etc.
          // We need to convert it to a displayable string
          const innerError = anyError.error
          if (typeof innerError === "string") {
            gasEstimationError = innerError
          } else if (innerError && typeof innerError === "object") {
            gasEstimationError =
              innerError.message ??
              innerError.reason ??
              JSON.stringify(innerError, null, 2)
          } else {
            gasEstimationError = "Unknown transaction error."
          }
        }
      }
    }

    // We use the estimate as the actual limit only if user did not specify the
    // gas explicitly or if it was set below the minimum network-allowed value.
    if (
      typeof estimatedGasLimit !== "undefined" &&
      (typeof gasLimit === "undefined" || gasLimit < 21000n)
    ) {
      transactionRequest.gasLimit = estimatedGasLimit
    }

    return { transactionRequest, gasEstimationError }
  }

  /**
   * Populates the provided partial EIP1559 transaction request with all fields
   * except the nonce. This leaves the transaction ready for user review, and
   * the nonce ready to be filled in immediately prior to signing to minimize the
   * likelihood for nonce reuse.
   *
   * Note that if the partial request already has a defined nonce, it is not
   * cleared.
   */
  private async populatePartialEIP1559TransactionRequest(
    network: EVMNetwork,
    partialRequest: EnrichedEIP1559TransactionSignatureRequest,
  ): Promise<{
    transactionRequest: EnrichedEIP1559TransactionRequest
    gasEstimationError: string | undefined
  }> {
    const {
      from,
      to,
      value,
      gasLimit,
      input,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
      annotation,
      broadcastOnSign,
    } = partialRequest

    // Basic transaction construction based on the provided options, with extra data from the chain service
    const transactionRequest: EnrichedEIP1559TransactionRequest = {
      from,
      to,
      value: value ?? 0n,
      gasLimit: gasLimit ?? 0n,
      maxFeePerGas: maxFeePerGas ?? 0n,
      maxPriorityFeePerGas: maxPriorityFeePerGas ?? 0n,
      input: input ?? null,
      type: 2 as const,
      network,
      chainID: network.chainID,
      nonce,
      annotation,
      broadcastOnSign,
    }

    // Always estimate gas to decide whether the transaction will likely fail.
    let estimatedGasLimit: bigint | undefined
    let gasEstimationError: string | undefined
    try {
      estimatedGasLimit = await this.estimateGasLimit(
        network,
        transactionRequest,
      )
    } catch (error) {
      // Try to identify unpredictable gas errors to bubble that information
      // out.
      if (error instanceof Error) {
        // Ethers does some heavily loose typing around errors to carry
        // arbitrary info without subclassing Error, so an any cast is needed.
        // oxlint-disable-next-line typescript/no-explicit-any
        const anyError: any = error

        if (
          "code" in anyError &&
          anyError.code === Logger.errors.UNPREDICTABLE_GAS_LIMIT
        ) {
          // anyError.error can be an object with properties like code, body, etc.
          // We need to convert it to a displayable string
          const innerError = anyError.error
          if (typeof innerError === "string") {
            gasEstimationError = innerError
          } else if (innerError && typeof innerError === "object") {
            gasEstimationError =
              innerError.message ??
              innerError.reason ??
              JSON.stringify(innerError, null, 2)
          } else {
            gasEstimationError = "Unknown transaction error."
          }
        }
      }
    }

    // We use the estimate as the actual limit only if user did not specify the
    // gas explicitly or if it was set below the minimum network-allowed value.
    if (
      typeof estimatedGasLimit !== "undefined" &&
      (typeof partialRequest.gasLimit === "undefined" ||
        partialRequest.gasLimit < 21000n)
    ) {
      transactionRequest.gasLimit = estimatedGasLimit
    }

    return { transactionRequest, gasEstimationError }
  }

  async populateRequest(
    network: EVMNetwork,
    partialRequest: EnrichedEVMTransactionSignatureRequest,
    defaults: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint },
  ): Promise<{
    transactionRequest: EnrichedEVMTransactionRequest
    gasEstimationError: string | undefined
  }> {
    if (EIP_1559_COMPLIANT_CHAIN_IDS.has(network.chainID)) {
      const {
        maxFeePerGas = defaults.maxFeePerGas,
        maxPriorityFeePerGas = defaults.maxPriorityFeePerGas,
      } = partialRequest as EnrichedEIP1559TransactionSignatureRequest

      const populated = await this.populatePartialEIP1559TransactionRequest(
        network,
        {
          ...(partialRequest as EnrichedEIP1559TransactionSignatureRequest),
          maxFeePerGas,
          maxPriorityFeePerGas,
        },
      )
      return populated
    }
    // Legacy Transaction
    const populated = await this.populatePartialLegacyEVMTransactionRequest(
      network,
      {
        ...(partialRequest as EnrichedLegacyTransactionRequest),
      },
    )
    return populated
  }

  /**
   * Estimate the gas needed to make a transaction. Adds 10% as a safety net to
   * the base estimate returned by the provider.
   */
  async estimateGasLimit(
    network: EVMNetwork,
    transactionRequest: TransactionRequest,
  ): Promise<bigint> {
    if (isEnabled(FeatureFlags.USE_MAINNET_FORK)) {
      return 350000n
    }
    const estimate = await this.dependencies
      .providerFor(network)
      .estimateGas(ethersTransactionFromTransactionRequest(transactionRequest))

    // Add 10% more gas as a safety net
    const uppedEstimate = estimate.add(estimate.div(10))
    return BigInt(uppedEstimate.toString())
  }

  async estimateL1RollupGasPrice(network: EVMNetwork): Promise<bigint> {
    if (network.chainID === OPTIMISM.chainID) {
      // Using the L1 gas cost is not a completely accurate representation of
      // what the rollup fee will be - but is close enough outside of periods of extreme
      // volatility.  More reading here:
      // https://help.optimism.io/hc/en-us/articles/4416677738907-What-happens-if-the-L1-gas-price-spikes-while-a-transaction-is-in-process
      return this.estimateGasPrice(ETHEREUM)
    }
    throw new Error(`Cannot estimate rollup gas for ${network.name}`)
  }

  async estimateL1RollupFeeForOptimism(
    network: EVMNetwork,
    transaction: UnsignedTransaction | EnrichedEVMTransactionRequest,
  ): Promise<bigint> {
    // Optimism-specific implementation
    // https://community.optimism.io/docs/developers/build/transaction-fees/#displaying-fees-to-users
    const unsignedRLPEncodedTransaction = utils.serializeTransaction({
      to: transaction.to,
      nonce: transaction.nonce,
      gasLimit: transaction.gasLimit,
      gasPrice: "gasPrice" in transaction ? transaction.gasPrice : undefined,
      data: "data" in transaction ? transaction.data : undefined,
      value: "value" in transaction ? transaction.value : undefined,
    })

    const provider = await this.dependencies.providerFor(network)

    const GasOracle = new ethers.Contract(
      OPTIMISM_GAS_ORACLE_ADDRESS,
      OPTIMISM_GAS_ORACLE_ABI,
      provider,
    )

    const l1Fee = await GasOracle.getL1Fee(unsignedRLPEncodedTransaction)

    return BigInt(l1Fee.toString())
  }

  /**
   * Estimate the gas needed to make a transaction. Adds 10% as a safety net to
   * the base estimate returned by the provider.
   */
  private async estimateGasPrice(network: EVMNetwork): Promise<bigint> {
    const estimate = await this.dependencies.providerFor(network).getGasPrice()

    // Add 10% more gas as a safety net
    return (estimate.toBigInt() * 11n) / 10n
  }

  /**
   * Broadcast a signed EVM transaction.
   *
   * @param transaction A signed EVM transaction to broadcast. Since the tx is signed,
   *        it needs to include all gas limit and price params.
   */
  async broadcastSigned(transaction: SignedTransaction): Promise<void> {
    try {
      const serialized = utils.serializeTransaction(
        ethersTransactionFromSignedTransaction(transaction),
        { r: transaction.r, s: transaction.s, v: transaction.v },
      )

      await Promise.all([
        this.dependencies
          .providerFor(transaction.network)
          .sendTransaction(serialized)
          .then((transactionResponse) => {
            this.dependencies.onSent(transactionResponse.hash)
          })
          .catch((error) => {
            logger.debug(
              "Broadcast error caught, saving failed status and releasing nonce...",
              transaction,
              error,
            )
            // Failure to broadcast needs to be registered.
            this.dependencies.transactionTracker
              .save(
                { ...transaction, status: 0, error: error.toString() },
                "local",
              )
              .catch((saveError) =>
                logger.error("Error saving a failed broadcast", saveError),
              )
            // the reject here will release the nonce in the following catch
            return Promise.reject(error)
          }),
        this.dependencies.transactionTracker.watchForReceipt(
          transaction.network,
          transaction,
        ),
        this.dependencies.transactionTracker.save(transaction, "local"),
      ])
    } catch (error) {
      this.dependencies.nonceAllocator.releaseNonce(transaction)
      this.dependencies.onSendFailed()
      logger.error("Error broadcasting transaction", transaction, error)

      throw error
    }
  }
}
