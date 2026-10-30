import { TransactionResponse } from "@ethersproject/providers"
import { ethers, utils } from "ethers"
import { Logger, UnsignedTransaction } from "ethers/lib/utils"
import logger from "../../lib/logger"
import type { HexString, NormalizedEVMAddress, UNIXTime } from "../../types"
import type { AccountBalance, AddressOnNetwork } from "../../accounts"
import {
  AnyEVMBlock,
  AnyEVMTransaction,
  EVMNetwork,
  BlockPrices,
  TransactionRequest,
  TransactionRequestWithNonce,
  SignedTransaction,
  NetworkBaseAsset,
  RpcEndpoint,
  sameChainID,
  sameNetwork,
} from "../../networks"
import {
  AnyAssetAmount,
  AssetTransfer,
  SmartContractFungibleAsset,
} from "../../assets"
import {
  HOUR,
  ETHEREUM,
  OPTIMISM,
  NETWORK_BY_CHAIN_ID,
  MINUTE,
  EIP_1559_COMPLIANT_CHAIN_IDS,
  ARBITRUM_ONE,
} from "../../constants"
import { FeatureFlags, isEnabled } from "../../features"
import PreferenceService from "../preferences"
import type { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { createDB, ChainDatabase, Transaction } from "./db"
import BaseService from "../base"
import {
  blockFromEthersBlock,
  ethersTransactionFromSignedTransaction,
  ethersTransactionFromTransactionRequest,
  unsignedTransactionFromEVMTransaction,
} from "./utils"
import {
  isProbablyEVMAddress,
  normalizeEVMAddress,
  sameEVMAddress,
} from "../../lib/utils"
import type {
  EnrichedEIP1559TransactionRequest,
  EnrichedEIP1559TransactionSignatureRequest,
  EnrichedEVMTransactionRequest,
  EnrichedEVMTransactionSignatureRequest,
  EnrichedLegacyTransactionRequest,
  EnrichedLegacyTransactionSignatureRequest,
} from "../enrichment"
import SerialFallbackProvider, {
  createProviderForChain,
  EndpointConfig,
} from "./serial-fallback-provider"
import {
  endpointConfigsForChain,
  providerEnvironmentFor,
} from "./rpc/endpoint-configs"
import { NetworkReachabilityState } from "./network-reachability"
import AssetDataHelper from "./asset-data-helper"
import {
  OPTIMISM_GAS_ORACLE_ABI,
  OPTIMISM_GAS_ORACLE_ADDRESS,
} from "./utils/optimismGasPriceOracle"
import InternalSignerService, { SignerImportSource } from "../internal-signer"
import type { ValidatedAddEthereumChainParameter } from "../provider-bridge/utils"
import { ISLAND_NETWORK } from "../island/contracts"
import ProviderRegistry from "./provider-registry"
import NonceAllocator from "./nonce-allocator"
import NetworkSettings, { NetworkMetadata } from "./network-settings"
import AssetTransferScanner from "./asset-transfer-scanner"
import NetworkWatcher from "./network-watcher"
import TransactionTracker, {
  PriorityQueuedTxToRetrieve,
  QueuedTxToRetrieve,
} from "./transaction-tracker"

interface Events extends ServiceLifecycleEvents {
  initializeActivities: {
    transactions: Transaction[]
    accounts: AddressOnNetwork[]
  }
  initializeActivitiesForAccount: {
    transactions: Transaction[]
    account: AddressOnNetwork
  }
  newAccountToTrack: AddressOnNetwork
  supportedNetworks: EVMNetwork[]
  accountsWithBalances: {
    /**
     * Retrieved balance for the network's base asset
     */
    balances: AccountBalance[]
    /**
     * The respective address and network for this balance update
     */
    addressOnNetwork: AddressOnNetwork
  }
  transactionSend: HexString
  networkSubscribed: EVMNetwork
  transactionSendFailure: undefined
  assetTransfers: {
    addressNetwork: AddressOnNetwork
    assetTransfers: AssetTransfer[]
  }
  block: AnyEVMBlock
  transaction: { forAccounts: string[]; transaction: AnyEVMTransaction }
  blockPrices: { blockPrices: BlockPrices; network: EVMNetwork }
  customChainAdded: ValidatedAddEthereumChainParameter
  /**
   * Whether a chain's configured RPC endpoints can be reached at all. Emitted
   * only when the verdict changes, so a chain that has been dark for an hour
   * reports once rather than once per failed call.
   */
  networkReachability: {
    chainID: string
    status: NetworkReachabilityState
  }
}

export type { PriorityQueuedTxToRetrieve, QueuedTxToRetrieve }

/**
 * ChainService is responsible for basic network monitoring and interaction.
 * Other services rely on the chain service rather than polling networks
 * themselves.
 *
 * The service should provide
 * * Basic cached network information, like the latest block hash and height
 * * Cached account balances, account history, and transaction data
 * * Gas estimation and transaction broadcasting
 * * Event subscriptions, including events whenever
 *   * A new transaction relevant to accounts tracked is found or first
 *     confirmed
 *   * A historic account transaction is pulled and cached
 *   * Any asset transfers found for newly tracked accounts
 *   * A relevant account balance changes
 *   * New blocks
 * * ... and finally, polling and websocket providers for supported networks, in
 *   case a service needs to interact with a network directly.
 */
export default class ChainService extends BaseService<Events> {
  private providerRegistry: ProviderRegistry

  private networkSettings: NetworkSettings

  /**
   * @deprecated Use {@link providerForNetwork}; providers are owned by the
   * provider registry.
   */
  get providers(): { evm: { [chainID: string]: SerialFallbackProvider } } {
    return { evm: this.providerRegistry.providersByChainID() }
  }

  private networkWatcher: NetworkWatcher

  /** The watched networks, as they are now. */
  private get watchedNetworks(): EVMNetwork[] {
    return this.networkWatcher.watchedChainIDs().flatMap((chainID) => {
      const network = this.networkSettings.networkFor(chainID)
      return network === undefined ? [] : [network]
    })
  }

  /** @deprecated Subscriptions are kept by chain, not by provider. */
  get subscribedNetworks(): {
    network: EVMNetwork
    provider: SerialFallbackProvider | undefined
  }[] {
    return this.watchedNetworks.map((network) => ({
      network,
      provider: this.providerForNetwork(network),
    }))
  }

  /** @deprecated Subscriptions are kept by chain, not by provider. */
  get subscribedAccounts(): {
    account: string
    provider: SerialFallbackProvider | undefined
  }[] {
    return this.networkWatcher
      .watchedAccounts()
      .map(({ address, chainID }) => ({
        account: address,
        provider: this.providerRegistry.providerFor(chainID),
      }))
  }

  /** @deprecated Kept for tests; see {@link NetworkWatcher}. */
  private get lastUserActivityOnNetwork(): { [chainID: string]: UNIXTime } {
    return this.networkWatcher.lastActivityOnNetwork
  }

  /** @deprecated Kept for tests; see {@link NetworkWatcher}. */
  private get lastUserActivityOnAddress(): { [address: string]: UNIXTime } {
    return this.networkWatcher.lastActivityOnAddress
  }

  private nonceAllocator = new NonceAllocator((network) =>
    this.providerForNetworkOrThrow(network),
  )

  /** @deprecated Kept for tests; see {@link NonceAllocator}. */
  private get evmChainLastSeenNoncesByNormalizedAddress(): NonceAllocator["highestKnownNonce"] {
    return this.nonceAllocator.highestKnownNonce
  }

  private transactionTracker: TransactionTracker

  private assetTransferScanner: AssetTransferScanner

  /** @deprecated Kept for tests; see {@link TransactionTracker}. */
  private get transactionsToRetrieve(): PriorityQueuedTxToRetrieve[] {
    return this.transactionTracker.transactionsToRetrieve
  }

  static create: ServiceCreatorFunction<
    Events,
    ChainService,
    [Promise<PreferenceService>, Promise<InternalSignerService>]
  > = async (preferenceService, internalSignerService) =>
    new this(createDB(), await preferenceService, await internalSignerService)

  get supportedNetworks(): EVMNetwork[] {
    return this.networkSettings.supportedNetworks()
  }

  /** @deprecated For tests that set the list directly. */
  set supportedNetworks(networks: EVMNetwork[]) {
    this.networkSettings.replaceSupportedNetworks(networks)
  }

  /** Chains being tracked, in the order tracking started. */
  private trackedChainIDs: string[] = []

  private get trackedNetworks(): EVMNetwork[] {
    return this.trackedChainIDs.flatMap((chainID) => {
      const network = this.networkSettings.networkFor(chainID)
      return network === undefined ? [] : [network]
    })
  }

  assetData: AssetDataHelper

  private constructor(
    private db: ChainDatabase,
    private preferenceService: PreferenceService,
    private internalSignerService: InternalSignerService,
  ) {
    super({
      queuedTransactions: {
        schedule: {
          delayInMinutes: 1,
          periodInMinutes: 1,
        },
        handler: () => {
          this.handleQueuedTransactionAlarm()
        },
      },
      historicAssetTransfers: {
        schedule: {
          periodInMinutes: 60,
        },
        handler: () => {
          this.assetTransferScanner.scanHistoricTransfers()
        },
        runAtStart: false,
      },
      recentIncomingAssetTransfers: {
        schedule: {
          periodInMinutes: 1.5,
        },
        handler: () => {
          this.scanRecentTransfers({
            incomingOnly: true,
            activeAccountsOnly: true,
          })
        },
      },
      forceRecentAssetTransfers: {
        schedule: {
          periodInMinutes: (12 * HOUR) / MINUTE,
        },
        handler: () => {
          this.scanRecentTransfers()
        },
      },
      recentAssetTransfers: {
        schedule: {
          periodInMinutes: 15,
        },
        handler: () => {
          this.scanRecentTransfers({ activeAccountsOnly: true })
        },
      },
      blockPrices: {
        runAtStart: false,
        schedule: {
          periodInMinutes: 1,
        },
        // Only wakes the service worker; the network watches poll gas on
        // their own timers.
        handler: () => {},
      },
    })

    this.assetData = new AssetDataHelper(this)

    this.networkWatcher = new NetworkWatcher({
      db,
      networkFor: (chainID) => this.networkSettings.networkFor(chainID),
      providerFor: (network) => this.providerForNetworkOrThrow(network),
      emitBlock: (block) => this.emitter.emit("block", block),
      emitBlockPrices: (update) => this.emitter.emit("blockPrices", update),
      onPendingTransaction: (transaction) =>
        this.handlePendingTransaction(transaction),
    })

    this.transactionTracker = new TransactionTracker({
      db: this.db,
      providerFor: (network) => this.providerForNetworkOrThrow(network),
      existingProviderFor: (network) => this.providerForNetwork(network),
      nonceAllocator: this.nonceAllocator,
      getBlockData: (network, blockHash) =>
        this.getBlockData(network, blockHash),
      emitTransaction: async (transaction) => {
        const forAccounts = (await this.getAccountsToTrack())
          .filter(
            ({ address }) =>
              sameEVMAddress(transaction.from, address) ||
              sameEVMAddress(transaction.to, address),
          )
          .map(({ address }) => normalizeEVMAddress(address))
        this.emitter.emit("transaction", { transaction, forAccounts })
      },
    })

    this.assetTransferScanner = new AssetTransferScanner({
      db,
      assetData: this.assetData,
      getBlockHeight: (network) => this.getBlockHeight(network),
      accountsToTrack: ({ activeAccountsOnly }) =>
        this.getAccountsToTrack(activeAccountsOnly),
      isSupported: (network) =>
        this.networkSettings.networkFor(network.chainID) !== undefined,
      supportsAlchemyMethods: (network) =>
        this.providerForNetwork(network)?.supportsAlchemyMethods ?? false,
      enqueueTransactionLookup: (network, hash, firstSeen, priority) =>
        this.enqueueTransactionLookup(network, hash, firstSeen, priority),
      emitAssetTransfers: (addressNetwork, assetTransfers) =>
        this.emitter.emit("assetTransfers", { addressNetwork, assetTransfers }),
    })

    this.networkSettings = new NetworkSettings(
      db,
      () => this.providerRegistry,
      (networks) => this.emitter.emit("supportedNetworks", networks),
    )

    this.providerRegistry = new ProviderRegistry({
      createProvider: (chainID, rpcEndpoints, onReachabilityChange) =>
        createProviderForChain(
          chainID,
          endpointConfigsForChain(
            providerEnvironmentFor(
              chainID,
              rpcEndpoints,
              this.networkSettings.methodSpecificRpcConfigFor(chainID),
            ),
          ),
          onReachabilityChange,
        ),
      verifyEndpoints: (chainID, rpcEndpoints, signal) =>
        this.networkSettings.verifyNewEndpoints(chainID, rpcEndpoints, signal),
      saveEndpoints: (chainID, rpcEndpoints) =>
        this.db.setRpcEndpoints(chainID, rpcEndpoints),
      removeChain: (chainID) => this.db.removeEVMNetwork(chainID),
      onReachabilityChange: (chainID, status) =>
        this.emitReachability(chainID, status),
    })

    this.providerRegistry.onProviderReplaced(({ chainID }) =>
      this.handleProviderReplaced(chainID),
    )
  }

  override async internalStartService(): Promise<void> {
    await super.internalStartService()

    await this.db.initialize()
    await this.initializeNetworks()
    const allAccounts = await this.getAccountsToTrack()
    const accounts = allAccounts.filter(({ address }) =>
      isProbablyEVMAddress(address),
    )
    const invalidAddresses = accounts.filter(
      ({ address }) => !isProbablyEVMAddress(address),
    )
    logger.warn("Cleaning up invalid tracked addresses", invalidAddresses)
    invalidAddresses.forEach(({ address }) =>
      this.removeAccountToTrack(address),
    )
    const trackedNetworks = await this.getTrackedNetworks()

    const transactions = await this.db.getAllTransactions()

    this.emitter.emit("initializeActivities", { transactions, accounts })

    // get the latest blocks and subscribe for all active networks

    Promise.allSettled(
      accounts
        .flatMap((an) => [
          // subscribe to all account transactions
          this.subscribeToAccountTransactions(an).catch((e) => {
            logger.error(e)
          }),
        ])
        .concat(
          // Schedule any stored unconfirmed transactions for
          // retrieval---either to confirm they no longer exist, or to
          // read/monitor their status.
          trackedNetworks.map((network) =>
            this.db
              .getNetworkPendingTransactions(network)
              .then((pendingTransactions) => {
                pendingTransactions.forEach(
                  ({ hash, firstSeen, missingSince }) => {
                    logger.debug(
                      `Queuing pending transaction ${hash} for status lookup.`,
                    )
                    this.transactionTracker.enqueueLookup(
                      network,
                      hash,
                      firstSeen,
                      0,
                      missingSince,
                    )
                  },
                )
              })
              .catch((e) => {
                logger.error(e)
              }),
          ),
        ),
    )
  }

  async initializeNetworks(): Promise<void> {
    const rpcEndpointConfigs = await this.db.getAllRpcEndpoints()
    await this.networkSettings.loadMethodSpecificEndpoints()

    await this.updateSupportedNetworks()

    this.supportedNetworks.forEach(({ chainID }) => {
      this.lastUserActivityOnNetwork[chainID] = 0
    })

    this.supportedNetworks.forEach(({ chainID }) =>
      this.providerRegistry.start(
        chainID,
        rpcEndpointConfigs.find((config) => config.chainID === chainID)
          ?.endpoints ?? [],
      ),
    )
  }

  /**
   * Finds a provider for the given network, or returns undefined if no such
   * provider exists.
   */
  providerForNetwork(network: EVMNetwork): SerialFallbackProvider | undefined {
    return this.providerRegistry.providerFor(
      isEnabled(FeatureFlags.USE_MAINNET_FORK)
        ? ETHEREUM.chainID
        : network.chainID,
    )
  }

  /** Sets the endpoints that serve only certain methods on a chain. */
  async setMethodSpecificEndpoints(
    chainID: string,
    rpcUrl: string,
    config: EndpointConfig,
  ): Promise<void> {
    await this.networkSettings.setMethodSpecificEndpoints(
      chainID,
      rpcUrl,
      config,
    )
  }

  async clearMethodSpecificEndpoints(chainID: string): Promise<void> {
    await this.networkSettings.clearMethodSpecificEndpoints(chainID)
  }

  /** @deprecated Use {@link setMethodSpecificEndpoints}. */
  async addCustomProvider(
    chainID: string,
    rpcUrl: string,
    config: EndpointConfig,
  ): Promise<void> {
    await this.setMethodSpecificEndpoints(chainID, rpcUrl, config)
  }

  /** @deprecated Use {@link clearMethodSpecificEndpoints}. */
  async removeCustomProvider(chainID: string): Promise<void> {
    await this.clearMethodSpecificEndpoints(chainID)
  }

  /**
   * Pulls the list of tracked networks from memory or indexedDB.
   * Defaults to ethereum in the case that neither exist.
   */
  async getTrackedNetworks(): Promise<EVMNetwork[]> {
    if (this.trackedChainIDs.length > 0) {
      return this.trackedNetworks
    }

    // Since trackedNetworks will be an empty array at extension load (or reload time)
    // we need a durable way to track which networks an extension is tracking.
    // The below code should only be called once per extension reload for extensions
    // with active accounts
    const networksToTrack = await this.getNetworksToTrack()

    await Promise.allSettled(
      networksToTrack.map(async (network) =>
        this.startTrackingNetworkOrThrow(network.chainID),
      ),
    )

    return this.trackedNetworks
  }

  private subscribeToNetworkEvents(network: EVMNetwork): void {
    this.networkWatcher.watchNetwork(network.chainID)
    this.emitter.emit("networkSubscribed", network)
  }

  /**
   * Adds a supported network to list of active networks.
   */
  async startTrackingNetworkOrThrow(chainID: string): Promise<EVMNetwork> {
    const trackedNetwork = this.trackedNetworks.find((network) =>
      sameChainID(network.chainID, chainID),
    )

    if (trackedNetwork) {
      logger.warn(
        `${trackedNetwork.name} already being tracked - no need to activate it`,
      )
      return trackedNetwork
    }

    const networkToTrack = this.networkSettings.networkFor(chainID)

    if (!networkToTrack) {
      throw new Error(`Network with chainID ${chainID} is not supported`)
    }

    this.trackedChainIDs.push(networkToTrack.chainID)

    if (!this.networkWatcher.isWatching(networkToTrack.chainID)) {
      this.subscribeToNetworkEvents(networkToTrack)
      const addressesToTrack = new Set(
        (await this.getAccountsToTrack()).map((account) => account.address),
      )
      addressesToTrack.forEach((address) => {
        this.addAccountToTrack({
          address,
          network: networkToTrack,
        })
      })
    }

    return networkToTrack
  }

  /**
   * Finds a provider for the given network, or returns undefined if no such
   * provider exists.
   */
  providerForNetworkOrThrow(network: EVMNetwork): SerialFallbackProvider {
    const provider = this.providerForNetwork(network)

    if (!provider) {
      logger.error(
        "Request received for operation on an inactive network",
        network,
        "expected",
        this.trackedNetworks,
      )
      throw new Error(
        `Unexpected network ${network.name}, id: ${network.chainID}`,
      )
    }
    return provider
  }

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

  async populatePartialTransactionRequest(
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
   * Populates the nonce for the passed EIP1559TransactionRequest, provided
   * that it is not yet populated. This process generates a new nonce based on
   * the known on-chain nonce state of the service, attempting to ensure that
   * the nonce will be unique and an increase by 1 over any other confirmed or
   * pending nonces in the mempool.
   *
   * Returns the transaction request with a guaranteed-defined nonce, suitable
   * for signing by a signer.
   */
  async populateEVMTransactionNonce(
    transactionRequest: TransactionRequest,
  ): Promise<TransactionRequestWithNonce> {
    return this.nonceAllocator.allocateNonce(transactionRequest)
  }

  /**
   * Releases the specified nonce for the given network and address. This
   * updates internal service state to allow that nonce to be reused. In cases
   * where multiple nonces were seen in a row, this will make internally
   * available for reuse all intervening nonces.
   */
  releaseEVMTransactionNonce(
    transactionRequest:
      | TransactionRequestWithNonce
      | SignedTransaction
      | AnyEVMTransaction,
  ): void {
    this.nonceAllocator.releaseNonce(transactionRequest)
  }

  async getAccountsToTrack(
    onlyActiveAccounts = false,
  ): Promise<AddressOnNetwork[]> {
    const accounts = await this.db.getAccountsToTrack()
    if (onlyActiveAccounts) {
      return accounts.filter(
        ({ address, network }) =>
          this.networkWatcher.isAddressActive(address) &&
          this.networkWatcher.isNetworkActive(network.chainID),
      )
    }
    return accounts
  }

  async getTrackedAddressesOnNetwork(
    network: EVMNetwork,
  ): Promise<AddressOnNetwork[]> {
    return this.db.getTrackedAddressesOnNetwork(network)
  }

  async getNetworksToTrack(): Promise<EVMNetwork[]> {
    const chainIDs = await this.db.getChainIDsToTrack()
    if (chainIDs.size === 0) {
      // Ethereum - default to tracking Ethereum so ENS resolution works during onboarding
      // Arbitrum Sepolia - default to tracking so we can support Island Dapp
      if (isEnabled(FeatureFlags.SUPPORT_THE_ISLAND)) {
        return [ETHEREUM, ISLAND_NETWORK]
      }

      return [ETHEREUM]
    }

    if (isEnabled(FeatureFlags.SUPPORT_THE_ISLAND)) {
      chainIDs.add(ISLAND_NETWORK.chainID)
    }

    const networks = await Promise.all(
      [...chainIDs].map(async (chainID) => {
        const network = NETWORK_BY_CHAIN_ID[chainID]
        if (!network) {
          return this.db.getEVMNetworkByChainID(chainID)
        }
        return network
      }),
    )

    return networks.filter((network): network is EVMNetwork => !!network)
  }

  async removeAccountToTrack(address: string): Promise<void> {
    await this.db.removeAccountToTrack(address)
  }

  async getLatestBaseAccountBalance({
    address,
    network,
  }: AddressOnNetwork): Promise<AccountBalance> {
    const normalizedAddress = normalizeEVMAddress(address)

    const provider = this.providerForNetworkOrThrow(network)
    const balance = await provider.getBalance(normalizedAddress)

    const trackedAccounts = await this.getAccountsToTrack()
    const allTrackedAddresses = new Set(
      trackedAccounts.map((account) => account.address),
    )

    const accountBalance: AccountBalance = {
      address: normalizedAddress,
      network,
      assetAmount: {
        // Data stored in chain db for network base asset might be stale
        asset: await this.db.getBaseAssetForNetwork(network.chainID),
        amount: balance.toBigInt(),
      },
      dataSource: provider.supportsBoar ? "boar" : "generic-rpc",
      retrievedAt: Date.now(),
    }

    // Don't emit or save if the account isn't tracked
    if (allTrackedAddresses.has(normalizedAddress)) {
      this.emitter.emit("accountsWithBalances", {
        balances: [accountBalance],
        addressOnNetwork: {
          address: normalizedAddress,
          network,
        },
      })

      await this.db.addBalance(accountBalance)
    }

    return accountBalance
  }

  async addAccountToTrack(addressNetwork: AddressOnNetwork): Promise<void> {
    if (!isProbablyEVMAddress(addressNetwork.address)) {
      logger.warn("Refusing to track invalid address", addressNetwork)
      return
    }

    const source = this.internalSignerService.getSignerSourceForAddress(
      addressNetwork.address,
    )
    const isAccountOnNetworkAlreadyTracked =
      await this.db.getTrackedAccountOnNetwork(addressNetwork)
    if (!isAccountOnNetworkAlreadyTracked) {
      // Skip save, emit and savedTransaction emission on resubmission
      await this.db.addAccountToTrack(addressNetwork)
      this.emitter.emit("newAccountToTrack", addressNetwork)
    }
    this.emitSavedTransactions(addressNetwork)
    this.subscribeToAccountTransactions(addressNetwork).catch((e) => {
      logger.error(
        "chainService/addAccountToTrack: Error subscribing to account transactions for",
        {
          address: addressNetwork.address,
          chainID: addressNetwork.network.chainID,
        },
        e,
      )
    })
    if (source !== SignerImportSource.internal) {
      this.assetTransferScanner
        .scanHistoricTransfersFor(addressNetwork)
        .catch((e) => {
          logger.error(
            "chainService/addAccountToTrack: Error loading historic asset transfers for",
            {
              address: addressNetwork.address,
              chainID: addressNetwork.network.chainID,
            },
            e,
          )
        })
    }
  }

  async getBlockHeight(network: EVMNetwork): Promise<number> {
    const cachedBlock = await this.db.getLatestBlock(network)
    if (cachedBlock) {
      return cachedBlock.blockHeight
    }
    return this.providerForNetworkOrThrow(network).getBlockNumber()
  }

  /**
   * Return cached information on a block if it's in the local DB.
   *
   * Otherwise, retrieve the block from the specified network, caching and
   * returning the object.
   *
   * @param network the EVM network we're interested in
   * @param blockHash the hash of the block we're interested in
   */
  async getBlockData(
    network: EVMNetwork,
    blockHash: string,
  ): Promise<AnyEVMBlock> {
    const cachedBlock = await this.db.getBlock(network, blockHash)
    if (cachedBlock) {
      return cachedBlock
    }

    // Looking for new block
    const resultBlock =
      await this.providerForNetworkOrThrow(network).getBlock(blockHash)

    const block = blockFromEthersBlock(network, resultBlock)

    await this.db.addBlock(block)
    this.emitter.emit("block", block)
    return block
  }

  /**
   * A transaction from the local database if it's there, and otherwise from
   * the chain, saved and followed until it confirms.
   */
  async getTransaction(
    network: EVMNetwork,
    txHash: HexString,
  ): Promise<AnyEVMTransaction> {
    return this.transactionTracker.getTransaction(network, txHash)
  }

  /**
   * Queues a transaction lookup, which runs on a timer. Lookups that keep
   * failing are given up on a while after `firstSeen`.
   */
  enqueueTransactionLookup(
    network: EVMNetwork,
    txHash: HexString,
    firstSeen: UNIXTime,
    priority = 0,
  ): void {
    this.transactionTracker.enqueueLookup(network, txHash, firstSeen, priority)
  }

  isTransactionLookupQueued(network: EVMNetwork, txHash: HexString): boolean {
    return this.transactionTracker.isLookupQueued(network, txHash)
  }

  dequeueTransactionLookup(network: EVMNetwork, txHash: HexString): void {
    this.transactionTracker.dequeueLookup(network, txHash)
  }

  /** @deprecated Use {@link enqueueTransactionLookup}. */
  queueTransactionHashToRetrieve(
    network: EVMNetwork,
    txHash: HexString,
    firstSeen: UNIXTime,
    priority = 0,
  ): void {
    this.enqueueTransactionLookup(network, txHash, firstSeen, priority)
  }

  /** @deprecated Use {@link isTransactionLookupQueued}. */
  isTransactionHashQueued(txNetwork: EVMNetwork, txHash: HexString): boolean {
    return this.isTransactionLookupQueued(txNetwork, txHash)
  }

  /** @deprecated Use {@link dequeueTransactionLookup}. */
  removeTransactionHashFromQueue(network: EVMNetwork, txHash: HexString): void {
    this.dequeueTransactionLookup(network, txHash)
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
    const estimate = await this.providerForNetworkOrThrow(network).estimateGas(
      ethersTransactionFromTransactionRequest(transactionRequest),
    )

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

    const provider = await this.providerForNetworkOrThrow(network)

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
    const estimate = await this.providerForNetworkOrThrow(network).getGasPrice()

    // Add 10% more gas as a safety net
    return (estimate.toBigInt() * 11n) / 10n
  }

  /**
   * Broadcast a signed EVM transaction.
   *
   * @param transaction A signed EVM transaction to broadcast. Since the tx is signed,
   *        it needs to include all gas limit and price params.
   */
  async broadcastSignedTransaction(
    transaction: SignedTransaction,
  ): Promise<void> {
    try {
      const serialized = utils.serializeTransaction(
        ethersTransactionFromSignedTransaction(transaction),
        { r: transaction.r, s: transaction.s, v: transaction.v },
      )

      await Promise.all([
        this.providerForNetworkOrThrow(transaction.network)
          .sendTransaction(serialized)
          .then((transactionResponse) => {
            this.emitter.emit("transactionSend", transactionResponse.hash)
          })
          .catch((error) => {
            logger.debug(
              "Broadcast error caught, saving failed status and releasing nonce...",
              transaction,
              error,
            )
            // Failure to broadcast needs to be registered.
            this.transactionTracker
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
        this.transactionTracker.watchForReceipt(
          transaction.network,
          transaction,
        ),
        this.transactionTracker.save(transaction, "local"),
      ])
    } catch (error) {
      this.releaseEVMTransactionNonce(transaction)
      this.emitter.emit("transactionSendFailure")
      logger.error("Error broadcasting transaction", transaction, error)

      throw error
    }
  }

  async markAccountActivity({
    address,
    network,
  }: AddressOnNetwork): Promise<void> {
    // If we find ourselves having untracked this account for some reason and
    // there's activity on it, track it.
    if (
      !(await this.getAccountsToTrack()).some(
        (account) =>
          sameEVMAddress(account.address, address) &&
          sameNetwork(account.network, network),
      )
    ) {
      await this.addAccountToTrack({ address, network })
    }

    const addressWasIdle = this.isAddressIdle(address)
    const networkWasIdle = this.isNetworkIdle(network.chainID)
    this.markNetworkActivity(network.chainID)
    this.networkWatcher.markAddressActivity(address)
    if (addressWasIdle || networkWasIdle) {
      // Reactivating a potentially deactivated address
      this.loadRecentAssetTransfers({ address, network })
      this.getLatestBaseAccountBalance({ address, network })
    }
  }

  async markNetworkActivity(chainID: string): Promise<void> {
    this.networkWatcher.markNetworkActivity(chainID)
  }

  isAddressIdle(address: string): boolean {
    return this.networkWatcher.isAddressIdle(address)
  }

  isNetworkIdle(chainID: string): boolean {
    return this.networkWatcher.isNetworkIdle(chainID)
  }

  /** @deprecated Use {@link isAddressIdle}. */
  addressIsInactive(address: string): boolean {
    return this.isAddressIdle(address)
  }

  /** @deprecated Use {@link isNetworkIdle}. */
  networkIsInactive(chainID: string): boolean {
    return this.isNetworkIdle(chainID)
  }

  /**
   * Polls gas prices once on every watched network in use.
   *
   * @deprecated Each network's watch polls on its own timer.
   */
  async pollBlockPrices(): Promise<void> {
    await Promise.allSettled(
      this.networkWatcher
        .watchedChainIDs()
        .map((chainID) => this.pollBlockPricesForNetwork(chainID)),
    )
  }

  /** Polls a watched network's gas prices, if it's in use. */
  async pollBlockPricesForNetwork(chainID: string): Promise<void> {
    await this.networkWatcher.pollGasPrices(chainID)
  }

  async send(
    method: string,
    params: unknown[],
    network: EVMNetwork,
  ): Promise<unknown> {
    return this.providerForNetworkOrThrow(network).send(method, params)
  }

  /**
   * Looks a transaction up on chain; `null` if no endpoint knows it.
   *
   * @deprecated It no longer cancels anything; a transaction is dropped only
   * once it has been missing for the grace period.
   */
  async getOrCancelTransaction(
    network: EVMNetwork,
    hash: string,
  ): Promise<TransactionResponse | null | undefined> {
    return this.providerForNetworkOrThrow(network).getTransaction(hash)
  }

  /* *****************
   * PRIVATE METHODS *
   * **************** */

  /** Scans recent blocks for transfers; see {@link AssetTransferScanner}. */
  private async scanRecentTransfers(
    options: { incomingOnly?: boolean; activeAccountsOnly?: boolean } = {},
  ): Promise<void> {
    await this.assetTransferScanner.scanRecentTransfers(options)
  }

  private async loadRecentAssetTransfers(
    addressNetwork: AddressOnNetwork,
  ): Promise<void> {
    await this.assetTransferScanner.scanRecentTransfersFor(addressNetwork)
  }

  private async handleQueuedTransactionAlarm(): Promise<void> {
    this.transactionTracker.startLookups()
  }

  async emitSavedTransactions(account: AddressOnNetwork): Promise<void> {
    const { address, network } = account
    const transactionsForNetwork =
      await this.db.getTransactionsForNetwork(network)

    const transactions = transactionsForNetwork.filter(
      (transaction) =>
        sameEVMAddress(transaction.from, address) ||
        sameEVMAddress(transaction.to, address),
    )

    this.emitter.emit("initializeActivitiesForAccount", {
      transactions,
      account,
    })
  }

  /**
   * Given a list of AddressOnNetwork objects, return only the ones that
   * are currently being tracked.
   */
  async filterTrackedAddressesOnNetworks(
    addressesOnNetworks: AddressOnNetwork[],
  ): Promise<AddressOnNetwork[]> {
    const accounts = await this.getAccountsToTrack()

    return addressesOnNetworks.filter(({ address, network }) =>
      accounts.some(
        ({ address: trackedAddress, network: trackedNetwork }) =>
          sameEVMAddress(trackedAddress, address) &&
          network.name === trackedNetwork.name,
      ),
    )
  }

  private async subscribeToAccountTransactions(
    addressNetwork: AddressOnNetwork,
  ): Promise<void> {
    await this.networkWatcher.watchAccount(addressNetwork)
  }

  private handleProviderReplaced(chainID: string): void {
    this.networkWatcher.providerReplaced(chainID)
  }

  private async handlePendingTransaction(
    transaction: AnyEVMTransaction,
  ): Promise<void> {
    await this.transactionTracker.handlePendingTransaction(transaction)
  }

  async getNetworkBaseAssets(): Promise<NetworkBaseAsset[]> {
    return this.db.getAllBaseAssets()
  }

  // Used to add non-default chains via wallet_addEthereumChain
  async addCustomChain(
    chainInfo: ValidatedAddEthereumChainParameter,
  ): Promise<EVMNetwork> {
    const network = await this.networkSettings.addCustomChain(chainInfo)

    await this.startTrackingNetworkOrThrow(chainInfo.chainId)

    this.emitter.emit("customChainAdded", chainInfo)
    return network
  }

  /**
   * Replaces the stored RPC endpoint list for any known network — built-in
   * or custom — and swaps in a provider that uses it. Only endpoints that
   * aren't already stored are checked.
   */
  async setRpcEndpointsForChain(
    chainID: string,
    rpcEndpoints: RpcEndpoint[],
  ): Promise<void> {
    await this.networkSettings.setRpcEndpoints(chainID, rpcEndpoints)
  }

  async getRpcEndpointsForChain(chainID: string): Promise<RpcEndpoint[]> {
    return this.networkSettings.rpcEndpointsFor(chainID)
  }

  /** See {@link NetworkSettings.updateSettings}. */
  async updateNetworkSettings(
    chainID: string,
    rpcEndpoints: RpcEndpoint[],
    blockExplorerUrl: string,
    metadata?: NetworkMetadata,
  ): Promise<EVMNetwork> {
    return this.networkSettings.updateSettings(chainID, {
      rpcEndpoints,
      blockExplorerUrl,
      metadata,
    })
  }

  /** See {@link NetworkSettings.rpcConfigFor}. */
  async getRpcConfigForChain(chainID: string): Promise<{
    rpcEndpoints: RpcEndpoint[]
    managedRpcEndpoints: RpcEndpoint[]
  }> {
    return this.networkSettings.rpcConfigFor(chainID)
  }

  /**
   * Announces a chain's reachability. Deduplication is the provider's job —
   * its tracker only reports transitions — but a provider replacement reports
   * unconditionally, since the tracker it is replacing took its state with it.
   */
  private emitReachability(
    chainID: string,
    status: NetworkReachabilityState,
  ): void {
    this.networkWatcher.reachabilityChanged(chainID, status)
    this.emitter.emit("networkReachability", { chainID, status })
  }

  async removeCustomChain(chainID: string): Promise<void> {
    this.trackedChainIDs = this.trackedChainIDs.filter(
      (tracked) => !sameChainID(tracked, chainID),
    )
    this.networkWatcher.stopWatchingNetwork(chainID)

    await this.networkSettings.removeCustomChain(chainID)
  }

  async updateSupportedNetworks(): Promise<void> {
    await this.networkSettings.refreshSupportedNetworks()
  }

  async queryAccountTokenDetails(
    contractAddress: NormalizedEVMAddress,
    addressOnNetwork: AddressOnNetwork,
    existingAsset?: SmartContractFungibleAsset,
  ): Promise<AnyAssetAmount<SmartContractFungibleAsset>> {
    const { network } = addressOnNetwork

    const balance = await this.assetData.getTokenBalance(
      addressOnNetwork,
      contractAddress,
    )

    if (existingAsset) {
      return {
        asset: existingAsset,
        amount: balance.amount,
      }
    }

    const asset = await this.assetData
      .getTokenMetadata({
        contractAddress,
        homeNetwork: network,
      })
      .catch(() => undefined)

    if (!asset) {
      throw logger.buildError(
        "Unable to retrieve metadata for custom asset",
        contractAddress,
        "on chain:",
        network.chainID,
      )
    }

    return {
      asset,
      amount: balance.amount,
    }
  }
}
