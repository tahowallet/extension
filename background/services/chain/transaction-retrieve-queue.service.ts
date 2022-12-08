import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"

import { SECOND } from "../../constants"
import { EVMNetwork } from "../../networks"
import { HexString, UNIXTime } from "../../types"
import BaseService from "../base"

interface Events extends ServiceLifecycleEvents {
  txToRetrieve: QueuedTxToRetrieve
}

export type QueuedTxToRetrieve = {
  network: EVMNetwork
  hash: HexString
  firstSeen: UNIXTime
}

/*
 * The TransactionRetrieveQueueService service is responsible for queueing the transaction retrieval
 * requests, and scheduling their retrieval
 */
export default class TransactionRetrieveQueueService extends BaseService<Events> {
  /*
   * Create a new QueuedTransactionRetrieveService. The service isn't initialized until
   * startService() is called and resolved.
   */
  static create: ServiceCreatorFunction<
    Events,
    TransactionRetrieveQueueService,
    []
  > = async () => {
    return new this()
  }

  /**
   * FIFO queues of transaction hashes per network that should be retrieved and
   * cached, alongside information about when that hash request was first seen
   * for expiration purposes.
   */
  private transactionsToRetrieve: QueuedTxToRetrieve[]

  /**
   * Internal timer for the transactionsToRetrieve FIFO queue.
   * Starting multiple transaction requests at the same time is resource intensive
   * on the user's machine and also can result in rate limitations with the provider.
   *
   * Because of this we need to smooth out the retrieval scheduling.
   *
   * Limitations
   *   - handlers can fire only in 1+ minute intervals
   *   - in manifest v3 / service worker context the background thread can be shut down any time.
   *     Because of this we need to keep the granular queue tied to the persisted list of txs
   */
  private transactionToRetrieveGranularTimer: NodeJS.Timer | undefined

  private constructor() {
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
    })

    this.transactionsToRetrieve = []
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()
  }

  protected override async internalStopService(): Promise<void> {
    await super.internalStopService()
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
   * @param firstSeen The timestamp at which the queued transaction was first
   *        seen; used to treat transactions as dropped after a certain amount
   *        of time.
   */
  add(network: EVMNetwork, txHash: HexString, firstSeen: UNIXTime): void {
    const seen = this.isHashQueued(network, txHash)

    if (!seen) {
      // @TODO Interleave initial transaction retrieval by network
      this.transactionsToRetrieve.push({ hash: txHash, network, firstSeen })
    }
  }

  /**
   * Checks if a transaction with a given hash on a network is in the queue or not.
   *
   * @param txHash The hash of a tx to check.
   * @returns true if the tx hash is in the queue, false otherwise.
   */
  isHashQueued(txNetwork: EVMNetwork, txHash: HexString): boolean {
    return this.transactionsToRetrieve.some(
      ({ hash, network }) =>
        hash === txHash && txNetwork.chainID === network.chainID
    )
  }

  /**
   * Removes a particular hash from our queue.
   *
   * @param network The network on which the transaction has been broadcast.
   * @param txHash The tx hash identifier of the transaction we want to retrieve.
   */
  remove(network: EVMNetwork, txHash: HexString): void {
    const seen = this.isHashQueued(network, txHash)

    if (seen) {
      // Let's clean up the tx queue if the hash is present.
      // The pending tx hash should be on chain as soon as it's broadcasted.
      this.transactionsToRetrieve = this.transactionsToRetrieve.filter(
        (queuedTx) => queuedTx.hash !== txHash
      )
    }
  }

  private async handleQueuedTransactionAlarm(): Promise<void> {
    if (
      !this.transactionToRetrieveGranularTimer &&
      this.transactionsToRetrieve.length
    ) {
      this.transactionToRetrieveGranularTimer = setInterval(() => {
        if (
          !this.transactionsToRetrieve.length &&
          this.transactionToRetrieveGranularTimer
        ) {
          // Clean up if we have a timer, but we don't have anything in the queue
          clearInterval(this.transactionToRetrieveGranularTimer)
          this.transactionToRetrieveGranularTimer = undefined
          return
        }

        // TODO: balance getting txs between networks
        const txToRetrieve = this.transactionsToRetrieve[0]
        this.remove(txToRetrieve.network, txToRetrieve.hash)

        this.emitter.emit("txToRetrieve", txToRetrieve)
      }, 2 * SECOND)
    }
  }
}
