import {
  AlchemyProvider,
  AlchemyWebSocketProvider,
  TransactionReceipt,
  WebSocketProvider,
} from "@ethersproject/providers"
import { Provider } from "@ethersproject/abstract-provider"
import { getNetwork } from "@ethersproject/networks"
import { utils } from "ethers"
import logger from "../../lib/logger"
import getBlockPrices from "../../lib/gas"
import { HexString } from "../../types"
import { AccountBalance, AddressNetwork } from "../../accounts"
import {
  AnyEVMBlock,
  AnyEVMTransaction,
  EIP1559TransactionRequest,
  EVMNetwork,
  isEVMNetwork,
  Network,
  SignedEVMTransaction,
  BlockPrices,
} from "../../networks"
import { AssetTransfer } from "../../assets"
import {
  getAssetTransfers,
  transactionFromAlchemyWebsocketTransaction,
} from "../../lib/alchemy"
import { ETH } from "../../constants/currencies"
import { ETHEREUM, KOVAN } from "../../constants/networks"
import PreferenceService from "../preferences"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { getOrCreateDB, ChainDatabase } from "./db"
import BaseService from "../base"
import {
  blockFromEthersBlock,
  blockFromWebsocketBlock,
  enrichTransactionWithReceipt,
  ethersTransactionRequestFromEIP1559TransactionRequest,
  ethersTransactionFromSignedTransaction,
  transactionFromEthersTransaction,
} from "./utils"

// We can't use destructuring because webpack has to replace all instances of
// `process.env` variables in the bundled output
const ALCHEMY_KEY = process.env.ALCHEMY_KEY // eslint-disable-line prefer-destructuring

// How many queued transactions should be retrieved on every tx alarm, per
// network. To get frequency, divide by the alarm period. 5 tx / 5 minutes →
// max 1 tx/min.
const TRANSACTIONS_RETRIEVED_PER_ALARM = 5

// The number of blocks to query at a time for historic asset transfers.
// Unfortunately there's no "right" answer here that works well across different
// people's account histories. If the number is too large relative to a
// frequently used account, the first call will time out and waste provider
// resources... resulting in an exponential backoff. If it's too small,
// transaction history will appear "slow" to show up for newly imported
// accounts.
const BLOCKS_FOR_TRANSACTION_HISTORY = 128000

// The number of blocks before the current block height to start looking for
// asset transfers. This is important to allow nodes like Erigon and
// OpenEthereum with tracing to catch up to where we are.
const BLOCKS_TO_SKIP_FOR_TRANSACTION_HISTORY = 20

// The number of asset transfer lookups that will be done per account to rebuild
// historic activity.
const HISTORIC_ASSET_TRANSFER_LOOKUPS_PER_ACCOUNT = 10

// All networks currently supported by ChainService.
const SUPPORTED_NETWORKS: EVMNetwork[] = [ETHEREUM, KOVAN]

interface Events extends ServiceLifecycleEvents {
  newAccountToTrack: AddressNetwork
  accountBalance: AccountBalance
  assetTransfers: {
    addressNetwork: AddressNetwork
    assetTransfers: AssetTransfer[]
  }
  block: AnyEVMBlock
  transaction: { forAccounts: string[]; transaction: AnyEVMTransaction }
  blockPrices: BlockPrices
}

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
  pollingProviders: { [networkName: string]: AlchemyProvider }

  websocketProviders: { [networkName: string]: AlchemyWebSocketProvider }

  subscribedAccounts: {
    account: HexString
    provider: WebSocketProvider
  }[]

  subscribedNetworks: {
    network: EVMNetwork
    provider: WebSocketProvider
  }[]

  /**
   * FIFO queues of transaction hashes per network that should be retrieved and cached.
   */
  private transactionsToRetrieve: { [networkName: string]: HexString[] }

  static create: ServiceCreatorFunction<
    Events,
    ChainService,
    [Promise<PreferenceService>]
  > = async (preferenceService) => {
    return new this(await getOrCreateDB(), await preferenceService)
  }

  private constructor(
    private db: ChainDatabase,
    private preferenceService: PreferenceService
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
          periodInMinutes: 1,
        },
        handler: () => {
          this.handleHistoricAssetTransferAlarm()
        },
        runAtStart: true,
      },
      blockPrices: {
        runAtStart: false,
        schedule: {
          periodInMinutes:
            Number(process.env.GAS_PRICE_POLLING_FREQUENCY ?? "120") / 60,
        },
        handler: () => {
          this.pollBlockPrices()
        },
      },
    })

    this.pollingProviders = SUPPORTED_NETWORKS.reduce(
      (providers: { [index: string]: AlchemyProvider }, network) => {
        const agg = {
          ...providers,
        }
        agg[network.name.toLowerCase()] = new AlchemyProvider(
          getNetwork(Number(network.chainID)),
          ALCHEMY_KEY
        )
        return agg
      },
      {}
    )

    this.websocketProviders = SUPPORTED_NETWORKS.reduce(
      (providers: { [index: string]: AlchemyWebSocketProvider }, network) => {
        const agg = {
          ...providers,
        }
        agg[network.name.toLowerCase()] = new AlchemyWebSocketProvider(
          getNetwork(Number(network.chainID)),
          ALCHEMY_KEY
        )
        return agg
      },
      {}
    )

    this.transactionsToRetrieve = SUPPORTED_NETWORKS.reduce(
      (queues: { [networkName: string]: HexString[] }, network) => {
        const agg = {
          ...queues,
        }
        agg[network.name.toLowerCase()] = []
        return agg
      },
      {}
    )

    this.subscribedAccounts = []
    this.subscribedNetworks = []
    this.transactionsToRetrieve = { ethereum: [] }
  }

  async internalStartService(): Promise<void> {
    await super.internalStartService()

    const accounts = await this.getAccountsToTrack()

    // FIXME Which of these should be awaited, and why? Do want want our central
    // service to block on potentially spotty chains, or just on one or two? How
    // do we recover from failure here?

    // fetch latest block for all network
    Promise.all(
      SUPPORTED_NETWORKS.map(async (network) => {
        const provider = this.requirePollingProvider(network)
        const n = await provider.getBlockNumber()
        const result = await provider.getBlock(n)
        const block = blockFromEthersBlock(result, network)
        await this.db.addBlock(block)
      })
    )
    // subscribe to new blocks for all networks
    Promise.all(
      SUPPORTED_NETWORKS.map(async (network) =>
        this.subscribeToNewHeads(network)
      )
    )

    Promise.all(
      accounts
        .map(
          // subscribe to all account transactions
          (an) => this.subscribeToAccountTransactions(an)
        )
        .concat(
          // do a base-asset balance check for every account
          accounts.map(async (an) => {
            await this.getLatestBaseAccountBalance(an)
          })
        )
        .concat([])
    )
  }

  getPollingProvider(network: EVMNetwork): Provider | undefined {
    return this.pollingProviders[network.name.toLowerCase()]
  }

  requirePollingProvider(network: EVMNetwork): Provider {
    const provider = this.getPollingProvider(network)
    if (!provider) {
      logger.error("Network not supported", network)
      throw new Error("Network not supported")
    }
    return provider
  }

  getWebsocketProvider(network: EVMNetwork): WebSocketProvider | undefined {
    return this.websocketProviders[network.name.toLowerCase()]
  }

  requireWebsocketProvider(network: EVMNetwork): WebSocketProvider {
    const provider = this.getWebsocketProvider(network)
    if (!provider) {
      logger.error("Network not supported", network)
      throw new Error("Network not supported")
    }
    return provider
  }

  async getAccountsToTrack(): Promise<AddressNetwork[]> {
    return this.db.getAccountsToTrack()
  }

  async getLatestBaseAccountBalance(
    addressNetwork: AddressNetwork
  ): Promise<AccountBalance> {
    const provider = this.requirePollingProvider(addressNetwork.network)
    const balance = await provider.getBalance(addressNetwork.address)
    const accountBalance = {
      address: addressNetwork.address,
      assetAmount: {
        asset: ETH,
        amount: balance.toBigInt(),
      },
      network: addressNetwork.network,
      dataSource: "alchemy", // TODO do this properly (eg provider isn't Alchemy)
      retrievedAt: Date.now(),
    } as AccountBalance
    this.emitter.emit("accountBalance", accountBalance)
    await this.db.addBalance(accountBalance)
    return accountBalance
  }

  async addAccountToTrack(addressNetwork: AddressNetwork): Promise<void> {
    await this.db.addAccountToTrack(addressNetwork)
    this.emitter.emit("newAccountToTrack", addressNetwork)
    this.getLatestBaseAccountBalance(addressNetwork)
    this.subscribeToAccountTransactions(addressNetwork)
    this.loadRecentAssetTransfers(addressNetwork)
  }

  async getBlockHeight(network: Network): Promise<number> {
    const cachedBlock = await this.db.getLatestBlock(network)
    if (cachedBlock) {
      return cachedBlock.blockHeight
    }
    if (!isEVMNetwork(network)) {
      throw new Error("Only EVM networks are currently supported")
    }
    const provider = this.requirePollingProvider(network)
    return provider.getBlockNumber()
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
    blockHash: string
  ): Promise<AnyEVMBlock> {
    const cachedBlock = await this.db.getBlock(network, blockHash)
    if (cachedBlock) {
      return cachedBlock
    }

    // Looking for new block
    const provider = this.requirePollingProvider(network)
    const resultBlock = await provider.getBlock(blockHash)

    const block = blockFromEthersBlock(resultBlock, network)

    await this.db.addBlock(block)
    this.emitter.emit("block", block)
    return block
  }

  /**
   * Return cached information on a transaction, if it's both confirmed and
   * in the local DB.
   *
   * Otherwise, retrieve the transaction from the specified network, caching and
   * returning the object.
   *
   * @param network the EVM network we're interested in
   * @param txHash the hash of the unconfirmed transaction we're interested in
   */
  async getTransaction(
    network: EVMNetwork,
    txHash: HexString
  ): Promise<AnyEVMTransaction> {
    const cachedTx = await this.db.getTransaction(network, txHash)
    if (cachedTx) {
      return cachedTx
    }
    // TODO make proper use of the network

    const gethResult = await this.requirePollingProvider(
      network
    ).getTransaction(txHash)
    const newTransaction = transactionFromEthersTransaction(
      gethResult,
      ETH,
      network
    )

    if (!newTransaction.blockHash && !newTransaction.blockHeight) {
      this.subscribeToTransactionConfirmation(network, newTransaction)
    }

    // TODO proper provider string
    this.saveTransaction(newTransaction, "alchemy")
    return newTransaction
  }

  /**
   * Queues up a particular transaction hash for later retrieval.
   *
   * Using this method means the service can decide when to retrieve a
   * particular transaction. Queued transactions are generally retrieved on a
   * periodic basis.
   *
   * @param network The network on which the transaction has been broadcast.
   * @param txHash The tx hash identifier of the transaction we want to retrieve.
   *
   */
  async queueTransactionHashToRetrieve(
    network: EVMNetwork,
    txHash: HexString
  ): Promise<void> {
    const name = network.name.toLowerCase()
    const seen = new Set(this.transactionsToRetrieve[name])
    if (!seen.has(txHash)) {
      this.transactionsToRetrieve[name].push(txHash)
    }
  }

  /**
   * Estimate the gas needed to make a transaction.
   */
  async estimateGasLimit(
    network: EVMNetwork,
    transactionRequest: EIP1559TransactionRequest
  ): Promise<bigint> {
    const provider = this.requirePollingProvider(network)
    const estimate = await provider.estimateGas(
      ethersTransactionRequestFromEIP1559TransactionRequest(transactionRequest)
    )
    // Add 10% more gas as a safety net
    const uppedEstimate = estimate.add(estimate.div(10))
    return uppedEstimate.toBigInt()
  }

  /**
   * Broadcast a signed EVM transaction.
   *
   * @param transaction A signed EVM transaction to broadcast. Since the tx is signed,
   *        it needs to include all gas limit and price params.
   */
  async broadcastSignedTransaction(
    transaction: SignedEVMTransaction
  ): Promise<void> {
    const serialized = utils.serializeTransaction(
      ethersTransactionFromSignedTransaction(transaction),
      { r: transaction.r, s: transaction.s, v: transaction.v }
    )
    const provider = this.requirePollingProvider(transaction.network)
    try {
      await Promise.all([
        provider.sendTransaction(serialized),
        this.subscribeToTransactionConfirmation(
          transaction.network,
          transaction
        ),
        this.saveTransaction(transaction, "local"),
      ])
    } catch (error) {
      logger.error(`Error broadcasting transaction ${transaction}`, error)
      throw error
    }
  }

  /*
   * Periodically fetch block prices and emit an event whenever new data is received
   * Write block prices to IndexedDB so we have them for later
   */
  async pollBlockPrices(): Promise<void> {
    await Promise.allSettled(
      this.subscribedNetworks.map(async ({ network, provider }) => {
        const blockPrices = await getBlockPrices(network, provider)
        this.emitter.emit("blockPrices", blockPrices)
      })
    )
  }

  async send(method: string, params: unknown[]): Promise<unknown> {
    return this.websocketProviders.ethereum.send(method, params)
  }

  /* *****************
   * PRIVATE METHODS *
   * **************** */

  /**
   * Load recent asset transfers from an account on a particular network. Backs
   * off exponentially (in block range, not in time) on failure.
   *
   * @param addressNetwork the address and network whose asset transfers we need
   */
  private async loadRecentAssetTransfers(
    addressNetwork: AddressNetwork
  ): Promise<void> {
    const blockHeight =
      (await this.getBlockHeight(addressNetwork.network)) -
      BLOCKS_TO_SKIP_FOR_TRANSACTION_HISTORY
    let fromBlock = blockHeight - BLOCKS_FOR_TRANSACTION_HISTORY
    try {
      return await this.loadAssetTransfers(
        addressNetwork,
        BigInt(fromBlock),
        BigInt(blockHeight)
      )
    } catch (err) {
      logger.error(
        "Failed loaded recent assets, retrying with shorter block range",
        addressNetwork,
        err
      )
    }

    // TODO replace the home-spun backoff with a util function
    fromBlock = blockHeight - Math.floor(BLOCKS_FOR_TRANSACTION_HISTORY / 2)
    try {
      return await this.loadAssetTransfers(
        addressNetwork,
        BigInt(fromBlock),
        BigInt(blockHeight)
      )
    } catch (err) {
      logger.error(
        "Second failure loading recent assets, retrying with shorter block range",
        addressNetwork,
        err
      )
    }

    fromBlock = blockHeight - Math.floor(BLOCKS_FOR_TRANSACTION_HISTORY / 4)
    try {
      return await this.loadAssetTransfers(
        addressNetwork,
        BigInt(fromBlock),
        BigInt(blockHeight)
      )
    } catch (err) {
      logger.error(
        "Final failure loading recent assets for account",
        addressNetwork,
        err
      )
    }
    return Promise.resolve()
  }

  /**
   * Continue to load historic asset transfers, finding the oldest lookup and
   * searching for asset transfers before that block.
   *
   * @param addressNetwork The account whose asset transfers are being loaded.
   */
  private async loadHistoricAssetTransfers(
    addressNetwork: AddressNetwork
  ): Promise<void> {
    const oldest = await this.db.getOldestAccountAssetTransferLookup(
      addressNetwork
    )
    const newest = await this.db.getNewestAccountAssetTransferLookup(
      addressNetwork
    )

    if (newest !== null && oldest !== null) {
      const range = newest - oldest
      if (
        range <
        BLOCKS_FOR_TRANSACTION_HISTORY *
          HISTORIC_ASSET_TRANSFER_LOOKUPS_PER_ACCOUNT
      ) {
        // if we haven't hit 10x the single-call limit, pull another.
        await this.loadAssetTransfers(
          addressNetwork,
          oldest - BigInt(BLOCKS_FOR_TRANSACTION_HISTORY),
          oldest
        )
      }
    }
  }

  /**
   * Load asset transfers from an account on a particular network within a
   * particular block range. Emit events for any transfers found, and look up
   * any related transactions and blocks.
   *
   * @param addressNetwork the address and network whose asset transfers we need
   */
  private async loadAssetTransfers(
    addressNetwork: AddressNetwork,
    startBlock: bigint,
    endBlock: bigint
  ): Promise<void> {
    const { address, network } = addressNetwork

    // TODO only works on Ethereum today
    if (network.chainID !== ETHEREUM.chainID) {
      throw new Error("Only Ethereum asset transfers are supported.")
    }

    const assetTransfers = await getAssetTransfers(
      this.pollingProviders.ethereum,
      network,
      address,
      Number(startBlock),
      Number(endBlock)
    )

    await this.db.recordAccountAssetTransferLookup(
      addressNetwork,
      startBlock,
      endBlock
    )

    this.emitter.emit("assetTransfers", {
      addressNetwork,
      assetTransfers,
    })

    /// send all found tx hashes into a queue to retrieve + cache
    assetTransfers.forEach((a) =>
      this.queueTransactionHashToRetrieve(addressNetwork.network, a.txHash)
    )
  }

  private async handleHistoricAssetTransferAlarm(): Promise<void> {
    const accountsToTrack = await this.db.getAccountsToTrack()

    await Promise.allSettled(
      accountsToTrack.map((an) => this.loadHistoricAssetTransfers(an))
    )
  }

  private async handleQueuedTransactionAlarm(): Promise<void> {
    this.subscribedNetworks.forEach(({ network }) =>
      this.handleQueuedNetworkTransactions(network)
    )
  }

  private async handleQueuedNetworkTransactions(
    network: EVMNetwork
  ): Promise<void> {
    const name = network.name.toLowerCase()
    const toHandle =
      this.transactionsToRetrieve[name]?.slice(
        0,
        TRANSACTIONS_RETRIEVED_PER_ALARM
      ) ?? []
    this.transactionsToRetrieve[name] =
      this.transactionsToRetrieve[name]?.slice(
        TRANSACTIONS_RETRIEVED_PER_ALARM
      ) ?? []

    toHandle.forEach(async (hash) => {
      try {
        const provider = this.requirePollingProvider(network)
        const result = await provider.getTransaction(hash)

        const transaction = transactionFromEthersTransaction(
          result,
          ETH,
          network
        )

        // TODO make this provider specific
        await this.saveTransaction(transaction, "alchemy")

        if (!transaction.blockHash && !transaction.blockHeight) {
          this.subscribeToTransactionConfirmation(
            transaction.network,
            transaction
          )
        } else if (transaction.blockHash) {
          // Get relevant block data.
          await this.getBlockData(transaction.network, transaction.blockHash)
          // Retrieve gas used, status, etc
          this.retrieveTransactionReceipt(transaction.network, transaction)
        }
      } catch (error) {
        logger.error(`Error retrieving transaction ${hash}`, error)
        this.queueTransactionHashToRetrieve(network, hash)
      }
    })
  }

  /**
   * Save a transaction to the database and emit an event.
   *
   * @param transaction The transaction to save and emit. Uniqueness and
   *        ordering will be handled by the database.
   * @param dataSource Where the transaction was seen.
   */
  private async saveTransaction(
    transaction: AnyEVMTransaction,
    dataSource: "local" | "alchemy"
  ): Promise<void> {
    // Merge existing data into the updated transaction data. This handles
    // cases where an existing transaction has been enriched by e.g. a receipt,
    // and new data comes in.
    const existing = await this.db.getTransaction(
      transaction.network,
      transaction.hash
    )
    const finalTransaction = {
      ...existing,
      ...transaction,
    }

    let error: unknown = null
    try {
      await this.db.addOrUpdateTransaction(
        {
          // Don't lose fields the existing transaction has pulled, e.g. from a
          // transaction receipt.
          ...existing,
          ...finalTransaction,
        },
        dataSource
      )
    } catch (err) {
      error = err
      logger.error(`Error saving tx ${finalTransaction}`, error)
    }
    try {
      const accounts = await this.getAccountsToTrack()

      const forAccounts = accounts
        .filter(
          (addressNetwork) =>
            finalTransaction.from.toLowerCase() ===
              addressNetwork.address.toLowerCase() ||
            finalTransaction.to?.toLowerCase() ===
              addressNetwork.address.toLowerCase()
        )
        .map((addressNetwork) => {
          return addressNetwork.address.toLowerCase()
        })

      // emit in a separate try so outside services still get the tx
      this.emitter.emit("transaction", {
        transaction: finalTransaction,
        forAccounts,
      })
    } catch (err) {
      error = err
      logger.error(`Error emitting tx ${finalTransaction}`, error)
    }
    if (error) {
      throw error
    }
  }

  /**
   * Watch a network for new blocks, saving each to the database and emitting an
   * event. Re-orgs are currently ignored.
   *
   * @param network The EVM network to watch.
   */
  private async subscribeToNewHeads(network: EVMNetwork): Promise<void> {
    const provider = this.requireWebsocketProvider(network)
    // eslint-disable-next-line no-underscore-dangle
    await provider._subscribe(
      "newHeadsSubscriptionID",
      ["newHeads"],
      async (result: unknown) => {
        // add new head to database
        const block = blockFromWebsocketBlock(result, network)
        await this.db.addBlock(block)
        // emit the new block, don't wait to settle
        this.emitter.emit("block", block)
        // TODO if it matches a known blockheight and the difficulty is higher,
        // emit a reorg event
      }
    )
    this.subscribedNetworks.push({
      network,
      provider,
    })

    this.pollBlockPrices()
  }

  /**
   * Watch logs for an account's transactions on a particular network.
   *
   * @param addressNetwork The network and address to watch.
   */
  private async subscribeToAccountTransactions(
    addressNetwork: AddressNetwork
  ): Promise<void> {
    const { address, network } = addressNetwork
    const provider = this.requireWebsocketProvider(network)
    // eslint-disable-next-line no-underscore-dangle
    await provider._subscribe(
      "filteredNewFullPendingTransactionsSubscriptionID",
      [
        "alchemy_filteredNewFullPendingTransactions",
        { address: addressNetwork.address },
      ],
      async (result: unknown) => {
        // TODO use proper provider string
        // handle incoming transactions for an account
        try {
          await this.saveTransaction(
            transactionFromAlchemyWebsocketTransaction(result, ETH, network),
            "alchemy"
          )
        } catch (error) {
          logger.error(`Error saving tx: ${result}`, error)
        }
      }
    )
    this.subscribedAccounts.push({
      account: address,
      provider,
    })
  }

  /**
   * Track an pending transaction's confirmation status, saving any updates to
   * the database and informing subscribers via the emitter.
   *
   * @param network the EVM network we're interested in
   * @param transaction the unconfirmed transaction we're interested in
   */
  private async subscribeToTransactionConfirmation(
    network: EVMNetwork,
    transaction: AnyEVMTransaction
  ): Promise<void> {
    const provider = this.requireWebsocketProvider(network)
    provider.once(transaction.hash, (confirmedReceipt: TransactionReceipt) => {
      this.saveTransaction(
        enrichTransactionWithReceipt(transaction, confirmedReceipt),
        "alchemy"
      )
    })
  }

  /**
   * Retrieve a confirmed transaction's transaction receipt, saving the results.
   *
   * @param network the EVM network we're interested in
   * @param transaction the confirmed transaction we're interested in
   */
  private async retrieveTransactionReceipt(
    network: EVMNetwork,
    transaction: AnyEVMTransaction
  ): Promise<void> {
    const provider = this.requirePollingProvider(network)
    const receipt = await provider.getTransactionReceipt(transaction.hash)
    await this.saveTransaction(
      enrichTransactionWithReceipt(transaction, receipt),
      "alchemy"
    )
  }

  // TODO removing an account to track
}
