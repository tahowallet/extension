import { Actor, createActor, SimulatedClock } from "xstate"
import { MINUTE, SECOND } from "../../constants"
import getBlockPrices from "../../lib/gas"
import logger from "../../lib/logger"
import type { AddressOnNetwork } from "../../accounts"
import type {
  AnyEVMBlock,
  AnyEVMTransaction,
  BlockPrices,
  EVMNetwork,
} from "../../networks"
import { sameChainID, toDecimalChainID } from "../../networks"
import type { UNIXTime } from "../../types"
import type { ChainDatabase } from "./db"
import type { NetworkReachabilityState } from "./network-reachability"
import { networkWatchMachine } from "./network-watch-machine"
import type SerialFallbackProvider from "./serial-fallback-provider"
import { blockFromEthersBlock } from "./utils"

/** How long a network or address counts as in use after activity on it. */
export const ACTIVITY_TIMEOUT_MS = MINUTE * 2.05

/** How often to poll gas prices on a network in use. */
export const GAS_POLL_INTERVAL_MS = 15 * SECOND

export type NetworkWatcherDependencies = {
  db: ChainDatabase
  networkFor: (chainID: string) => EVMNetwork | undefined
  providerFor: (network: EVMNetwork) => SerialFallbackProvider
  emitBlock: (block: AnyEVMBlock) => void
  emitBlockPrices: (update: {
    blockPrices: BlockPrices
    network: EVMNetwork
  }) => void
  onPendingTransaction: (transaction: AnyEVMTransaction) => Promise<void>
  now?: () => number
  /** Simulated time for the watches' timers, for tests. */
  clock?: SimulatedClock
}

type NetworkWatch = Actor<typeof networkWatchMachine>

/**
 * Watches networks and the accounts on them: latest blocks, gas prices, and
 * pending transactions. One network watch actor per network decides when to
 * poll.
 */
export default class NetworkWatcher {
  readonly lastActivityOnNetwork: { [chainID: string]: UNIXTime } = {}

  readonly lastActivityOnAddress: { [address: string]: UNIXTime } = {}

  readonly #watches = new Map<string, NetworkWatch>()

  #accounts: { address: string; chainID: string }[] = []

  readonly #now: () => number

  constructor(private readonly dependencies: NetworkWatcherDependencies) {
    this.#now = dependencies.now ?? Date.now
  }

  /**
   * Starts polling a network's latest block and, while in use, gas. Resolves
   * once the first block poll is done, whether or not it succeeded.
   */
  watchNetwork(anyChainID: string): Promise<void> {
    const chainID = toDecimalChainID(anyChainID)
    if (this.#watches.has(chainID)) {
      return Promise.resolve()
    }

    let latestPoll = Promise.resolve()
    const watch = createActor(
      networkWatchMachine.provide({
        actions: {
          pollLatestBlock: () => {
            const network = this.dependencies.networkFor(chainID)
            if (network !== undefined) {
              latestPoll = this.pollLatestBlock(network).catch((error) =>
                logger.error(
                  "Error polling the latest block on",
                  chainID,
                  error,
                ),
              )
            }
          },
          pollGasPrices: () => {
            this.pollGasPrices(chainID).catch((error) =>
              logger.error("Error polling gas prices on", chainID, error),
            )
          },
        },
      }),
      {
        input: {
          chainID,
          gasPollIntervalMs: GAS_POLL_INTERVAL_MS,
          isIdle: (watchedChainID) => !this.isNetworkActive(watchedChainID),
        },
        ...(this.dependencies.clock === undefined
          ? {}
          : { clock: this.dependencies.clock }),
      },
    )
    this.#watches.set(chainID, watch)
    watch.start()
    watch.send({ type: "START_WATCHING" })
    return latestPoll
  }

  isWatching(chainID: string): boolean {
    return this.#watches.has(toDecimalChainID(chainID))
  }

  watchedChainIDs(): string[] {
    return [...this.#watches.keys()]
  }

  /** Where a network's watch stands, for tests and debugging. */
  watchStateOf(chainID: string): string | undefined {
    return this.#watches.get(toDecimalChainID(chainID))?.getSnapshot().value
  }

  stopWatchingNetwork(anyChainID: string): void {
    const chainID = toDecimalChainID(anyChainID)
    const watch = this.#watches.get(chainID)
    watch?.send({ type: "STOP_WATCHING" })
    watch?.stop()
    this.#watches.delete(chainID)
    this.#accounts = this.#accounts.filter(
      (account) => !sameChainID(account.chainID, chainID),
    )
  }

  /** Subscribes to an account's pending transactions on a network. */
  async watchAccount({ address, network }: AddressOnNetwork): Promise<void> {
    await this.subscribeToPendingTransactions({ address, network })
    this.#accounts.push({ address, chainID: network.chainID })
  }

  watchedAccounts(): { address: string; chainID: string }[] {
    return this.#accounts
  }

  markNetworkActivity(anyChainID: string): void {
    const chainID = toDecimalChainID(anyChainID)
    this.lastActivityOnNetwork[chainID] = this.#now()
    this.#watches.get(chainID)?.send({ type: "USER_ACTIVITY" })
  }

  markAddressActivity(address: string): void {
    this.lastActivityOnAddress[address] = this.#now()
  }

  /** Whether activity on the network has lapsed; never-used ones haven't. */
  isNetworkIdle(chainID: string): boolean {
    return (
      this.#now() - ACTIVITY_TIMEOUT_MS >
      this.lastActivityOnNetwork[toDecimalChainID(chainID)]
    )
  }

  /** Whether activity on the address has lapsed; never-used ones haven't. */
  isAddressIdle(address: string): boolean {
    return (
      this.#now() - ACTIVITY_TIMEOUT_MS > this.lastActivityOnAddress[address]
    )
  }

  isNetworkActive(chainID: string): boolean {
    return (
      this.#now() <
      this.lastActivityOnNetwork[toDecimalChainID(chainID)] +
        ACTIVITY_TIMEOUT_MS
    )
  }

  isAddressActive(address: string): boolean {
    return (
      this.#now() < this.lastActivityOnAddress[address] + ACTIVITY_TIMEOUT_MS
    )
  }

  reachabilityChanged(chainID: string, status: NetworkReachabilityState): void {
    this.#watches
      .get(toDecimalChainID(chainID))
      ?.send({ type: "REACHABILITY_CHANGED", status })
  }

  /**
   * Pending transaction subscriptions live on the provider, so they're made
   * again on a new one. Block and gas polls look the provider up each time
   * and only need a fresh read.
   */
  providerReplaced(chainID: string): void {
    const network = this.dependencies.networkFor(chainID)
    const watch = this.#watches.get(toDecimalChainID(chainID))
    if (network === undefined || watch === undefined) {
      return
    }

    watch.send({ type: "PROVIDER_REPLACED" })

    new Set(
      this.#accounts
        .filter((account) => sameChainID(account.chainID, chainID))
        .map(({ address }) => address),
    ).forEach((address) =>
      this.subscribeToPendingTransactions({ address, network }).catch((error) =>
        logger.error(
          `Error watching pending transactions on the new provider on chain ${chainID}`,
          error,
        ),
      ),
    )
  }

  /** Fetches, saves, and emits a network's latest block. */
  async pollLatestBlock(network: EVMNetwork): Promise<void> {
    const block = blockFromEthersBlock(
      network,
      await this.dependencies.providerFor(network).getBlock("latest"),
    )
    await this.dependencies.db.addBlock(block)
    this.dependencies.emitBlock(block)
  }

  /** Fetches and emits a watched network's gas prices, if it's in use. */
  async pollGasPrices(chainID: string): Promise<void> {
    if (!this.isNetworkActive(chainID)) {
      return
    }

    const network = this.#watches.has(toDecimalChainID(chainID))
      ? this.dependencies.networkFor(chainID)
      : undefined
    if (network === undefined) {
      logger.warn(
        `Can't fetch block prices for unsubscribed chainID ${chainID}`,
      )
      return
    }

    const blockPrices = await getBlockPrices(
      network,
      this.dependencies.providerFor(network),
    )
    this.dependencies.emitBlockPrices({ blockPrices, network })
  }

  private async subscribeToPendingTransactions({
    address,
    network,
  }: AddressOnNetwork): Promise<void> {
    await this.dependencies
      .providerFor(network)
      .onPendingTransaction({ address, network }, (transaction) =>
        this.dependencies.onPendingTransaction(transaction),
      )
  }
}
