import {
  BOAR_ALCHEMY_UNSUPPORTED_CHAIN_IDS,
  DEFAULT_NETWORKS_BY_CHAIN_ID,
  SECOND,
} from "../../constants"
import { BOAR_RPC_URLS } from "../../lib/boar"
import logger from "../../lib/logger"
import {
  ALCHEMY_CAPABILITY_NAMESPACE,
  EVMNetwork,
  RpcEndpoint,
  sameChainID,
} from "../../networks"
import type { ValidatedAddEthereumChainParameter } from "../provider-bridge/utils"
import type { ChainDatabase, RpcConfig } from "./db"
import { RpcEndpointValidationError } from "./errors"
import type ProviderRegistry from "./provider-registry"
import type { EndpointConfig } from "./rpc/endpoint"

// How long an endpoint being added gets to answer eth_chainId.
const RPC_PROBE_TIMEOUT = 5 * SECOND

export type NetworkMetadata = {
  chainName: string
  assetName: string
  symbol: string
  decimals: number
  iconUrl?: string
}

/**
 * The networks Taho knows about and the settings users can change on them:
 * custom chains, RPC endpoints, block explorers, and method-specific
 * endpoints. The only place network objects come from.
 */
export default class NetworkSettings {
  #supportedNetworks: EVMNetwork[] = []

  readonly #methodSpecificRpcConfigs = new Map<string, RpcConfig>()

  constructor(
    private readonly db: ChainDatabase,
    private readonly providerRegistry: () => ProviderRegistry,
    private readonly onSupportedNetworksChanged: (
      networks: EVMNetwork[],
    ) => void,
  ) {}

  supportedNetworks(): EVMNetwork[] {
    return this.#supportedNetworks
  }

  networkFor(chainID: string): EVMNetwork | undefined {
    return this.#supportedNetworks.find((network) =>
      sameChainID(network.chainID, chainID),
    )
  }

  async refreshSupportedNetworks(): Promise<void> {
    this.#supportedNetworks = await this.db.getAllEVMNetworks()
    this.onSupportedNetworksChanged(this.#supportedNetworks)
  }

  async loadMethodSpecificEndpoints(): Promise<void> {
    ;(await this.db.getAllCustomRpcUrls()).forEach((config) =>
      this.#methodSpecificRpcConfigs.set(config.chainID, config),
    )
  }

  methodSpecificRpcConfigFor(chainID: string): RpcConfig | undefined {
    return this.#methodSpecificRpcConfigs.get(chainID)
  }

  async setMethodSpecificEndpoints(
    chainID: string,
    rpcUrl: string,
    config: EndpointConfig,
  ): Promise<void> {
    await this.db.addCustomRpcUrl(chainID, rpcUrl, config.methods)
    this.#methodSpecificRpcConfigs.set(chainID, {
      chainID,
      rpcUrls: [rpcUrl],
      supportedMethods: config.methods ?? [],
    })
    this.providerRegistry()
      .providerFor(chainID)
      ?.setMethodSpecificEndpoints([config])
  }

  async clearMethodSpecificEndpoints(chainID: string): Promise<void> {
    await this.db.removeCustomRpcUrl(chainID)
    this.#methodSpecificRpcConfigs.delete(chainID)
    this.providerRegistry().providerFor(chainID)?.clearMethodSpecificEndpoints()
  }

  /** Adds a chain from wallet_addEthereumChain, or replaces a known one. */
  async addCustomChain(
    chainInfo: ValidatedAddEthereumChainParameter,
  ): Promise<EVMNetwork> {
    const network = await this.db.addEVMNetwork({
      chainName: chainInfo.chainName,
      chainID: chainInfo.chainId,
      decimals: chainInfo.nativeCurrency.decimals,
      symbol: chainInfo.nativeCurrency.symbol,
      assetName: chainInfo.nativeCurrency.name,
      rpcUrls: chainInfo.rpcUrls,
      blockExplorerURL: chainInfo.blockExplorerUrl,
      iconUrl: chainInfo.iconUrl,
    })
    await this.refreshSupportedNetworks()

    await this.providerRegistry().replaceProvider(
      chainInfo.chainId,
      chainInfo.rpcUrls.map((url) => ({ url })),
    )

    return network
  }

  async removeCustomChain(chainID: string): Promise<void> {
    await this.providerRegistry().removeProvider(chainID)
    await this.refreshSupportedNetworks()
  }

  /**
   * Replaces the stored RPC endpoint list for any known network and swaps in
   * a provider that uses it. Endpoints past the first are fallbacks.
   */
  async setRpcEndpoints(
    chainID: string,
    rpcEndpoints: RpcEndpoint[],
  ): Promise<void> {
    if (rpcEndpoints.length === 0) {
      throw new Error("At least one RPC endpoint is required")
    }

    const network = await this.db.getEVMNetworkByChainID(chainID)
    if (network === undefined) {
      throw new Error(`No network found for chain ID ${chainID}`)
    }

    await this.providerRegistry().updateEndpoints(chainID, rpcEndpoints)
  }

  async rpcEndpointsFor(chainID: string): Promise<RpcEndpoint[]> {
    return this.db.getRpcEndpointsByChainId(chainID)
  }

  /**
   * Updates the user-editable settings for any known network — the RPC
   * endpoint list, the block explorer URL, and, for custom networks only,
   * the identifying metadata (name, currency details, icon). The chain ID
   * and family are immutable for every network; metadata is immutable for
   * built-in networks. Like RPC endpoints, a stored block explorer URL
   * takes precedence over the hardcoded defaults from then on.
   */
  async updateSettings(
    chainID: string,
    {
      rpcEndpoints,
      blockExplorerUrl,
      metadata,
    }: {
      rpcEndpoints: RpcEndpoint[]
      blockExplorerUrl: string
      metadata?: NetworkMetadata
    },
  ): Promise<EVMNetwork> {
    if (metadata !== undefined && DEFAULT_NETWORKS_BY_CHAIN_ID.has(chainID)) {
      throw new Error(
        `Cannot edit metadata of built-in network with chain ID ${chainID}`,
      )
    }

    // Endpoints are probed, persisted, and applied to the provider here, and
    // only here; the metadata update below leaves them alone.
    await this.setRpcEndpoints(chainID, rpcEndpoints)

    if (metadata !== undefined) {
      await this.db.updateEVMNetwork({
        chainID,
        ...metadata,
        blockExplorerURL: blockExplorerUrl,
      })
    } else {
      await this.db.setBlockExplorerUrl(chainID, blockExplorerUrl)
    }

    await this.refreshSupportedNetworks()

    const updatedNetwork = this.networkFor(chainID)
    if (updatedNetwork === undefined) {
      throw new Error(`No network found for chain ID ${chainID}`)
    }
    return updatedNetwork
  }

  /**
   * The user-editable RPC endpoints for a chain, alongside any Taho-managed
   * endpoints (currently Boar) that also serve the chain but aren't part of
   * the stored list.
   */
  async rpcConfigFor(chainID: string): Promise<{
    rpcEndpoints: RpcEndpoint[]
    managedRpcEndpoints: RpcEndpoint[]
  }> {
    const rpcEndpoints = await this.db.getRpcEndpointsByChainId(chainID)

    const boarRpcUrl = BOAR_RPC_URLS[chainID]
    const managedRpcEndpoints =
      boarRpcUrl === undefined
        ? []
        : [
            {
              url: boarRpcUrl,
              capabilities: BOAR_ALCHEMY_UNSUPPORTED_CHAIN_IDS.has(chainID)
                ? []
                : [ALCHEMY_CAPABILITY_NAMESPACE],
            },
          ]

    return { rpcEndpoints, managedRpcEndpoints }
  }

  /**
   * Checks the endpoints that aren't already stored for the chain; one with a
   * transient outage shouldn't block an unrelated settings change.
   */
  async verifyNewEndpoints(
    chainID: string,
    rpcEndpoints: RpcEndpoint[],
    signal: AbortSignal,
  ): Promise<void> {
    const storedUrls = new Set(
      (await this.db.getRpcEndpointsByChainId(chainID).catch(() => [])).map(
        ({ url }) => url,
      ),
    )

    await Promise.all(
      rpcEndpoints
        .filter(({ url }) => !storedUrls.has(url))
        .map(({ url }) => verifyEndpoint(chainID, url, signal)),
    )
  }
}

/**
 * Checks that an http(s) endpoint answers eth_chainId with the expected
 * chain. WebSocket endpoints aren't checked. Throws an
 * {@link RpcEndpointValidationError} naming the URL otherwise.
 */
async function verifyEndpoint(
  chainID: string,
  url: string,
  signal: AbortSignal,
): Promise<void> {
  if (!/^https?:/.test(url)) {
    return
  }

  const abortController = new AbortController()
  // The timeout has to stay armed until the body has been read, not just
  // until the response headers arrive: `fetch` resolves as soon as the
  // headers land, and an endpoint that then trickles or stalls its body would
  // hang `response.json()` — and with it the settings save — for as long as
  // the socket stays open. Aborting the request aborts the body read too,
  // which surfaces below as an unreachable endpoint.
  const timeout = setTimeout(() => abortController.abort(), RPC_PROBE_TIMEOUT)
  const abort = () => abortController.abort()
  if (signal.aborted) {
    abort()
  }
  signal.addEventListener("abort", abort)

  let reportedChainID: string
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      }),
      signal: abortController.signal,
    })

    const { result } = await response.json()
    // JSON-RPC error responses carry no result; treat them — and any other
    // non-hex result — the same as an unreachable endpoint rather than
    // reporting a nonsense chain ID.
    if (typeof result !== "string" || Number.isNaN(parseInt(result, 16))) {
      throw new Error(`invalid eth_chainId result: ${result}`)
    }
    reportedChainID = String(parseInt(result, 16))
  } catch (error) {
    logger.debug("RPC endpoint probe failed for", url, error)
    throw new RpcEndpointValidationError({ kind: "unreachable", url })
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener("abort", abort)
  }

  if (!sameChainID(reportedChainID, chainID)) {
    throw new RpcEndpointValidationError({
      kind: "chain-mismatch",
      url,
      reportedChainID,
      expectedChainID: chainID,
    })
  }
}
