import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers"
import { ARBITRUM_SEPOLIA, FLASHBOTS_RPC_URL, SECOND } from "../../../constants"
import { FeatureFlags, isEnabled } from "../../../features"
import { BOAR_RPC_URLS } from "../../../lib/boar"
import type { RpcEndpoint } from "../../../networks"
import type { RpcConfig } from "../db"
import TahoBoarProvider from "../taho-boar-provider"
import TahoRPCProvider from "../taho-rpc-provider"
import type { EndpointConfig } from "./endpoint"

// How long an endpoint gets to answer before the walk moves on.
const PROVIDER_REQUEST_TIMEOUT = 5 * SECOND

/** A transport for an RPC URL: a socket for ws(s), batched HTTP otherwise. */
export function createTransport(rpcUrl: string): JsonRpcProvider {
  const url = new URL(rpcUrl)
  if (/^wss?/.test(url.protocol)) {
    return new WebSocketProvider(rpcUrl)
  }
  return new TahoRPCProvider({
    url: rpcUrl,
    throttleLimit: 1,
    timeout: PROVIDER_REQUEST_TIMEOUT,
    fetchOptions: {
      credentials: "omit",
    },
  })
}

export function flashbotsEndpointConfig(): EndpointConfig {
  return {
    kind: "method-specific",
    url: FLASHBOTS_RPC_URL,
    methods: ["eth_sendRawTransaction"],
    createTransport: () =>
      new TahoRPCProvider(FLASHBOTS_RPC_URL, undefined, { maxBatchLength: 1 }),
  }
}

/** Everything outside the stored endpoints that decides a chain's endpoints. */
export type ProviderEnvironment = {
  /** The stored endpoints, in order. */
  rpcEndpoints: RpcEndpoint[]
  methodSpecificRpc?: RpcConfig
  /** Boar's URL for the chain, while Boar is around. */
  managedRpcUrl?: string
  /** Replaces every endpoint, for development against a fork. */
  forkRpcUrl?: string
}

/** Reads the environment a chain's provider is built for. */
export function providerEnvironmentFor(
  chainID: string,
  rpcEndpoints: RpcEndpoint[],
  methodSpecificRpc?: RpcConfig,
): ProviderEnvironment {
  if (isEnabled(FeatureFlags.USE_MAINNET_FORK)) {
    return { rpcEndpoints, forkRpcUrl: process.env.MAINNET_FORK_URL }
  }

  if (
    chainID === ARBITRUM_SEPOLIA.chainID &&
    process.env.ARBITRUM_FORK_RPC !== undefined &&
    process.env.ARBITRUM_FORK_RPC.trim() !== "" &&
    process.env.SUPPORT_THE_ISLAND_ON_TENDERLY === "true"
  ) {
    // oxlint-disable-next-line no-console
    console.log(
      "%c🦴 Using Tenderly fork as Arbitrum Sepolia provider",
      "background: #071111; color: #fff; font-weight: 900;",
    )
    return { rpcEndpoints, forkRpcUrl: process.env.ARBITRUM_FORK_RPC }
  }

  return {
    rpcEndpoints,
    methodSpecificRpc,
    managedRpcUrl: BOAR_RPC_URLS[chainID],
  }
}

/**
 * A chain's endpoints in walk order: the managed endpoint (Boar) leads, as
 * the network settings promise, with the stored endpoints behind it.
 * Method-specific endpoints sit outside the walk.
 */
export function endpointConfigsForChain(
  environment: ProviderEnvironment,
): EndpointConfig[] {
  const { forkRpcUrl, managedRpcUrl, rpcEndpoints, methodSpecificRpc } =
    environment

  if (forkRpcUrl !== undefined) {
    return [
      {
        kind: "standard",
        url: forkRpcUrl,
        createTransport: () => new TahoRPCProvider(forkRpcUrl),
      },
    ]
  }

  const managed: EndpointConfig[] =
    managedRpcUrl === undefined
      ? []
      : [
          {
            kind: "managed",
            url: managedRpcUrl,
            createTransport: () => new TahoBoarProvider(managedRpcUrl),
          },
        ]

  const standard: EndpointConfig[] = rpcEndpoints.map(
    ({ url, capabilities }) => ({
      kind: "standard",
      url,
      capabilities,
      createTransport: () => createTransport(url),
    }),
  )

  // URLs past the first act as fallbacks for the ones before them.
  const methodSpecific: EndpointConfig[] = (
    methodSpecificRpc?.rpcUrls ?? []
  ).map((url) => ({
    kind: "method-specific",
    url,
    methods: methodSpecificRpc?.supportedMethods ?? [],
    createTransport: () => createTransport(url),
  }))

  return [...managed, ...standard, ...methodSpecific]
}
