import {
  AlchemyProvider,
  AlchemyWebSocketProvider,
} from "@ethersproject/providers"
import { getNetwork } from "@ethersproject/networks"
import { utils } from "ethers"
import logger from "../../lib/logger"

import { HexString } from "../../types"
import { AccountBalance, AccountNetwork } from "../../accounts"
import {
  AnyEVMBlock,
  AnyEVMTransaction,
  EIP1559TransactionRequest,
  EVMNetwork,
  Network,
  SignedEVMTransaction,
  BlockPrices,
} from "../../networks"
import { AssetTransfer } from "../../assets"
import { getAssetTransfers } from "../../lib/alchemy"
import { ETH } from "../../constants/currencies"
import PreferenceService from "../preferences"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { getOrCreateDB, ChainDatabase } from "./db"
import BaseService from "../base"
import {
  blockFromEthersBlock,
  blockFromWebsocketBlock,
  ethersTxFromSignedTx,
  txFromEthersTx,
  txFromWebsocketTx,
} from "./utils"
import { getEthereumNetwork } from "../../lib/utils"
import Blocknative, {
  BlocknativeNetworkIds,
} from "../../third-party-data/blocknative"

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
const NUMBER_BLOCKS_FOR_TRANSACTION_HISTORY = 128000

// The number of asset transfer lookups that will be done per account to rebuild
// historic activity.
const NUMBER_HISTORIC_ASSET_TRANSFER_LOOKUPS_PER_ACCOUNT = 10

interface Events extends ServiceLifecycleEvents {
  newAccountToTrack: AccountNetwork
  accountBalance: AccountBalance
  assetTransfers: {
    accountNetwork: AccountNetwork
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
    account: string
    provider: AlchemyWebSocketProvider
  }[]

  subscribedNetworks: {
    network: EVMNetwork
    provider: AlchemyWebSocketProvider
  }[]

  blocknative: Blocknative | null = null

  /**
   * FIFO queues of transaction hashes per network that should be retrieved and cached.
   */
  private transactionsToRetrieve: { [networkName: string]: HexString[] }

  static create: ServiceCreatorFunction<
    Events,
    ChainService,
    [Promise<PreferenceService>]
  > = async (preferenceService) => {
    return new this(
      process.env.BLOCKNATIVE_API_KEY,
      await getOrCreateDB(),
      await preferenceService
    )
  }

  private constructor(
    blocknativeApiKey: string | undefined,
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
      },
    })

    // TODO set up for each relevant network
    this.pollingProviders = {
      ethereum: new AlchemyProvider(
        getNetwork(Number(getEthereumNetwork().chainID)),
        ALCHEMY_KEY
      ),
    }
    this.websocketProviders = {
      ethereum: new AlchemyWebSocketProvider(
        getNetwork(Number(getEthereumNetwork().chainID)),
        ALCHEMY_KEY
      ),
    }
    this.subscribedAccounts = []
    this.subscribedNetworks = []
    this.transactionsToRetrieve = { ethereum: [] }
    if (typeof blocknativeApiKey !== "undefined") {
      this.blocknative = Blocknative.connect(
        blocknativeApiKey,
        BlocknativeNetworkIds.ethereum.mainnet // BlockNative only supports gas estimation for Ethereum mainnet
      )
    }
  }

  async internalStartService(): Promise<void> {
    await super.internalStartService()

    const accounts = await this.getAccountsToTrack()
    const ethProvider = this.pollingProviders.ethereum

    // FIXME Should we await or drop Promise.all on the below two?
    Promise.all([
      // TODO get the latest block for other networks
      ethProvider.getBlockNumber().then(async (n) => {
        const result = await ethProvider.getBlock(n)
        const block = blockFromEthersBlock(result)
        await this.db.addBlock(block)
      }),

      this.subscribeToNewHeads(getEthereumNetwork()),
    ])

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

  async getAccountsToTrack(): Promise<AccountNetwork[]> {
    return this.db.getAccountsToTrack()
  }

  async getLatestBaseAccountBalance(
    accountNetwork: AccountNetwork
  ): Promise<AccountBalance> {
    // TODO look up provider network properly
    const balance = await this.pollingProviders.ethereum.getBalance(
      accountNetwork.account
    )
    const accountBalance = {
      account: accountNetwork.account,
      assetAmount: {
        asset: ETH,
        amount: balance.toBigInt(),
      },
      network: getEthereumNetwork(),
      dataSource: "alchemy", // TODO do this properly (eg provider isn't Alchemy)
      retrievedAt: Date.now(),
    } as AccountBalance
    this.emitter.emit("accountBalance", accountBalance)
    await this.db.addBalance(accountBalance)
    return accountBalance
  }

  async addAccountToTrack(accountNetwork: AccountNetwork): Promise<void> {
    await this.db.addAccountToTrack(accountNetwork)
    this.emitter.emit("newAccountToTrack", accountNetwork)
    this.getLatestBaseAccountBalance(accountNetwork)
    this.subscribeToAccountTransactions(accountNetwork)
    this.loadRecentAssetTransfers(accountNetwork)
  }

  async getBlockHeight(network: Network): Promise<number> {
    const cachedBlock = await this.db.getLatestBlock(network)
    if (cachedBlock) {
      return cachedBlock.blockHeight
    }
    // TODO make proper use of the network
    return this.pollingProviders.ethereum.getBlockNumber()
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
    network: Network,
    blockHash: string
  ): Promise<AnyEVMBlock> {
    // TODO make this multi network
    const cachedBlock = await this.db.getBlock(network, blockHash)
    if (cachedBlock) {
      return cachedBlock
    }

    // Looking for new block
    const resultBlock = await this.pollingProviders.ethereum.getBlock(blockHash)

    const block = blockFromEthersBlock(resultBlock)

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
    const gethResult = await this.pollingProviders.ethereum.getTransaction(
      txHash
    )
    const newTx = txFromEthersTx(gethResult, ETH, getEthereumNetwork())

    if (!newTx.blockHash && !newTx.blockHeight) {
      this.subscribeToTransactionConfirmation(network, txHash)
    }

    // TODO proper provider string
    this.saveTransaction(newTx, "alchemy")
    return newTx
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
    // TODO make proper use of the network
    const seen = new Set(this.transactionsToRetrieve.ethereum)
    if (!seen.has(txHash)) {
      this.transactionsToRetrieve.ethereum.push(txHash)
    }
  }

  /**
   * Estimate the gas needed to make a transaction.
   */
  async estimateGasLimit(
    network: EVMNetwork,
    tx: EIP1559TransactionRequest
  ): Promise<bigint> {
    const estimate = await this.pollingProviders.ethereum.estimateGas(tx)
    return BigInt(estimate.toString())
  }

  /**
   * Broadcast a signed EVM transaction.
   *
   * @param tx A signed EVM transaction to broadcast. Since the tx is signed,
   *        it needs to include all gas limit and price params.
   */
  async broadcastSignedTransaction(tx: SignedEVMTransaction): Promise<void> {
    // TODO make proper use of tx.network to choose provider
    const serialized = utils.serializeTransaction(ethersTxFromSignedTx(tx))
    try {
      await Promise.all([
        this.pollingProviders.ethereum.sendTransaction(serialized),
        this.subscribeToTransactionConfirmation(tx.network, tx.hash),
        this.saveTransaction(tx, "local"),
      ])
    } catch (error) {
      logger.error(`Error broadcasting transaction ${tx}`, error)
      throw error
    }
  }

  /*
   * Periodically fetch block prices and emit an event whenever new data is received
   * Write block prices to IndexedDB so we have them for later
   */
  async pollBlockPrices(): Promise<void> {
    // Immediately fetch the current block prices when this function gets called
    if (this.blocknative) {
      const blockPrices = await this.blocknative?.getBlockPrices()
      this.emitter.emit("blockPrices", blockPrices)

      // Set a timeout to continue fetching block prices, defaulting to every 120 seconds
      setTimeout(() => {
        this.pollBlockPrices()
      }, Number(process.env.BLOCKNATIVE_POLLING_FREQUENCY || 120) * 1000)
    }
  }

  /* *****************
   * PRIVATE METHODS *
   * **************** */

  /**
   * Load recent asset transfers from an account on a particular network. Backs
   * off exponentially (in block range, not in time) on failure.
   *
   * @param accountNetwork the account and network whose asset transfers we need
   */
  private async loadRecentAssetTransfers(
    accountNetwork: AccountNetwork
  ): Promise<void> {
    const blockHeight = await this.getBlockHeight(accountNetwork.network)
    let fromBlock = blockHeight - NUMBER_BLOCKS_FOR_TRANSACTION_HISTORY
    try {
      return await this.loadAssetTransfers(
        accountNetwork,
        BigInt(fromBlock),
        BigInt(blockHeight)
      )
    } catch (err) {
      logger.error(
        "Failed loaded recent assets, retrying with shorter block range",
        accountNetwork,
        err
      )
    }

    // TODO replace the home-spun backoff with a util function
    fromBlock =
      blockHeight - Math.floor(NUMBER_BLOCKS_FOR_TRANSACTION_HISTORY / 2)
    try {
      return await this.loadAssetTransfers(
        accountNetwork,
        BigInt(fromBlock),
        BigInt(blockHeight)
      )
    } catch (err) {
      logger.error(
        "Second failure loading recent assets, retrying with shorter block range",
        accountNetwork,
        err
      )
    }

    fromBlock =
      blockHeight - Math.floor(NUMBER_BLOCKS_FOR_TRANSACTION_HISTORY / 4)
    try {
      return await this.loadAssetTransfers(
        accountNetwork,
        BigInt(fromBlock),
        BigInt(blockHeight)
      )
    } catch (err) {
      logger.error(
        "Final failure loading recent assets for account",
        accountNetwork,
        err
      )
    }
    return Promise.resolve()
  }

  /**
   * Continue to load historic asset transfers, finding the oldest lookup and
   * searching for asset transfers before that block.
   *
   * @param accountNetwork The account whose asset transfers are being loaded.
   */
  private async loadHistoricAssetTransfers(
    accountNetwork: AccountNetwork
  ): Promise<void> {
    const oldest = await this.db.getOldestAccountAssetTransferLookup(
      accountNetwork
    )
    const newest = await this.db.getNewestAccountAssetTransferLookup(
      accountNetwork
    )

    if (newest !== null && oldest !== null) {
      const range = newest - oldest
      if (
        range <
        NUMBER_BLOCKS_FOR_TRANSACTION_HISTORY *
          NUMBER_HISTORIC_ASSET_TRANSFER_LOOKUPS_PER_ACCOUNT
      ) {
        // if we haven't hit 10x the single-call limit, pull another.
        await this.loadAssetTransfers(
          accountNetwork,
          oldest - BigInt(NUMBER_BLOCKS_FOR_TRANSACTION_HISTORY),
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
   * @param accountNetwork the account and network whose asset transfers we need
   */
  private async loadAssetTransfers(
    accountNetwork: AccountNetwork,
    startBlock: bigint,
    endBlock: bigint
  ): Promise<void> {
    // TODO only works on Ethereum today
    const assetTransfers = await getAssetTransfers(
      this.pollingProviders.ethereum,
      accountNetwork.account,
      Number(startBlock),
      Number(endBlock)
    )

    await this.db.recordAccountAssetTransferLookup(
      accountNetwork,
      startBlock,
      endBlock
    )

    this.emitter.emit("assetTransfers", {
      accountNetwork,
      assetTransfers,
    })

    /// send all found tx hashes into a queue to retrieve + cache
    assetTransfers.forEach((a) =>
      this.queueTransactionHashToRetrieve(getEthereumNetwork(), a.txHash)
    )
  }

  private async handleHistoricAssetTransferAlarm(): Promise<void> {
    const accountsToTrack = await this.db.getAccountsToTrack()

    await Promise.allSettled(
      accountsToTrack.map((an) => this.loadHistoricAssetTransfers(an))
    )
  }

  private async handleQueuedTransactionAlarm(): Promise<void> {
    // TODO make this multi network
    const toHandle = this.transactionsToRetrieve.ethereum.slice(
      0,
      TRANSACTIONS_RETRIEVED_PER_ALARM
    )
    this.transactionsToRetrieve.ethereum =
      this.transactionsToRetrieve.ethereum.slice(
        TRANSACTIONS_RETRIEVED_PER_ALARM
      )

    toHandle.forEach(async (hash) => {
      try {
        // TODO make this multi network
        const result = await this.pollingProviders.ethereum.getTransaction(hash)

        const tx = txFromEthersTx(result, ETH, getEthereumNetwork())

        // TODO make this provider specific
        await this.saveTransaction(tx, "alchemy")

        if (!tx.blockHash && !tx.blockHeight) {
          this.subscribeToTransactionConfirmation(tx.network, tx.hash)
        } else if (tx.blockHash) {
          // Get relevant block data.
          await this.getBlockData(tx.network, tx.blockHash)
        }
      } catch (error) {
        logger.error(`Error retrieving transaction ${hash}`, error)
        this.queueTransactionHashToRetrieve(getEthereumNetwork(), hash)
      }
    })
  }

  /**
   * Save a transaction to the database and emit an event.
   *
   * @param tx The transaction to save and emit. Uniqueness and ordering will be
   *        handled by the database.
   * @param datasource Where the transaction was seen.
   */
  private async saveTransaction(
    tx: AnyEVMTransaction,
    dataSource: "local" | "alchemy"
  ): Promise<void> {
    let error: unknown = null
    try {
      await this.db.addOrUpdateTransaction(tx, dataSource)
    } catch (err) {
      error = err
      logger.error(`Error saving tx ${tx}`, error)
    }
    try {
      const accounts = await this.getAccountsToTrack()

      const forAccounts = accounts
        .filter(
          (accountNetwork) =>
            tx.from.toLowerCase() === accountNetwork.account.toLowerCase() ||
            tx.to?.toLowerCase() === accountNetwork.account.toLowerCase()
        )
        .map((accountNetwork) => {
          return accountNetwork.account.toLowerCase()
        })

      // emit in a separate try so outside services still get the tx
      this.emitter.emit("transaction", { transaction: tx, forAccounts })
    } catch (err) {
      error = err
      logger.error(`Error emitting tx ${tx}`, error)
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
    // TODO look up provider network properly
    const provider = this.websocketProviders.ethereum
    // eslint-disable-next-line no-underscore-dangle
    await provider._subscribe(
      "newHeadsSubscriptionID",
      ["newHeads"],
      async (result: unknown) => {
        // add new head to database
        const block = blockFromWebsocketBlock(result)
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
  }

  /**
   * Watch logs for an account's transactions on a particular network.
   *
   * @param accountNetwork The network and account to watch.
   */
  private async subscribeToAccountTransactions(
    accountNetwork: AccountNetwork
  ): Promise<void> {
    // TODO look up provider network properly
    const provider = this.websocketProviders.ethereum
    // eslint-disable-next-line no-underscore-dangle
    await provider._subscribe(
      "filteredNewFullPendingTransactionsSubscriptionID",
      [
        "alchemy_filteredNewFullPendingTransactions",
        { address: accountNetwork.account },
      ],
      async (result: unknown) => {
        // TODO use proper provider string
        // handle incoming transactions for an account
        try {
          await this.saveTransaction(
            txFromWebsocketTx(result, ETH, getEthereumNetwork()),
            "alchemy"
          )
        } catch (error) {
          logger.error(`Error saving tx: ${result}`, error)
        }
      }
    )
    this.subscribedAccounts.push({
      account: accountNetwork.account,
      provider,
    })
  }

  /**
   * Track an pending transaction's confirmation status, saving any updates to
   * the database and informing subscribers via the emitter.
   *
   * @param network the EVM network we're interested in
   * @param txHash the hash of the unconfirmed transaction we're interested in
   */
  private async subscribeToTransactionConfirmation(
    network: EVMNetwork,
    txHash: HexString
  ): Promise<void> {
    // TODO make proper use of the network
    this.websocketProviders.ethereum.once(txHash, (confirmedTx) => {
      this.saveTransaction(
        txFromWebsocketTx(confirmedTx, ETH, getEthereumNetwork()),
        "alchemy"
      )
    })
  }

  // TODO removing an account to track
}
