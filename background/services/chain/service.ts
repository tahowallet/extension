import { browser, Alarms } from "webextension-polyfill-ts"
import {
  AlchemyProvider,
  AlchemyWebSocketProvider,
} from "@ethersproject/providers"
import { Block as EthersBlock } from "@ethersproject/abstract-provider"
import { Transaction as EthersTransaction } from "@ethersproject/transactions"
import { BigNumber, utils } from "ethers"
import Emittery from "emittery"
import logger from "../../lib/logger"

import {
  AccountBalance,
  AccountNetwork,
  AnyEVMTransaction,
  AssetTransfer,
  EIP1559Block,
  EVMNetwork,
  FungibleAsset,
  SignedEVMTransaction,
} from "../../types"
import { getAssetTransfers } from "../../lib/alchemy"
import { ETHEREUM } from "../../constants/networks"
import { ETH } from "../../constants/currencies"
import PreferenceService from "../preferences/service"
import { Service } from ".."
import { getOrCreateDB, ChainDatabase } from "./db"

// We can't use destructuring because webpack has to replace all instances of `process.env` variables in the bundled output
const ALCHEMY_KEY = process.env.ALCHEMY_KEY // eslint-disable-line prefer-destructuring

const NUMBER_BLOCKS_FOR_TRANSACTION_HISTORY = 128000 // 32400 // 64800

const TRANSACTIONS_RETRIEVED_PER_ALARM = 5

function bigIntFromHex(s: string): bigint {
  return BigNumber.from(s).toBigInt()
}

/*
 * Parse a block as returned by a polling provider.
 */
function blockFromEthersBlock(gethResult: EthersBlock): EIP1559Block {
  return {
    hash: gethResult.hash as string,
    blockHeight: gethResult.number,
    parentHash: gethResult.parentHash as string,
    difficulty: BigInt(gethResult.difficulty),
    timestamp: gethResult.timestamp,
    baseFeePerGas: gethResult.baseFeePerGas.toBigInt(),
    network: ETHEREUM,
  }
}

/*
 * Parse a block as returned by a websocket provider subscription.
 */
function blockFromWebsocketBlock(gethResult: any): EIP1559Block {
  return {
    hash: gethResult.hash as string,
    blockHeight: BigNumber.from(gethResult.number as string).toNumber(),
    parentHash: gethResult.parentHash as string,
    difficulty: bigIntFromHex(gethResult.difficulty as string),
    timestamp: BigNumber.from(gethResult.timestamp as string).toNumber(),
    baseFeePerGas: bigIntFromHex(gethResult.baseFeePerGas as string),
    network: ETHEREUM,
  }
}

function ethersTxFromTx(tx: AnyEVMTransaction): EthersTransaction {
  const baseTx = {
    nonce: Number(tx.nonce),
    gasLimit: tx.gas ? BigNumber.from(tx.gas) : null,
    maxFeePerGas: tx.maxFeePerGas ? BigNumber.from(tx.maxFeePerGas) : null,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
      ? BigNumber.from(tx.maxPriorityFeePerGas)
      : null,
    to: tx.to,
    from: tx.from,
    data: tx.input,
    chainId: parseInt(tx.network.chainID, 10),
    value: BigNumber.from(tx.value),
  }
  if ((tx as SignedEVMTransaction).r !== undefined) {
    return {
      ...baseTx,
      r: (tx as SignedEVMTransaction).r,
      s: (tx as SignedEVMTransaction).s,
      v: (tx as SignedEVMTransaction).v,
    }
  }
  return baseTx
}

/*
 * Parse a transaction as returned by a websocket provider subscription.
 */
function txFromWebsocketTx(
  tx: any,
  asset: FungibleAsset,
  network: EVMNetwork
): AnyEVMTransaction {
  return {
    hash: tx.hash as string,
    to: tx.to as string,
    from: tx.from as string,
    gas: bigIntFromHex(tx.gas as string),
    gasPrice: bigIntFromHex(tx.gasPrice as string),
    maxFeePerGas: tx.maxFeePerGas ? bigIntFromHex(tx.maxFeePerGas) : null,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
      ? bigIntFromHex(tx.maxPriorityFeePerGas)
      : null,
    input: tx.input as string,
    r: (tx.r as string) || undefined,
    s: (tx.s as string) || undefined,
    v: BigNumber.from(tx.v).toNumber(),
    nonce: bigIntFromHex(tx.nonce),
    value: bigIntFromHex(tx.value),
    blockHash: tx.blockHash || undefined,
    blockHeight: tx.blockNumber || undefined,
    type:
      tx.type !== undefined
        ? (BigNumber.from(tx.type).toNumber() as AnyEVMTransaction["type"])
        : 0,
    asset,
    network,
  }
}

/*
 * Parse a transaction as returned by a polling provider.
 */
function txFromEthersTx(
  tx: EthersTransaction & {
    blockHash?: string
    blockNumber?: number
    type?: number
  },
  asset: FungibleAsset,
  network: EVMNetwork
): AnyEVMTransaction {
  if (tx.hash === undefined) {
    throw Error("Malformed transaction")
  }
  const newTx = {
    hash: tx.hash as string,
    from: tx.from as string,
    to: tx.to as string,
    nonce: BigInt(parseInt(tx.nonce.toString(), 10)),
    gas: tx.gasLimit.toBigInt(),
    gasPrice: tx.gasPrice ? tx.gasPrice.toBigInt() : null,
    maxFeePerGas: tx.maxFeePerGas ? tx.maxFeePerGas.toBigInt() : null,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
      ? tx.maxPriorityFeePerGas.toBigInt()
      : null,
    value: tx.value.toBigInt(),
    input: tx.data,
    type: tx.type as AnyEVMTransaction["type"],
    blockHash: tx.blockHash || null,
    blockHeight: tx.blockNumber || null,
    network,
    asset,
  }
  if (tx.r && tx.s && tx.v) {
    const signedTx = {
      ...newTx,
      r: tx.r,
      s: tx.s,
      v: tx.v,
    }
    return signedTx
  }
  return newTx
}

interface AlarmSchedule {
  when?: number
  delayInMinutes?: number
  periodInMinutes?: number
}

interface Events {
  newAccountToTrack: AccountNetwork
  accountBalance: AccountBalance
  assetTransfers: {
    accountNetwork: AccountNetwork
    assetTransfers: AssetTransfer[]
  }
  block: EIP1559Block
  transaction: AnyEVMTransaction
}

/*
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
export default class ChainService implements Service<Events> {
  readonly schedules: { [alarmName: string]: AlarmSchedule }

  readonly emitter: Emittery<Events>

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

  /*
   * FIFO queues of transaction hashes per network that should be retrieved and cached.
   */
  private transactionsToRetrieve: { [networkName: string]: string[] }

  private preferenceService: Promise<PreferenceService>

  private db?: ChainDatabase

  constructor(
    schedules: { [alarmName: string]: AlarmSchedule },
    preferenceService: Promise<PreferenceService>
  ) {
    this.schedules = schedules
    this.emitter = new Emittery<Events>()

    this.preferenceService = preferenceService

    // TODO set up for each relevant network
    this.pollingProviders = {
      ethereum: new AlchemyProvider(
        { name: "homestead", chainId: 1 },
        ALCHEMY_KEY
      ),
    }
    this.websocketProviders = {
      ethereum: new AlchemyWebSocketProvider(
        { name: "homestead", chainId: 1 },
        ALCHEMY_KEY
      ),
    }
    this.subscribedAccounts = []
    this.subscribedNetworks = []
    this.transactionsToRetrieve = { ethereum: [] }
  }

  async startService(): Promise<void> {
    this.db = await getOrCreateDB()

    const accounts = await this.getAccountsToTrack()
    const ethProvider = this.pollingProviders.ethereum
    Object.entries(this.schedules).forEach(([name, schedule]) => {
      browser.alarms.create(name, schedule)
    })
    browser.alarms.onAlarm.addListener((alarm: Alarms.Alarm) => {
      if (alarm.name === "queuedTransactions") {
        this.handleQueuedTransactionAlarm()
      }
    })

    Promise.all([
      // TODO get the latest block for other networks
      ethProvider.getBlockNumber().then(async (n) => {
        const result = await ethProvider.getBlock(n)
        const block = blockFromEthersBlock(result)
        await this.db.addBlock(block)
      }),
      // TODO subscribe to newHeads for other networks
      this.subscribeToNewHeads(ETHEREUM),
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

  // eslint-disable-next-line
  async stopService(): Promise<void> {}

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
      network: ETHEREUM,
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

  async getBlockHeight(network: EVMNetwork): Promise<number> {
    const cachedBlock = await this.db.getLatestBlock(network)
    if (cachedBlock) {
      return cachedBlock.blockHeight
    }
    // TODO make proper use of the network
    return this.pollingProviders.ethereum.getBlockNumber()
  }

  async getBlockData(
    network: Network,
    blockHash: string
  ): Promise<EIP1559Block> {
    // TODO make this multi network
    const cachedBlock = await this.db.getBlock(network, blockHash)
    if (cachedBlock) {
      return cachedBlock
    }

    // Looking for new block
    const resultBlock = await this.pollingProviders.ethereum.getBlock(blockHash)

    const block = blockFromEthersBlock(resultBlock)

    await this.db.addBlock(block)
    return block
  }

  async getTransaction(
    network: EVMNetwork,
    hash: string
  ): Promise<AnyEVMTransaction> {
    const cachedTx = await this.db.getTransaction(network, hash)
    if (cachedTx) {
      return cachedTx
    }
    // TODO make proper use of the network
    const gethResult = await this.pollingProviders.ethereum.getTransaction(hash)
    const newTx = txFromEthersTx(gethResult, ETH, ETHEREUM)

    if (!newTx.blockHash && !newTx.blockHeight) {
      this.subscribeToTransactionConfirmation(network, hash)
    }

    // TODO proper provider string
    this.saveTransaction(newTx, "alchemy")
    return newTx
  }

  async queueTransactionHashToRetrieve(
    network: EVMNetwork,
    hash: string
  ): Promise<void> {
    // TODO make proper use of the network
    const seen = new Set(this.transactionsToRetrieve.ethereum)
    if (!seen.has(hash)) {
      this.transactionsToRetrieve.ethereum.push(hash)
    }
  }

  /*
   * Broadcast a signed EVM transaction.
   */
  async broadcastSignedTransaction(tx: SignedEVMTransaction): Promise<void> {
    // TODO make proper use of tx.network to choose provider
    const serialized = utils.serializeTransaction(ethersTxFromTx(tx))
    try {
      await Promise.all([
        this.pollingProviders.ethereum.sendTransaction(serialized),
        this.subscribeToTransactionConfirmation(tx.network, tx.hash),
        this.saveTransaction(tx, "local"),
      ])
    } catch (error) {
      // TODO proper logging
      logger.error(`Error broadcasting transaction ${tx}`, error)
      throw error
    }
  }

  /* *****************
   * PRIVATE METHODS *
   * **************** */

  /*
   * Get recent asset transfers from an account on a particular network. Emit
   * events for any transfers found, and look up any related transactions and
   * blocks.
   */
  private async loadRecentAssetTransfers(
    accountNetwork: AccountNetwork
  ): Promise<void> {
    try {
      const blockHeight = await this.getBlockHeight(
        accountNetwork.network as EVMNetwork
      )
      const fromBlock = blockHeight - NUMBER_BLOCKS_FOR_TRANSACTION_HISTORY
      // TODO only works on Ethereum today
      const assetTransfers = await getAssetTransfers(
        this.pollingProviders.ethereum,
        accountNetwork.account,
        fromBlock
      )

      // TODO if this fails, other services still needs a way to kick
      // off monitoring of token balances
      this.emitter.emit("assetTransfers", {
        accountNetwork,
        assetTransfers,
      })

      /// send all found tx hashes into a queue to retrieve + cache
      assetTransfers.forEach((a) =>
        this.queueTransactionHashToRetrieve(ETHEREUM, a.txHash)
      )
    } catch (err) {
      logger.error(err)
    }
  }

  private async handleQueuedTransactionAlarm(): Promise<void> {
    // TODO make this multi network
    // TODO get transaction and load it into database
    const toHandle = this.transactionsToRetrieve.ethereum.slice(
      0,
      TRANSACTIONS_RETRIEVED_PER_ALARM
    )
    this.transactionsToRetrieve.ethereum =
      this.transactionsToRetrieve.ethereum.slice(
        TRANSACTIONS_RETRIEVED_PER_ALARM
      )

    await Promise.allSettled(
      toHandle.map(async (hash) => {
        try {
          const result = await this.pollingProviders.ethereum.getTransaction(
            hash
          )

          const tx = txFromEthersTx(result, ETH, ETHEREUM)

          if (!tx.blockHash && !tx.blockHeight) {
            this.subscribeToTransactionConfirmation(tx.network, tx.hash)
          }

          // Get relevant block data. Primarily used in the frontend for timestamps. Emits and saves block data
          const block = await this.getBlockData(tx.network, result.blockHash)

          // TODO make this provider specific
          // Save block and transaction
          await this.saveTransaction(tx, "alchemy")

          // Trigger sending block to redux store
          this.emitter.emit("block", block)
        } catch (error) {
          // TODO proper logging
          logger.error(`Error retrieving transaction ${hash}`, error)
          this.queueTransactionHashToRetrieve(ETHEREUM, hash)
        }
      })
    )
  }

  private async saveTransaction(
    tx: AnyEVMTransaction,
    dataSource: "local" | "alchemy"
  ): Promise<void> {
    let error: any
    try {
      await this.db.addOrUpdateTransaction(tx, dataSource)
    } catch (err) {
      // TODO proper logging
      error = err
      logger.error(`Error saving tx ${tx}`, error)
    }
    try {
      // emit in a separate try so outside services still get the tx
      this.emitter.emit("transaction", tx)
    } catch (err) {
      // TODO proper logging
      error = err
      logger.error(`Error emitting tx ${tx}`, error)
    }
    if (error) {
      throw error
    }
  }

  private async subscribeToNewHeads(network: EVMNetwork): Promise<void> {
    // TODO look up provider network properly
    const provider = this.websocketProviders.ethereum
    // eslint-disable-next-line
    await provider._subscribe(
      "newHeadsSubscriptionID",
      ["newHeads"],
      async (result: any) => {
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
      async (result: any) => {
        // TODO use proper provider string
        // handle incoming transactions for an account
        try {
          await this.saveTransaction(
            txFromWebsocketTx(result, ETH, ETHEREUM),
            "alchemy"
          )
        } catch (error) {
          // TODO proper logging
          logger.error(`Error saving tx: ${result}`, error)
        }
      }
    )
    this.subscribedAccounts.push({
      account: accountNetwork.account,
      provider,
    })
  }

  /*
   * Track an pending transaction's confirmation status, saving any updates to
   * the database and informing subscribers.
   */
  private async subscribeToTransactionConfirmation(
    network: EVMNetwork,
    hash: string
  ): Promise<void> {
    // TODO make proper use of the network
    this.websocketProviders.ethereum.once(hash, (confirmedTx) => {
      this.saveTransaction(
        txFromWebsocketTx(confirmedTx, ETH, ETHEREUM),
        "alchemy"
      )
    })
  }

  // TODO removing an account to track
  // TODO getting transaction contents from hash + network, confirmed + mempool, including cached & local transactions
  // TODO keep track of transaction confirmations
}
