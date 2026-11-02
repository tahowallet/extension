import { CHAINS_WITH_MEMPOOL } from "../../constants"
import logger from "../../lib/logger"
import { normalizeEVMAddress } from "../../lib/utils"
import type {
  AnyEVMTransaction,
  EIP1559TransactionRequest,
  EVMNetwork,
  SignedTransaction,
  TransactionRequest,
  TransactionRequestWithNonce,
} from "../../networks"
import type SerialFallbackProvider from "./serial-fallback-provider"

/**
 * Hands out nonces for outgoing transactions. On chains with a mempool, it
 * keeps the highest nonce it has allocated or seen per address, so pending
 * transactions don't get their nonce reused.
 */
export default class NonceAllocator {
  /**
   * The highest nonce allocated or seen, by chain then normalized address.
   * Neither it nor any nonce before it should be allocated again, unless the
   * intent is to replace an unconfirmed transaction.
   */
  readonly highestKnownNonce: {
    [chainID: string]: { [normalizedAddress: string]: number }
  } = {}

  constructor(
    private readonly providerFor: (
      network: EVMNetwork,
    ) => SerialFallbackProvider,
  ) {}

  /**
   * Fills in the request's nonce, unless it already has one. On chains with
   * a mempool, the nonce is one past the highest known one, so it should not
   * collide with pending transactions.
   */
  async allocateNonce(
    transactionRequest: TransactionRequest,
  ): Promise<TransactionRequestWithNonce> {
    if (typeof transactionRequest.nonce !== "undefined") {
      // TS undefined checks don't narrow the containing object's type, so we
      // have to cast `as` here.
      return transactionRequest as EIP1559TransactionRequest & { nonce: number }
    }

    const { network, chainID } = transactionRequest
    const normalizedAddress = normalizeEVMAddress(transactionRequest.from)
    const provider = this.providerFor(network)

    const chainTransactionCount = await provider.getTransactionCount(
      transactionRequest.from,
      "latest",
    )
    let knownNextNonce

    // Only chains with a mempool can have pending nonces the chain doesn't
    // count yet. This does not necessarily mean the chain is EIP-1559
    // compliant.
    if (CHAINS_WITH_MEMPOOL.has(chainID)) {
      // @TODO: Update this implementation to handle pending txs and also be more
      //        resilient against missing nonce in the mempool.
      const chainNonce = chainTransactionCount - 1

      const existingNonce =
        this.highestKnownNonce[chainID]?.[normalizedAddress] ?? chainNonce

      this.highestKnownNonce[chainID] ??= {}
      // Use the network count, if needed. Note that the assumption here is that
      // all nonces for this address are increasing linearly and continuously; if
      // the address has a pending transaction floating around with a nonce that
      // is not an increase by one over previous transactions, this approach will
      // allocate more nonces that won't mine.
      this.highestKnownNonce[chainID][normalizedAddress] = Math.max(
        existingNonce,
        chainNonce,
      )

      this.highestKnownNonce[chainID][normalizedAddress] += 1
      knownNextNonce = this.highestKnownNonce[chainID][normalizedAddress]

      logger.debug(
        "Got chain nonce",
        chainNonce,
        "existing nonce",
        existingNonce,
        "using",
        knownNextNonce,
      )
    }

    return {
      ...transactionRequest,
      nonce: knownNextNonce ?? chainTransactionCount,
    }
  }

  /**
   * Makes a nonce available again. Releasing a nonce below the highest known
   * one releases every nonce in between, too.
   */
  releaseNonce(
    transactionRequest:
      | TransactionRequestWithNonce
      | SignedTransaction
      | AnyEVMTransaction,
  ): void {
    const chainID =
      "chainID" in transactionRequest
        ? transactionRequest.chainID
        : transactionRequest.network.chainID
    if (!CHAINS_WITH_MEMPOOL.has(chainID)) {
      return
    }

    const { nonce } = transactionRequest
    const normalizedAddress = normalizeEVMAddress(transactionRequest.from)
    const highestKnown = this.highestKnownNonce[chainID]?.[normalizedAddress]

    if (!highestKnown) {
      return
    }

    // TODO Currently this assumes that the only place this nonce could have
    // TODO been used is this service; however, another wallet or service
    // TODO could have broadcast a transaction with this same nonce, in which
    // TODO case the nonce release shouldn't take effect! This should be a
    // TODO relatively rare edge case, but we should handle it at some point.
    if (nonce === highestKnown) {
      this.highestKnownNonce[chainID][normalizedAddress] -= 1
    } else if (nonce < highestKnown) {
      // Releasing a nonce below the highest one releases everything after
      // it. That risks replacing transactions, but otherwise every nonce
      // allocated from here on would wait behind one that will never be
      // broadcast.
      this.highestKnownNonce[chainID][normalizedAddress] = nonce - 1
    }
  }

  /**
   * Raises the highest known nonce to a pending transaction's, if the
   * address is being tracked. This keeps transactions sent from outside
   * Taho from having their nonces reused.
   */
  observeNonce(transaction: AnyEVMTransaction): void {
    const { chainID } = transaction.network
    const normalizedFromAddress = normalizeEVMAddress(transaction.from)
    const highestKnown =
      this.highestKnownNonce[chainID]?.[normalizedFromAddress]

    if (
      typeof chainID !== "undefined" &&
      typeof highestKnown !== "undefined" &&
      highestKnown <= transaction.nonce
    ) {
      this.highestKnownNonce[chainID][normalizedFromAddress] = transaction.nonce
    }
  }
}
