import { describe, expect, it } from "bun:test"
import {
  ARBITRUM_ONE,
  ETHEREUM,
  MEZO,
  OPTIMISM,
  POLYGON,
} from "../../../../constants"
import {
  managedEndpointMethods,
  routeRulesFor,
  ruleForMethod,
} from "../method-router"

const route = (
  method: string,
  options: Partial<Parameters<typeof routeRulesFor>[0]> = {},
) => {
  const rule = ruleForMethod(
    routeRulesFor({
      chainID: ETHEREUM.chainID,
      methodSpecificMethods: undefined,
      capabilityNamespaces: [],
      hasManagedEndpoint: false,
      ...options,
    }),
    method,
  )
  return { pool: rule.pool, fallbackPool: rule.fallbackPool }
}

const everything = {
  methodSpecificMethods: ["eth_sendRawTransaction"],
  capabilityNamespaces: ["alchemy_", "qn_"],
  hasManagedEndpoint: true,
}

describe("routing precedence", () => {
  it.each([
    // Method-specific endpoints beat everything for their methods.
    ["eth_sendRawTransaction", everything, "methodSpecific", undefined],
    // Capability namespaces come next, falling back to the managed endpoint
    // only for namespaces it serves.
    ["alchemy_getTokenBalances", everything, "capability:alchemy_", "managed"],
    ["qn_getTokenMetadata", everything, "capability:qn_", undefined],
    // Then methods pinned to the managed endpoint.
    ["eth_getLogs", everything, "managed", undefined],
    ["eth_estimateGas", everything, "managed", undefined],
    ["eth_subscribe", everything, "managed", undefined],
    // Everything else walks.
    ["eth_call", everything, "standard", undefined],
    ["eth_getBalance", everything, "standard", undefined],
    // Without a managed endpoint, nothing is pinned.
    ["eth_sendRawTransaction", {}, "standard", undefined],
    ["eth_getLogs", {}, "standard", undefined],
    ["alchemy_getTokenBalances", {}, "standard", undefined],
    [
      "alchemy_getTokenBalances",
      { capabilityNamespaces: ["alchemy_"] },
      "capability:alchemy_",
      undefined,
    ],
    // Without capability endpoints, alchemy_ goes to the managed endpoint.
    [
      "alchemy_getTokenBalances",
      { hasManagedEndpoint: true },
      "managed",
      undefined,
    ],
  ])("routes %s with %p to %s", (method, options, pool, fallbackPool) => {
    expect(route(method, options)).toEqual({ pool, fallbackPool })
  })

  it("sends every method but alchemy_ to method-specific endpoints that list none", () => {
    const options = { ...everything, methodSpecificMethods: [] }

    expect(route("eth_getBalance", options).pool).toBe("methodSpecific")
    expect(route("eth_getLogs", options).pool).toBe("methodSpecific")
    expect(route("alchemy_getAssetTransfers", options).pool).toBe(
      "capability:alchemy_",
    )
    expect(
      route("alchemy_getAssetTransfers", { methodSpecificMethods: [] }).pool,
    ).toBe("standard")
  })

  it("matches method names by prefix", () => {
    const options = { ...everything, methodSpecificMethods: ["eth_send"] }

    expect(route("eth_sendRawTransaction", options).pool).toBe("methodSpecific")
    expect(route("eth_sendTransaction", options).pool).toBe("methodSpecific")
  })
})

describe("managed endpoint rules", () => {
  it.each([
    [OPTIMISM.chainID, "eth_call", "managed"],
    [ARBITRUM_ONE.chainID, "eth_call", "managed"],
    [ETHEREUM.chainID, "eth_call", "standard"],
    [POLYGON.chainID, "eth_call", "standard"],
    [MEZO.chainID, "eth_getLogs", "managed"],
    // Boar doesn't serve Alchemy's APIs on Mezo.
    [MEZO.chainID, "alchemy_getTokenBalances", "standard"],
    [POLYGON.chainID, "alchemy_getTokenBalances", "managed"],
  ])("on chain %s routes %s to %s", (chainID, method, pool) => {
    expect(route(method, { chainID, hasManagedEndpoint: true }).pool).toBe(pool)
  })

  it("does not fall back to the managed endpoint for alchemy_ on Mezo", () => {
    expect(
      route("alchemy_getTokenBalances", {
        chainID: MEZO.chainID,
        hasManagedEndpoint: true,
        capabilityNamespaces: ["alchemy_"],
      }),
    ).toEqual({ pool: "capability:alchemy_", fallbackPool: undefined })
  })

  it("lists the chain-specific methods along with the common ones", () => {
    expect(managedEndpointMethods(OPTIMISM.chainID)).toEqual([
      "alchemy_",
      "eth_sendRawTransaction",
      "eth_subscribe",
      "eth_estimateGas",
      "eth_getLogs",
      "eth_simulateV1",
      "eth_call",
    ])
    expect(managedEndpointMethods(MEZO.chainID)).not.toContain("alchemy_")
  })
})

describe("ruleForMethod", () => {
  it("throws when no rule matches", () => {
    expect(() =>
      ruleForMethod(
        [{ methodPrefixes: ["eth_"], pool: "standard" }],
        "net_version",
      ),
    ).toThrow("No route for net_version")
  })
})
