import { BrowserContext, Route } from "@playwright/test"
import { utils } from "ethers"
import {
  MULTICALL_ABI,
  MULTICALL_CONTRACT_ADDRESS,
} from "../../background/lib/multicall"

/**
 * The network the specs that use this run on. Everything else the wallet
 * probes is answered generically.
 */
export const ETHEREUM_CHAIN_ID = 1

export const TOKEN_COUNT = 50

const TAHO_TOKEN_LIST_URL = "https://tokens.taho.xyz/tokens.json"

/** The nth fixture token's address: distinct, valid, and easy to read. */
export const tokenAddress = (index: number): string =>
  `0x${(index + 1).toString(16).padStart(40, "0")}`

export const TOKEN_ADDRESSES = Array.from({ length: TOKEN_COUNT }, (_, index) =>
  tokenAddress(index),
)

const tokenSymbol = (index: number): string =>
  `TT${String(index).padStart(2, "0")}`

const tokenListFixture = {
  name: "Taho e2e test list",
  timestamp: "2024-01-01T00:00:00.000Z",
  version: { major: 1, minor: 0, patch: 0 },
  tokens: TOKEN_ADDRESSES.map((address, index) => ({
    chainId: ETHEREUM_CHAIN_ID,
    address,
    name: `Test Token ${index}`,
    symbol: tokenSymbol(index),
    decimals: 18,
  })),
}

/** Every other list the wallet fetches by default; they hold no tokens here. */
const OTHER_TOKEN_LIST_URLS = new Set([
  "https://tokens.uniswap.org/",
  "https://wrapped.tokensoft.eth.limo/",
  "https://tokenlist.aave.eth.limo/",
  "https://raw.githubusercontent.com/compound-finance/token-list/master/compound.tokenlist.json",
  "https://static.optimism.io/optimism.tokenlist.json",
  "https://bridge.arbitrum.io/token-list-42161.json",
  "https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/1722d8c47a728a64c8dca8ac160b32cf39c5e671/mc.tokenlist.json",
  "https://tokens.pancakeswap.finance/pancakeswap-default.json",
])

const emptyTokenListFixture = {
  ...tokenListFixture,
  name: "Empty e2e test list",
  tokens: [],
}

/** The symbol a fixture token shows with in the wallet. */
export const symbolOf = (address: string): string =>
  tokenSymbol(TOKEN_ADDRESSES.indexOf(address))

/**
 * The chain behind each RPC host the wallet may talk to. Hosts missing here
 * are treated as unhandled traffic.
 */
const CHAIN_ID_BY_RPC_HOST: { [host: string]: number } = {
  "ethereum-mainnet.boar.network": 1,
  "eth.drpc.org": 1,
  "ethereum-rpc.publicnode.com": 1,
  "optimism-mainnet.boar.network": 10,
  "mainnet.optimism.io": 10,
  "optimism.drpc.org": 10,
  "optimism-rpc.publicnode.com": 10,
  "polygon-mainnet.boar.network": 137,
  "polygon.drpc.org": 137,
  "polygon-bor-rpc.publicnode.com": 137,
  "arbitrum-mainnet.boar.network": 42161,
  "arb1.arbitrum.io": 42161,
  "arbitrum.drpc.org": 42161,
  "arbitrum-one-rpc.publicnode.com": 42161,
  "ethereum-sepolia.boar.network": 11155111,
  "ethereum-sepolia-rpc.publicnode.com": 11155111,
  "ethereum-sepolia-public.nodies.app": 11155111,
  "sepolia-rollup.arbitrum.io": 421614,
  "arbitrum-sepolia-rpc.publicnode.com": 421614,
  "public-node.rsk.co": 30,
  "mycrypto.rsk.co": 30,
  "rpc.test.mezo.org": 31611,
  "mezo-testnet.drpc.org": 31611,
  "rpc-http.mezo.boar.network": 31612,
  "mainnet.mezo.public.validationcloud.io": 31612,
  "mezo.drpc.org": 31612,
  "avalanche.drpc.org": 43114,
  "avalanche-c-chain-rpc.publicnode.com": 43114,
  "api.avax.network": 43114,
  "bsc.drpc.org": 56,
  "bsc-dataseed.binance.org": 56,
  "bsc-rpc.publicnode.com": 56,
  "nova.arbitrum.io": 42170,
  "arbitrum-nova-rpc.publicnode.com": 42170,
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
}

const MULTICALL_INTERFACE = new utils.Interface(MULTICALL_ABI)
const ERC20_INTERFACE = new utils.Interface([
  "function balanceOf(address) view returns (uint256)",
])

const BALANCE_OF_SELECTOR = ERC20_INTERFACE.getSighash("balanceOf")

const ENS_REGISTRY = "0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e"
const ENS_RESOLVER_SELECTOR = "0x0178b8bf"

/** Methods that ask the node for token data it is deliberately lacking. */
const UNSUPPORTED_METHODS = new Set([
  "alchemy_getTokenBalances",
  "alchemy_getTokenMetadata",
  "alchemy_getAssetTransfers",
])

/** One Multicall3 request, decoded. */
export type Multicall = {
  chainID: number
  method: string
  holder: string
  /** The tokens whose `balanceOf` was asked. */
  tokens: string[]
}

type RpcRequest = { id: unknown; method: string; params?: unknown[] }

const hex = (value: number | bigint): string => `0x${value.toString(16)}`

/**
 * Stands in for every server the wallet talks to: JSON-RPC nodes, token
 * lists and the odd API. Answers are scripted from the test, and anything it
 * does not recognize is recorded in {@link unhandled}, which specs assert is
 * empty.
 *
 * It answers from the route handler, not from a child process like the fake
 * RPC server, which exists to be pointed at by a URL typed into the settings.
 * Here the wallet's own endpoints are intercepted, and decoding calls and
 * logging them in the test process avoids a round trip to read them back.
 */
export default class FakeChain {
  /** Every Multicall3 balance lookup so far, in arrival order. */
  readonly multicalls: Multicall[] = []

  /** Requests nothing was scripted for. */
  readonly unhandled: string[] = []

  /** Nonzero token balances, by lowercase token address. */
  readonly #balances = new Map<string, bigint>()

  /** Counts every RPC method by chain, for debugging. */
  readonly methodCounts: { [key: string]: number } = {}

  private constructor() {}

  static async install(context: BrowserContext): Promise<FakeChain> {
    const chain = new FakeChain()
    await context.route(/^https?:\/\//, (route) => chain.#handle(route))
    return chain
  }

  setTokenBalance(token: string, amount: bigint): void {
    if (amount === 0n) {
      this.#balances.delete(token.toLowerCase())
    } else {
      this.#balances.set(token.toLowerCase(), amount)
    }
  }

  /** Multicalls since `fromIndex` on Ethereum. */
  multicallsSince(fromIndex: number): Multicall[] {
    return this.multicalls
      .slice(fromIndex)
      .filter(({ chainID }) => chainID === ETHEREUM_CHAIN_ID)
  }

  async #handle(route: Route): Promise<void> {
    const request = route.request()
    const url = new URL(request.url())
    const respond = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        headers: CORS_HEADERS,
        contentType: "application/json",
        body: JSON.stringify(body),
      })

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS_HEADERS })
      return
    }

    if (url.hostname === "app.posthog.com") {
      await respond({ status: 1 })
      return
    }

    if (request.url() === TAHO_TOKEN_LIST_URL) {
      await respond(tokenListFixture)
      return
    }

    if (OTHER_TOKEN_LIST_URLS.has(request.url())) {
      await respond(emptyTokenListFixture)
      return
    }

    if (url.hostname === "api.poap.tech") {
      await respond([])
      return
    }

    // Data for unrelated features, which the wallet copes without.
    if (url.hostname === "ipfs.io" || url.hostname === "portal.api.mezo.org") {
      await respond({}, 404)
      return
    }

    const chainID = CHAIN_ID_BY_RPC_HOST[url.hostname]
    if (request.method() === "POST" && chainID !== undefined) {
      const body = JSON.parse(request.postData() ?? "null") as
        | RpcRequest
        | RpcRequest[]
      const answers = Array.isArray(body)
        ? body.map((single) => this.#answer(chainID, single))
        : this.#answer(chainID, body)

      await respond(answers)
      return
    }

    this.unhandled.push(`${request.method()} ${request.url()}`)
    await respond({ error: "unhandled in test" }, 500)
  }

  #answer(chainID: number, { id, method, params = [] }: RpcRequest): unknown {
    const key = `${chainID} ${method}`
    this.methodCounts[key] = (this.methodCounts[key] ?? 0) + 1

    const result = (value: unknown) => ({ jsonrpc: "2.0", id, result: value })
    const failure = (message: string) => ({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message },
    })

    if (UNSUPPORTED_METHODS.has(method)) {
      return failure(`unsupported in test: ${method}`)
    }

    switch (method) {
      case "eth_chainId":
        return result(hex(chainID))
      case "net_version":
        return result(String(chainID))
      case "eth_blockNumber":
        return result(hex(1_000_000))
      case "eth_getBlockByNumber":
        return result(fakeBlock())
      case "eth_getBalance":
        return result(hex(10n ** 18n))
      case "eth_getCode":
        return result("0x")
      case "eth_getLogs":
        return result([])
      case "eth_getTransactionCount":
        return result("0x0")
      case "eth_gasPrice":
      case "eth_maxPriorityFeePerGas":
        return result(hex(1_000_000_000))
      case "eth_estimateGas":
        return result(hex(21_000))
      case "eth_feeHistory":
        return result({
          oldestBlock: hex(999_999),
          baseFeePerGas: [hex(1_000_000_000), hex(1_000_000_000)],
          gasUsedRatio: [0.5],
          reward: [[hex(1_000_000_000)]],
        })
      case "eth_call": {
        const [call] = params as [{ to?: string; data?: string }]
        const answered = this.#answerCall(chainID, call)
        return answered === undefined
          ? this.#unhandledMethod(
              id,
              `${method} ${call.to} ${call.data?.slice(0, 10)}`,
            )
          : result(answered)
      }
      default:
        return this.#unhandledMethod(id, method)
    }
  }

  #unhandledMethod(id: unknown, what: string) {
    this.unhandled.push(`rpc ${what}`)
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `unhandled in test: ${what}` },
    }
  }

  #answerCall(
    chainID: number,
    { to, data }: { to?: string; data?: string },
  ): string | undefined {
    // The ENS registry, asked for the account's name; nobody has one.
    if (
      to?.toLowerCase() === ENS_REGISTRY &&
      data?.startsWith(ENS_RESOLVER_SELECTOR)
    ) {
      return `0x${"00".repeat(32)}`
    }

    if (
      to?.toLowerCase() !== MULTICALL_CONTRACT_ADDRESS.toLowerCase() ||
      data === undefined
    ) {
      return undefined
    }

    const parsed = MULTICALL_INTERFACE.parseTransaction({ data })
    const rawCalls = (
      parsed.name.startsWith("tryAggregate") ||
      parsed.name.startsWith("tryBlockAndAggregate")
        ? parsed.args[1]
        : parsed.args[0]
    ) as { target: string; callData: string }[]

    if (
      !rawCalls.every(({ callData }) =>
        callData.startsWith(BALANCE_OF_SELECTOR),
      )
    ) {
      return undefined
    }

    const holders = new Set(
      rawCalls.map(
        ({ callData }) =>
          ERC20_INTERFACE.decodeFunctionData(
            "balanceOf",
            callData,
          )[0] as string,
      ),
    )
    this.multicalls.push({
      chainID,
      method: parsed.name,
      holder: [...holders][0].toLowerCase(),
      tokens: rawCalls.map(({ target }) => target.toLowerCase()),
    })

    const returnData = rawCalls.map(({ target }) => ({
      success: true,
      returnData: ERC20_INTERFACE.encodeFunctionResult("balanceOf", [
        this.#balances.get(target.toLowerCase()) ?? 0n,
      ]),
    }))

    switch (parsed.name) {
      case "tryBlockAndAggregate":
      case "blockAndAggregate":
        return MULTICALL_INTERFACE.encodeFunctionResult(parsed.name, [
          1_000_000,
          `0x${"11".repeat(32)}`,
          returnData,
        ])
      case "tryAggregate":
      case "aggregate3":
        return MULTICALL_INTERFACE.encodeFunctionResult(parsed.name, [
          returnData,
        ])
      case "aggregate":
        return MULTICALL_INTERFACE.encodeFunctionResult(parsed.name, [
          1_000_000,
          returnData.map(({ returnData: value }) => value),
        ])
      default:
        return undefined
    }
  }
}

const fakeBlock = () => ({
  number: hex(1_000_000),
  hash: `0x${"11".repeat(32)}`,
  parentHash: `0x${"00".repeat(32)}`,
  nonce: "0x0000000000000000",
  sha3Uncles: `0x${"00".repeat(32)}`,
  logsBloom: `0x${"00".repeat(256)}`,
  transactionsRoot: `0x${"00".repeat(32)}`,
  stateRoot: `0x${"00".repeat(32)}`,
  receiptsRoot: `0x${"00".repeat(32)}`,
  miner: `0x${"00".repeat(20)}`,
  difficulty: "0x0",
  totalDifficulty: "0x0",
  extraData: "0x",
  size: "0x1",
  gasLimit: hex(30_000_000),
  gasUsed: "0x0",
  timestamp: hex(Math.floor(Date.now() / 1000)),
  baseFeePerGas: hex(1_000_000_000),
  transactions: [],
  uncles: [],
})
