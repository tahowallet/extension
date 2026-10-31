import {
  ARBITRUM_ONE,
  BOAR_ALCHEMY_UNSUPPORTED_CHAIN_IDS,
  OPTIMISM,
} from "../../../constants"
import { ALCHEMY_CAPABILITY_NAMESPACE } from "../../../networks"

export type PoolName = "methodSpecific" | "managed" | "standard" | string

/**
 * Sends methods matching `methodPrefixes` (every method, when absent) to
 * `pool`, except those matching `excludedPrefixes`. If every endpoint in
 * `pool` fails, `fallbackPool` gets a turn.
 */
export type RouteRule = {
  methodPrefixes?: readonly string[]
  excludedPrefixes?: readonly string[]
  pool: PoolName
  fallbackPool?: PoolName
}

/**
 * Methods that go to the managed endpoint (Boar) rather than the walk. Names
 * can be prefixes, which covers namespaces like `alchemy_`.
 */
export const MANAGED_ENDPOINT_METHODS = {
  everyChain: [
    // Alchemy's enhanced APIs.
    ALCHEMY_CAPABILITY_NAMESPACE,
    // Broadcasts always go to Boar.
    "eth_sendRawTransaction",
    // Generic HTTP endpoints don't support it, but dapps need it.
    "eth_subscribe",
    // To be safe when setting up a transaction.
    "eth_estimateGas",
    // Avoids eth_getLogs block range limits.
    "eth_getLogs",
    // Prefer Boar for simulation where available.
    "eth_simulateV1",
  ],
  // Ankr has trouble with these, and Uniswap uses them heavily.
  [OPTIMISM.chainID]: ["eth_call"],
  [ARBITRUM_ONE.chainID]: ["eth_call"],
} as const satisfies Record<string, readonly string[]>

/** The methods pinned to the managed endpoint on `chainID`. */
export function managedEndpointMethods(chainID: string): string[] {
  const methods: string[] = [
    ...MANAGED_ENDPOINT_METHODS.everyChain,
    ...((
      MANAGED_ENDPOINT_METHODS as Record<string, readonly string[] | undefined>
    )[chainID] ?? []),
  ]

  return BOAR_ALCHEMY_UNSUPPORTED_CHAIN_IDS.has(chainID)
    ? methods.filter((method) => method !== ALCHEMY_CAPABILITY_NAMESPACE)
    : methods
}

const matchesAny = (method: string, prefixes: readonly string[]) =>
  prefixes.some((prefix) => method.startsWith(prefix))

export function capabilityPoolName(namespace: string): PoolName {
  return `capability:${namespace}`
}

/**
 * The routing rules for a chain, most specific first: method-specific
 * endpoints, then capability namespaces, then methods pinned to the managed
 * endpoint, then the standard walk.
 */
export function routeRulesFor({
  chainID,
  methodSpecificMethods,
  capabilityNamespaces,
  hasManagedEndpoint,
}: {
  chainID: string
  /** `undefined` when there are no method-specific endpoints; `[]` means all. */
  methodSpecificMethods: readonly string[] | undefined
  capabilityNamespaces: readonly string[]
  hasManagedEndpoint: boolean
}): RouteRule[] {
  const managedMethods = hasManagedEndpoint
    ? managedEndpointMethods(chainID)
    : []
  const rules: RouteRule[] = []

  if (methodSpecificMethods !== undefined) {
    rules.push({
      methodPrefixes:
        methodSpecificMethods.length > 0 ? methodSpecificMethods : undefined,
      // Alchemy methods have only ever been served by Alchemy-capable
      // endpoints.
      excludedPrefixes: [ALCHEMY_CAPABILITY_NAMESPACE],
      pool: "methodSpecific",
    })
  }

  capabilityNamespaces.forEach((namespace) => {
    rules.push({
      methodPrefixes: [namespace],
      pool: capabilityPoolName(namespace),
      fallbackPool: matchesAny(namespace, managedMethods)
        ? "managed"
        : undefined,
    })
  })

  if (managedMethods.length > 0) {
    rules.push({ methodPrefixes: managedMethods, pool: "managed" })
  }

  rules.push({ pool: "standard" })

  return rules
}

/** The first rule matching `method`; the last rule should match everything. */
export function ruleForMethod(
  rules: readonly RouteRule[],
  method: string,
): RouteRule {
  const rule = rules.find(
    ({ methodPrefixes, excludedPrefixes = [] }) =>
      (methodPrefixes === undefined || matchesAny(method, methodPrefixes)) &&
      !matchesAny(method, excludedPrefixes),
  )

  if (rule === undefined) {
    throw new Error(`No route for ${method}`)
  }

  return rule
}
