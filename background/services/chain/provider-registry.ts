import { Actor, createActor } from "xstate"
import type { RpcEndpoint } from "../../networks"
import type SerialFallbackProvider from "./serial-fallback-provider"
import type { NetworkReachabilityState } from "./network-reachability"
import { ChainDependencies, chainMachine } from "./chain-machine"
import logger from "../../lib/logger"

export type ProviderReplacedListener = (replacement: {
  chainID: string
  provider: SerialFallbackProvider
  previousProvider: SerialFallbackProvider | undefined
}) => void

type ChainActor = Actor<typeof chainMachine>

/**
 * The one place that creates, replaces, and destroys providers, through one
 * chain actor per chain.
 */
export default class ProviderRegistry {
  #chains = new Map<string, ChainActor>()

  #replacedListeners = new Set<ProviderReplacedListener>()

  constructor(
    private readonly dependencies: ChainDependencies & {
      onReachabilityChange: (
        chainID: string,
        status: NetworkReachabilityState,
      ) => void
    },
  ) {}

  /** Builds a provider for a chain that doesn't have one yet. */
  start(chainID: string, endpoints: RpcEndpoint[]): void {
    if (this.#chains.has(chainID)) {
      return
    }

    const actor = createActor(chainMachine, {
      input: { chainID, endpoints, dependencies: this.dependencies },
    })

    actor.on("providerReplaced", (replacement) =>
      this.#replacedListeners.forEach((listener) => {
        try {
          listener(replacement)
        } catch (error) {
          logger.error("Error handling a replaced provider", chainID, error)
        }
      }),
    )
    actor.on("reachabilityChanged", ({ status }) =>
      this.dependencies.onReachabilityChange(chainID, status),
    )
    actor.on("removed", () => {
      if (this.#chains.get(chainID) === actor) {
        this.#chains.delete(chainID)
      }
    })

    this.#chains.set(chainID, actor)
    actor.start()
  }

  providerFor(chainID: string): SerialFallbackProvider | undefined {
    return this.#chains.get(chainID)?.getSnapshot().context.provider
  }

  requireProviderFor(chainID: string): SerialFallbackProvider {
    const provider = this.providerFor(chainID)
    if (provider === undefined) {
      throw new Error(`No provider for chain ${chainID}`)
    }
    return provider
  }

  /** Every live provider, by chain ID. */
  providersByChainID(): { [chainID: string]: SerialFallbackProvider } {
    return Object.fromEntries(
      [...this.#chains.keys()].flatMap((chainID) => {
        const provider = this.providerFor(chainID)
        return provider === undefined ? [] : [[chainID, provider]]
      }),
    )
  }

  /**
   * Checks the endpoints that aren't already saved, saves the list, and
   * swaps in a provider built from it. Resolves once the new provider is
   * live, and rejects without saving anything if a check fails.
   */
  async updateEndpoints(
    chainID: string,
    endpoints: RpcEndpoint[],
  ): Promise<void> {
    if (!this.#chains.has(chainID)) {
      await this.dependencies.verifyEndpoints(
        chainID,
        endpoints,
        new AbortController().signal,
      )
      await this.dependencies.saveEndpoints(chainID, endpoints)
      await this.replaceProvider(chainID, endpoints)
      return
    }

    await this.#sendUpdate(chainID, endpoints, true)
  }

  /** Swaps in a provider for endpoints that are already saved. */
  replaceProvider(chainID: string, endpoints: RpcEndpoint[]): Promise<void> {
    if (!this.#chains.has(chainID)) {
      this.start(chainID, endpoints)
      this.dependencies.onReachabilityChange(chainID, "reachable")
      return Promise.resolve()
    }

    return this.#sendUpdate(chainID, endpoints, false)
  }

  /** Destroys a chain's provider and deletes the chain's stored rows. */
  removeProvider(chainID: string): Promise<void> {
    const actor = this.#chains.get(chainID)
    if (actor === undefined) {
      return this.dependencies.removeChain(chainID)
    }

    return new Promise((resolve, reject) =>
      actor.send({ type: "REMOVE_CHAIN", reply: { resolve, reject } }),
    )
  }

  onProviderReplaced(listener: ProviderReplacedListener): () => void {
    this.#replacedListeners.add(listener)
    return () => this.#replacedListeners.delete(listener)
  }

  #sendUpdate(
    chainID: string,
    endpoints: RpcEndpoint[],
    verifyAndSave: boolean,
  ): Promise<void> {
    const actor = this.#chains.get(chainID)
    if (actor === undefined) {
      return Promise.reject(new Error(`No provider for chain ${chainID}`))
    }

    return new Promise((resolve, reject) =>
      actor.send({
        type: "UPDATE_ENDPOINTS",
        endpoints,
        verifyAndSave,
        reply: { resolve, reject },
      }),
    )
  }
}
