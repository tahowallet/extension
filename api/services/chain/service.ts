import { browser, Alarms } from "webextension-polyfill-ts"
import {
  AlchemyProvider,
  AlchemyWebSocketProvider,
} from "@ethersproject/providers"
import {
  Transaction as EthersTransaction,
  UnsignedTransaction as EthersUnsignedTransaction,
} from "@ethersproject/transactions"
import { BigNumber } from "ethers"
import Emittery from "emittery"

import {
  AccountBalance,
  AccountNetwork,
  EIP1559Block,
  FungibleAsset,
  Network,
  EVMTransaction,
  ConfirmedEVMTransaction,
  SignedEVMTransaction,
  SignedConfirmedEVMTransaction,
} from "../../types"
import { getAssetTransfers, AlchemyAssetTransfer } from "../../lib/alchemy"
import { ETHEREUM } from "../../constants/networks"
import { ETH } from "../../constants/currencies"
import PreferenceService from "../preferences/service"
import { Service } from ".."
import { getOrCreateDB, ChainDatabase } from "./db"

const ALCHEMY_KEY = "8R4YNuff-Is79CeEHM2jzj2ssfzJcnfa"

const NUMBER_BLOCKS_FOR_TRANSACTION_HISTORY = 32400 // 64800

const TRANSACTIONS_RETRIEVED_PER_ALARM = 5

function bigIntFromHex(s: string): BigInt {
  return BigNumber.from(s).toBigInt()
}

/*
 * Parse a block as returned by geth or Alchemy.
 */
function blockFromGethResult(gethResult: any): EIP1559Block {
  return {
    hash: gethResult.hash as string,
    blockHeight: BigNumber.from(gethResult.number as string).toNumber(),
    parentHash: gethResult.parentHash as string,
    difficulty: BigNumber.from(gethResult.difficulty as string).toBigInt(),
    timestamp: BigNumber.from(gethResult.timestamp as string).toNumber(),
    baseFeePerGas: BigNumber.from(
      gethResult.baseFeePerGas as string
    ).toBigInt(),
    network: ETHEREUM,
  }
}

type AnyEVMTransaction =
  | EVMTransaction
  | ConfirmedEVMTransaction
  | SignedConfirmedEVMTransaction
  | SignedEVMTransaction

function txFromWebsocketTx(
  tx: any,
  asset: FungibleAsset,
  network: Network,
  dataSource: AnyEVMTransaction["dataSource"]
): AnyEVMTransaction {
  return {
    hash: tx.hash as string,
    to: tx.to as string,
    from: tx.from as string,
    gas: bigIntFromHex(tx.gas as string),
    gasPrice: bigIntFromHex(tx.gasPrice as string),
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
    dataSource,
  }
}

function txFromGethTx(
  tx: EthersTransaction & {
    blockHash?: string
    blockNumber?: number
    type?: number
  },
  asset: FungibleAsset,
  network: Network,
  dataSource: AnyEVMTransaction["dataSource"]
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
    gasPrice: tx.gasPrice.toBigInt(),
    value: tx.value.toBigInt(),
    input: tx.data,
    type: tx.type as AnyEVMTransaction["type"],
    dataSource,
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

    if (tx.blockHash && tx.blockNumber) {
      return {
        ...signedTx,
        blockHash: tx.blockHash,
        blockHeight: tx.blockNumber,
      }
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
  accountBalance: AccountBalance
  alchemyAssetTransfers: AlchemyAssetTransfer[]
  newBlock: EIP1559Block
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
 * * Event subscriptions, including
 *   * Incoming and outgoing transactions
 *   * Pending transaction confirmation
 *    * Relevant account balance changes
 *    * New blocks and reorgs
 *    * Gas estimation and transaction broadcasting
 * * ... and finally, polling and websocket providers for supported networks, in
 *   case a service needs to interact with a network directly.
 *
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
    network: Network
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
    await Promise.all([
      // TODO get the latest block for other networks
      ethProvider.getBlockNumber().then(async (n) => {
        const result = await ethProvider.getBlock(n)
        const block = blockFromGethResult(result)
        await this.db.blocks.add(block)
      }),
      // TODO subscribe to newHeads for other networks
      this.subscribeToNewHeads(ETHEREUM),
    ])

    await Promise.all(
      accounts
        .map(
          // subscribe to all account transactions
          (an) => this.subscribeToAccountTransaction(an)
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

  async subscribeToNewHeads(network: Network): Promise<void> {
    // TODO look up provider network properly
    const provider = this.websocketProviders.ethereum
    // eslint-disable-next-line
    await provider._subscribe(
      "newHeadsSubscriptionID",
      ["newHeads"],
      async (result: any) => {
        // add new head to database
        const block = blockFromGethResult(result)
        await this.db.blocks.add(block)
        // emit the new block, don't wait to settle
        this.emitter.emit("newBlock", block)
        // TODO if it matches a known blockheight and the difficulty is higher,
        // emit a reorg event
      }
    )
    this.subscribedNetworks.push({
      network,
      provider,
    })
  }

  async subscribeToAccountTransaction(
    accountNetwork: AccountNetwork
  ): Promise<void> {
    // TODO look up provider network properly
    const provider = this.websocketProviders.ethereum
    // eslint-disable-next-line
    await provider._subscribe(
      "filteredNewFullPendingTransactionsSubscriptionID",
      [
        "alchemy_filteredNewFullPendingTransactions",
        { address: accountNetwork.account },
      ],
      async (result: any) => {
        // handle incoming transactions for an account
        // TODO use proper provider string
        try {
          await this.saveTransaction(
            txFromWebsocketTx(result, ETH, ETHEREUM, "alchemy")
          )
        } catch (error) {
          console.error(`Error saving tx: ${result}`, error)
        }
      }
    )
    this.subscribedAccounts.push({
      account: accountNetwork.account,
      provider,
    })
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
    await this.db.balances.add(accountBalance)
    return accountBalance
  }

  async addAccountToTrack(accountNetwork: AccountNetwork): Promise<void> {
    const current = await this.getAccountsToTrack()
    await this.db.setAccountsToTrack(current.concat([accountNetwork]))
    await this.getLatestBaseAccountBalance(accountNetwork)
    await this.subscribeToAccountTransaction(accountNetwork)
    await this.loadRecentAssetTransfers(accountNetwork)
  }

  async getBlockHeight(network: Network): Promise<number> {
    const block = await this.db.getLatestBlock(network)
    if (block) {
      return block.blockHeight
    }
    // TODO make proper use of the network
    return this.pollingProviders.ethereum.getBlockNumber()
  }

  async queueTransactionHashToRetrieve(
    network: Network,
    hash: string
  ): Promise<void> {
    // TODO make proper use of the network
    const seen = new Set(this.transactionsToRetrieve.ethereum)
    if (!seen.has(hash)) {
      this.transactionsToRetrieve.ethereum.push(hash)
    }
  }

  /*
   * Get recent asset transfers from an account on a particular network. Emit
   * events for any transfers found, and look up any related transactions and
   * blocks.
   */
  private async loadRecentAssetTransfers(
    accountNetwork: AccountNetwork
  ): Promise<void> {
    const blockHeight = await this.getBlockHeight(accountNetwork.network)
    const fromBlock = blockHeight - NUMBER_BLOCKS_FOR_TRANSACTION_HISTORY
    // TODO only works on Ethereum today
    const assetTransfers = await getAssetTransfers(
      this.pollingProviders.ethereum,
      accountNetwork.account,
      fromBlock
    )

    // TODO any of those contracts that are ERC-20s should be added to
    // tokensToTrack by the indexing service
    this.emitter.emit("alchemyAssetTransfers", assetTransfers)

    /// send all found tx hashes into a queue to retrieve + cache
    assetTransfers.forEach((a) =>
      this.queueTransactionHashToRetrieve(ETHEREUM, a.hash)
    )
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
          // TODO make this multi network
          const result = await this.pollingProviders.ethereum.getTransaction(
            hash
          )
          // TODO make this provider specific
          await this.saveTransaction(
            txFromGethTx(result, ETH, ETHEREUM, "alchemy")
          )
        } catch (error) {
          // TODO proper logging
          console.error(`Error retrieving transaction ${hash}`, error)
          this.queueTransactionHashToRetrieve(ETHEREUM, hash)
        }
      })
    )
  }

  private async saveTransaction(tx: AnyEVMTransaction): Promise<void> {
    await this.db.addOrUpdateTransaction(tx)
    this.emitter.emit("transaction", tx)
  }

  // TODO removing an account to track
  // TODO getting transaction contents from hash + network, confirmed + mempool, including cached & local transactions
  // TODO keep track of transaction confirmation
}
