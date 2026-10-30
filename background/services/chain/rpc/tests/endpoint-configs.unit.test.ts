import { describe, expect, it } from "bun:test"
import { WebSocketProvider } from "@ethersproject/providers"
import {
  createTransport,
  endpointConfigsForChain,
  flashbotsEndpointConfig,
  ProviderEnvironment,
} from "../endpoint-configs"
import TahoBoarProvider from "../../taho-boar-provider"
import TahoRPCProvider from "../../taho-rpc-provider"

const describeConfigs = (environment: ProviderEnvironment) =>
  endpointConfigsForChain(environment).map(
    ({ kind, url, capabilities, methods }) => ({
      kind,
      url,
      ...(capabilities === undefined ? {} : { capabilities }),
      ...(methods === undefined ? {} : { methods }),
    }),
  )

describe("endpointConfigsForChain", () => {
  it.each<[string, ProviderEnvironment, ReturnType<typeof describeConfigs>]>([
    [
      "stored endpoints alone",
      {
        rpcEndpoints: [
          { url: "https://a.example" },
          { url: "https://b.example" },
        ],
      },
      [
        { kind: "standard", url: "https://a.example" },
        { kind: "standard", url: "https://b.example" },
      ],
    ],
    [
      "the managed endpoint ahead of the stored ones",
      {
        rpcEndpoints: [
          { url: "https://a.example", capabilities: ["alchemy_"] },
        ],
        managedRpcUrl: "https://boar.example",
      },
      [
        { kind: "managed", url: "https://boar.example" },
        {
          kind: "standard",
          url: "https://a.example",
          capabilities: ["alchemy_"],
        },
      ],
    ],
    [
      "method-specific endpoints after the walk",
      {
        rpcEndpoints: [{ url: "https://a.example" }],
        managedRpcUrl: "https://boar.example",
        methodSpecificRpc: {
          chainID: "1",
          rpcUrls: ["https://rpc.flashbots.net", "https://fallback.example"],
          supportedMethods: ["eth_sendRawTransaction"],
        },
      },
      [
        { kind: "managed", url: "https://boar.example" },
        { kind: "standard", url: "https://a.example" },
        {
          kind: "method-specific",
          url: "https://rpc.flashbots.net",
          methods: ["eth_sendRawTransaction"],
        },
        {
          kind: "method-specific",
          url: "https://fallback.example",
          methods: ["eth_sendRawTransaction"],
        },
      ],
    ],
    [
      "method-specific endpoints that serve every method",
      {
        rpcEndpoints: [{ url: "https://a.example" }],
        methodSpecificRpc: { chainID: "1", rpcUrls: ["https://c.example"] },
      },
      [
        { kind: "standard", url: "https://a.example" },
        { kind: "method-specific", url: "https://c.example", methods: [] },
      ],
    ],
    [
      "only the fork, when there is one",
      {
        rpcEndpoints: [{ url: "https://a.example" }],
        managedRpcUrl: "https://boar.example",
        forkRpcUrl: "http://localhost:8545",
      },
      [{ kind: "standard", url: "http://localhost:8545" }],
    ],
  ])("lists %s", (_, environment, expected) => {
    expect(describeConfigs(environment)).toEqual(expected)
  })

  it("builds Boar's transport for the managed endpoint", () => {
    const [managed] = endpointConfigsForChain({
      rpcEndpoints: [],
      managedRpcUrl: "https://boar.example",
    })

    expect(managed.createTransport()).toBeInstanceOf(TahoBoarProvider)
  })
})

describe("createTransport", () => {
  it("batches HTTP and opens sockets for ws URLs", () => {
    expect(createTransport("https://a.example")).toBeInstanceOf(TahoRPCProvider)
    const socket = createTransport("ws://localhost:1")
    expect(socket).toBeInstanceOf(WebSocketProvider)
    ;(socket as WebSocketProvider).destroy().catch(() => undefined)
  })
})

describe("flashbotsEndpointConfig", () => {
  it("sends only raw transactions, one per batch", () => {
    const config = flashbotsEndpointConfig()

    expect(config).toMatchObject({
      kind: "method-specific",
      methods: ["eth_sendRawTransaction"],
    })
    expect(
      (config.createTransport() as TahoRPCProvider).getOptions().maxBatchLength,
    ).toBe(1)
  })
})
