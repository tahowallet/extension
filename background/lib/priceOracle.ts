import * as ethers from "ethers"
import { Fragment, FunctionFragment } from "ethers/lib/utils"
import type { JsonRpcProvider } from "@ethersproject/providers"
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
} from "../constants"
import {
  MULTICALL_ABI,
  MULTICALL_CONTRACT_ADDRESS,
  AggregateContractResponse,
} from "./multicall"
import { EVMNetwork } from "../networks"
import logger, { logRejectedAndReturnFulfilledResults } from "./logger"
import { FeatureFlags, isEnabled } from "../features"

// The size of a batch of on-chain price lookups. Too high and the request will
// fail due to running out of gas, as eth_call is still subject to gas limits.
// Too low and we will make additional unnecessary RPC requests.
//
// Some public RPCS (such as ankr) have stricter limits on gas for eth_calls
// for now, this size appears to work fine
const BATCH_SIZE = isEnabled(FeatureFlags.USE_MAINNET_FORK) ? 2 : 4

// Oracle Documentation and Address references can be found
// at https://docs.1inch.io/docs/spot-price-aggregator/introduction/
const SPOT_PRICE_ORACLE_CONSTANTS = {
  [ETHEREUM.chainID]: {
    USDCAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    USDCDecimals: 6,
    oracleAddress: "0x07D91f5fb9Bf7798734C3f606dB065549F6893bb",
  },
  [POLYGON.chainID]: {
    USDCAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    USDCDecimals: 6,
    oracleAddress: "0x7F069df72b7A39bCE9806e3AfaF579E54D8CF2b9",
  },
  [BINANCE_SMART_CHAIN.chainID]: {
    USDCAddress: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    USDCDecimals: 18, // lol
    oracleAddress: "0xfbD61B037C325b959c0F6A7e69D8f37770C2c550",
  },
  [OPTIMISM.chainID]: {
    USDCAddress: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    USDCDecimals: 6,
    oracleAddress: "0x11DEE30E710B8d4a8630392781Cc3c0046365d4c",
  },
  [ARBITRUM_ONE.chainID]: {
    USDCAddress: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    USDCDecimals: 6,
    oracleAddress: "0x735247fb0a604c0adC6cab38ACE16D0DbA31295F",
  },
  [AVALANCHE.chainID]: {
    USDCAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    USDCDecimals: 6,
    oracleAddress: "0xBd0c7AaF0bF082712EbE919a9dD94b2d978f79A9",
  },
}

const PRICE_ORACLE_FUNCTIONS = {
  getRate: FunctionFragment.from(
    "getRate(address srcToken, address dstToken, bool useWrappers) external view returns (uint256 weightedRate)",
  ),
  getRateToEth: FunctionFragment.from(
    "getRateToEth(address srcToken, bool useSrcWrappers) external view returns (uint256 weightedRate)",
  ),
}

const PRICE_ORACLE_ABI = Object.values<Fragment>(PRICE_ORACLE_FUNCTIONS)

const PRICE_ORACLE_INTERFACE = new ethers.utils.Interface(PRICE_ORACLE_ABI)

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
const BASE_ASSET_USD_FEEDS: {
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

const CHAINLINK_AGGREGATOR_INTERFACE = new ethers.utils.Interface([
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

const getRatesForTokens = async (
  assets: SmartContractFungibleAsset[],
  provider: JsonRpcProvider,
  network: EVMNetwork,
): Promise<
  {
    asset: SmartContractFungibleAsset
    response: {
      success: boolean
      returnData: string
    }
  }[]
> => {
  if (SPOT_PRICE_ORACLE_CONSTANTS[network.chainID] === undefined) {
    return []
  }

  const multicall = new ethers.Contract(
    MULTICALL_CONTRACT_ADDRESS,
    MULTICALL_ABI,
    provider,
  )

  const response = (await multicall.callStatic.tryBlockAndAggregate(
    // false === don't require all calls to succeed
    false,
    assets.map((asset) => {
      const callData = PRICE_ORACLE_INTERFACE.encodeFunctionData("getRate", [
        SPOT_PRICE_ORACLE_CONSTANTS[network.chainID].USDCAddress,
        asset.contractAddress,
        true,
      ])
      return [
        SPOT_PRICE_ORACLE_CONSTANTS[network.chainID].oracleAddress,
        callData,
      ]
    }),
  )) as AggregateContractResponse

  return response.returnData.map((data, i) => ({
    asset: assets[i],
    response: data,
  }))
}

const getTokenPriceFromRate = (
  rate: ethers.ethers.BigNumber,
  asset: SmartContractFungibleAsset,
  network: EVMNetwork,
) => {
  const numerator = ethers.BigNumber.from(10).pow(
    SPOT_PRICE_ORACLE_CONSTANTS[network.chainID].USDCDecimals,
  )
  // Tokens with no decimals will have a denominator of 0,
  // which will cause a divide by zero error, so we set it to 1
  const denominator = asset.decimals
    ? ethers.BigNumber.from(10).pow(asset.decimals)
    : ethers.BigNumber.from(1)

  const tokenPerUSDC = denominator
    // Convert to cents
    .mul(100)
    .div(ethers.BigNumber.from(rate).mul(numerator).div(denominator))

  return Number(tokenPerUSDC) / 100
}

export async function getUSDPriceForTokens(
  assets: SmartContractFungibleAsset[],
  network: EVMNetwork,
  provider: JsonRpcProvider,
): Promise<{
  [contractAddress: string]: UnitPricePoint<FungibleAsset>
}> {
  if (assets.length > BATCH_SIZE) {
    const batches = _.range(0, assets.length / BATCH_SIZE).map((batch) =>
      assets.slice(batch * BATCH_SIZE, batch * BATCH_SIZE + BATCH_SIZE),
    )
    logger.debug(
      "Batching assets price lookup by length",
      assets.length,
      BATCH_SIZE,
      batches,
    )
    // Batch assets when we get to BATCH_SIZE so we're not trying to construct
    // megatransactions with 10s and 100s of assets that blow up RPC nodes.
    return logRejectedAndReturnFulfilledResults(
      "Some batch asset price lookups failed",
      await Promise.allSettled(
        batches.map((subAssets) =>
          getUSDPriceForTokens(subAssets, network, provider),
        ),
      ),
      batches,
    ).reduce(
      (allPrices, pricesSubset) => ({ ...allPrices, ...pricesSubset }),
      {},
    )
  }

  const tokenRates = await getRatesForTokens(assets, provider, network)

  const pricePoints: {
    [contractAddress: string]: UnitPricePoint<FungibleAsset>
  } = {}

  tokenRates.forEach(({ asset, response }) => {
    if (asset.symbol === "USDC") {
      // Oracle won't let us query USDC/USDC, get around this by hardcoding the price
      pricePoints[asset.contractAddress] = {
        unitPrice: {
          asset: USD,
          amount: BigInt(10 ** USD.decimals),
        },
        time: Date.now(),
      }
      return
    }
    // FIXME: If a lookup fails, retry?
    if (
      !response.success ||
      ethers.BigNumber.from(response.returnData).isZero()
    ) {
      // Don't add price point if we don't have a valid response or if rate is zero
      return
    }

    const USDPriceOfToken = getTokenPriceFromRate(
      ethers.BigNumber.from(response.returnData),
      asset,
      network,
    )

    pricePoints[asset.contractAddress] = {
      unitPrice: {
        asset: USD,
        amount: BigInt(Math.trunc(USDPriceOfToken * 10 ** USD.decimals)),
      },
      time: Date.now(),
    }
  })

  return pricePoints
}
