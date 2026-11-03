import * as ethers from "ethers"
import type { Provider } from "@ethersproject/abstract-provider"
import _ from "lodash"
import {
  FungibleAsset,
  PricePoint,
  SmartContractFungibleAsset,
  UnitPricePoint,
} from "../assets"
import {
  ETHEREUM,
  POLYGON,
  USD,
  BINANCE_SMART_CHAIN,
  ARBITRUM_ONE,
  OPTIMISM,
  AVALANCHE,
  MEZO,
  MEZO_TESTNET,
  ROOTSTOCK,
  ZK_SYNC,
} from "../constants"
import { EVMNetwork } from "../networks"
import logger from "./logger"
import { sameEVMAddress } from "./utils"

/** How many token price calls to send at once. */
const PRICE_LOOKUPS_PER_ROUND = 10

const ONE_INCH_ORACLE_ADDRESS = "0x00000000000D6FFc74A8feb35aF5827bf57f6786"

/**
 * 1inch spot price aggregator deployments and the USDC each chain prices
 * against. Addresses are the current implementation listed at
 * https://github.com/1inch/spot-price-aggregator, checked on chain with
 * `eth_getCode` and sample prices.
 */
const TOKEN_PRICE_ORACLES: {
  [chainID: string]: {
    oracleAddress: string
    usdcAddress: string
    usdcDecimals: number
  }
} = {
  [ETHEREUM.chainID]: {
    oracleAddress: ONE_INCH_ORACLE_ADDRESS,
    usdcAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    usdcDecimals: 6,
  },
  [OPTIMISM.chainID]: {
    oracleAddress: ONE_INCH_ORACLE_ADDRESS,
    usdcAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    usdcDecimals: 6,
  },
  [BINANCE_SMART_CHAIN.chainID]: {
    oracleAddress: ONE_INCH_ORACLE_ADDRESS,
    usdcAddress: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    usdcDecimals: 18,
  },
  [POLYGON.chainID]: {
    oracleAddress: ONE_INCH_ORACLE_ADDRESS,
    usdcAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    usdcDecimals: 6,
  },
  [ARBITRUM_ONE.chainID]: {
    oracleAddress: ONE_INCH_ORACLE_ADDRESS,
    usdcAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    usdcDecimals: 6,
  },
  [AVALANCHE.chainID]: {
    oracleAddress: ONE_INCH_ORACLE_ADDRESS,
    usdcAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    usdcDecimals: 6,
  },
  // Base
  "8453": {
    oracleAddress: ONE_INCH_ORACLE_ADDRESS,
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    usdcDecimals: 6,
  },
  [ZK_SYNC.chainID]: {
    oracleAddress: "0x739B4e7a3ad8210B6315F75b24cfe0D3226f6945",
    usdcAddress: "0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4",
    usdcDecimals: 6,
  },
}

const ONE_INCH_ORACLE_INTERFACE = new ethers.utils.Interface([
  "function getRate(address srcToken, address dstToken, bool useWrappers) view returns (uint256 weightedRate)",
])

/** A provider that can read contracts. */
export type ContractReader = Pick<Provider, "call" | "getCode">

const contractCodeByProvider = new WeakMap<
  ContractReader,
  Map<string, Promise<boolean>>
>()

/**
 * Whether a contract is deployed at an address, remembered per provider.
 * Calling an address with no code fails with "missing revert data".
 */
export function hasContractCode(
  provider: ContractReader,
  address: string,
): Promise<boolean> {
  const known =
    contractCodeByProvider.get(provider) ?? new Map<string, Promise<boolean>>()
  contractCodeByProvider.set(provider, known)

  const key = address.toLowerCase()
  const cached = known.get(key)
  if (cached !== undefined) {
    return cached
  }

  const lookup = provider
    .getCode(address)
    .then((code) => code !== "0x" && code !== "0x0")
  known.set(key, lookup)
  // Forget failed lookups so the next call asks again.
  lookup.catch(() => known.delete(key))

  return lookup
}

/**
 * Chainlink USD feeds for each chain's base asset, and the chain each feed
 * lives on. BTC-based chains read Ethereum's BTC / USD feed. Addresses are
 * from https://docs.chain.link/data-feeds/price-feeds/addresses and were
 * checked on chain with `eth_getCode` and `description()`.
 */
export const BASE_ASSET_USD_FEEDS: {
  [chainID: string]: { feedNetwork: EVMNetwork; feedAddress: string }
} = {
  [ETHEREUM.chainID]: {
    feedNetwork: ETHEREUM,
    feedAddress: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // ETH / USD
  },
  [OPTIMISM.chainID]: {
    feedNetwork: OPTIMISM,
    feedAddress: "0x13e3Ee699D1909E989722E753853AE30b17e08c5", // ETH / USD
  },
  [ARBITRUM_ONE.chainID]: {
    feedNetwork: ARBITRUM_ONE,
    feedAddress: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612", // ETH / USD
  },
  [BINANCE_SMART_CHAIN.chainID]: {
    feedNetwork: BINANCE_SMART_CHAIN,
    feedAddress: "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE", // BNB / USD
  },
  [POLYGON.chainID]: {
    feedNetwork: POLYGON,
    feedAddress: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0", // MATIC / USD
  },
  [AVALANCHE.chainID]: {
    feedNetwork: AVALANCHE,
    feedAddress: "0x0A77230d17318075983913bC2145DB16C7366156", // AVAX / USD
  },
  ...Object.fromEntries(
    [ROOTSTOCK, MEZO, MEZO_TESTNET].map(({ chainID }) => [
      chainID,
      {
        feedNetwork: ETHEREUM,
        feedAddress: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c", // BTC / USD
      },
    ]),
  ),
}

export const CHAINLINK_AGGREGATOR_INTERFACE = new ethers.utils.Interface([
  "function decimals() view returns (uint8)",
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
])

/** Feeds update at least daily; anything older has stopped. */
const MAX_FEED_AGE_SECONDS = 26 * 60 * 60

/**
 * Reads the USD price of a network's base asset from its Chainlink feed.
 * Resolves to undefined when the network has no feed, the feed's chain has
 * no provider, or the feed is missing or stale.
 */
export async function getUSDPriceForBaseAsset(
  network: EVMNetwork,
  providerFor: (network: EVMNetwork) => ContractReader | undefined,
): Promise<PricePoint | undefined> {
  const feed = BASE_ASSET_USD_FEEDS[network.chainID]
  const provider = feed && providerFor(feed.feedNetwork)
  if (
    feed === undefined ||
    provider === undefined ||
    !(await hasContractCode(provider, feed.feedAddress))
  ) {
    return undefined
  }

  const read = async (functionName: string) =>
    CHAINLINK_AGGREGATOR_INTERFACE.decodeFunctionResult(
      functionName,
      await provider.call({
        to: feed.feedAddress,
        data: CHAINLINK_AGGREGATOR_INTERFACE.encodeFunctionData(functionName),
      }),
    )

  const [[feedDecimals], { answer, updatedAt }] = await Promise.all([
    read("decimals"),
    read("latestRoundData"),
  ])

  const price = BigInt(answer.toString())
  const ageSeconds = Date.now() / 1000 - Number(updatedAt.toString())
  if (price <= 0n || ageSeconds > MAX_FEED_AGE_SECONDS) {
    return undefined
  }

  const decimalShift = USD.decimals - Number(feedDecimals)
  const usdAmount =
    decimalShift >= 0
      ? price * 10n ** BigInt(decimalShift)
      : price / 10n ** BigInt(-decimalShift)

  return {
    pair: [USD, network.baseAsset],
    amounts: [usdAmount, 10n ** BigInt(network.baseAsset.decimals)],
    time: Date.now(),
  }
}

/**
 * Prices one token in USD. 1inch's rate is raw units of the token per raw
 * unit of USDC, scaled by 1e18. Resolves to undefined when there is no rate.
 */
async function getUSDPriceForToken(
  asset: SmartContractFungibleAsset,
  {
    oracleAddress,
    usdcAddress,
    usdcDecimals,
  }: (typeof TOKEN_PRICE_ORACLES)[string],
  provider: ContractReader,
): Promise<UnitPricePoint<FungibleAsset> | undefined> {
  const oneDollar = 10n ** BigInt(USD.decimals)

  if (sameEVMAddress(asset.contractAddress, usdcAddress)) {
    // The oracle won't rate USDC against itself.
    return { unitPrice: { asset: USD, amount: oneDollar }, time: Date.now() }
  }

  // Wrappers are skipped: following them costs tens of millions of gas per
  // call on Ethereum, past many RPCs' eth_call gas cap.
  const [rate] = ONE_INCH_ORACLE_INTERFACE.decodeFunctionResult(
    "getRate",
    await provider.call({
      to: oracleAddress,
      data: ONE_INCH_ORACLE_INTERFACE.encodeFunctionData("getRate", [
        usdcAddress,
        asset.contractAddress,
        false,
      ]),
    }),
  )
  const rawRate = BigInt(rate.toString())
  if (rawRate === 0n) {
    return undefined
  }

  return {
    unitPrice: {
      asset: USD,
      amount:
        (oneDollar * 10n ** 18n * 10n ** BigInt(asset.decimals)) /
        (rawRate * 10n ** BigInt(usdcDecimals)),
    },
    time: Date.now(),
  }
}

/**
 * Prices tokens in USD through the chain's 1inch oracle, skipping chains
 * without one and tokens it can't rate. Each token gets its own call, since
 * one rate can cost millions of gas and several in a multicall overrun the
 * RPC's gas cap.
 */
export async function getUSDPriceForTokens(
  assets: SmartContractFungibleAsset[],
  network: EVMNetwork,
  provider: ContractReader,
): Promise<{
  [contractAddress: string]: UnitPricePoint<FungibleAsset>
}> {
  const oracle = TOKEN_PRICE_ORACLES[network.chainID]
  if (
    oracle === undefined ||
    assets.length === 0 ||
    !(await hasContractCode(provider, oracle.oracleAddress))
  ) {
    return {}
  }

  const pricePoints: {
    [contractAddress: string]: UnitPricePoint<FungibleAsset>
  } = {}
  const failures: unknown[] = []

  for (const round of _.chunk(assets, PRICE_LOOKUPS_PER_ROUND)) {
    // oxlint-disable-next-line no-await-in-loop
    const results = await Promise.allSettled(
      round.map((asset) => getUSDPriceForToken(asset, oracle, provider)),
    )
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        failures.push(result.reason)
      } else if (result.value !== undefined) {
        pricePoints[round[i].contractAddress] = result.value
      }
    })
  }

  if (failures.length > 0) {
    logger.debug(
      "Couldn't price",
      failures.length,
      "of",
      assets.length,
      "tokens on chain",
      network.chainID,
      failures[0],
    )
  }

  return pricePoints
}
