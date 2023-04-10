import * as ethers from "ethers"
import { Fragment, FunctionFragment } from "ethers/lib/utils"
import {
  AnyAsset,
  FungibleAsset,
  PricePoint,
  SmartContractFungibleAsset,
  UnitPricePoint,
} from "../assets"
import {
  ETH,
  ETHEREUM,
  POLYGON,
  USD,
  BNB,
  MATIC,
  BINANCE_SMART_CHAIN,
  ARBITRUM_ONE,
  ARBITRUM_ONE_ETH,
  OPTIMISM,
  OPTIMISTIC_ETH,
  AVALANCHE,
  AVAX,
} from "../constants"
import {
  MULTICALL_ABI,
  MULTICALL_CONTRACT_ADDRESS,
  AggregateContractResponse,
} from "./multicall"
import { toFixedPoint } from "./fixed-point"
import SerialFallbackProvider from "../services/chain/serial-fallback-provider"
import { EVMNetwork } from "../networks"

const SPOT_PRICE_ORACLE_CONSTANTS = {
  [ETHEREUM.chainID]: {
    USDCAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    USDCDecimals: 6,
    oracleAddress: "0x07D91f5fb9Bf7798734C3f606dB065549F6893bb",
    baseAsset: ETH,
  },
  [POLYGON.chainID]: {
    USDCAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    USDCDecimals: 6,
    oracleAddress: "0x7F069df72b7A39bCE9806e3AfaF579E54D8CF2b9",
    baseAsset: MATIC,
  },
  [BINANCE_SMART_CHAIN.chainID]: {
    USDCAddress: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    USDCDecimals: 18, // lol
    oracleAddress: "0xfbD61B037C325b959c0F6A7e69D8f37770C2c550",
    baseAsset: BNB,
  },
  [OPTIMISM.chainID]: {
    USDCAddress: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    USDCDecimals: 6,
    oracleAddress: "0x11DEE30E710B8d4a8630392781Cc3c0046365d4c",
    baseAsset: OPTIMISTIC_ETH,
  },
  [ARBITRUM_ONE.chainID]: {
    USDCAddress: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    USDCDecimals: 6,
    oracleAddress: "0x735247fb0a604c0adC6cab38ACE16D0DbA31295F",
    baseAsset: ARBITRUM_ONE_ETH,
  },
  [AVALANCHE.chainID]: {
    USDCAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    USDCDecimals: 6,
    oracleAddress: "0xBd0c7AaF0bF082712EbE919a9dD94b2d978f79A9",
    baseAsset: AVAX,
  },
}

const PRICE_ORACLE_FUNCTIONS = {
  getRate: FunctionFragment.from(
    "getRate(address srcToken, address dstToken, bool useWrappers) external view returns (uint256 weightedRate)"
  ),
  getRateToEth: FunctionFragment.from(
    "getRateToEth(address srcToken, bool useSrcWrappers) external view returns (uint256 weightedRate)"
  ),
}

const PRICE_ORACLE_ABI = Object.values<Fragment>(PRICE_ORACLE_FUNCTIONS)

const PRICE_ORACLE_INTERFACE = new ethers.utils.Interface(PRICE_ORACLE_ABI)

export const toUSDPricePoint = (
  asset: AnyAsset,
  coinPrice: number
): PricePoint => {
  const assetPrecision = "decimals" in asset ? asset.decimals : 0

  return {
    pair: [USD, asset],
    amounts: [
      toFixedPoint(coinPrice, USD.decimals),
      10n ** BigInt(assetPrecision),
    ],
    time: Date.now(),
  }
}

export async function getUSDPriceForBaseAsset(
  network: EVMNetwork,
  provider: SerialFallbackProvider
): Promise<PricePoint> {
  const offChainOracleContract = new ethers.Contract(
    SPOT_PRICE_ORACLE_CONSTANTS[network.chainID].oracleAddress,
    PRICE_ORACLE_ABI,
    provider
  )

  const rate = await offChainOracleContract.callStatic.getRateToEth(
    SPOT_PRICE_ORACLE_CONSTANTS[network.chainID].USDCAddress,
    true
  )

  const numerator = ethers.BigNumber.from(10).pow(
    SPOT_PRICE_ORACLE_CONSTANTS[network.chainID].USDCDecimals
  )
  const denominator = ethers.BigNumber.from(10).pow(network.baseAsset.decimals)
  const BaseAssetPerUSD = denominator
    // Convert to cents
    .mul(100)
    .div(ethers.BigNumber.from(rate).mul(numerator).div(denominator))

  const USDPriceOfBaseAsset = Number(BaseAssetPerUSD) / 100

  return toUSDPricePoint(network.baseAsset, USDPriceOfBaseAsset)
}

export async function getUSDPriceForTokens(
  assets: SmartContractFungibleAsset[],
  network: EVMNetwork,
  provider: SerialFallbackProvider
): Promise<{
  [contractAddress: string]: UnitPricePoint<FungibleAsset>
}> {
  const multicall = new ethers.Contract(
    MULTICALL_CONTRACT_ADDRESS,
    MULTICALL_ABI,
    provider
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
    })
  )) as AggregateContractResponse

  const pricePoints: {
    [contractAddress: string]: UnitPricePoint<FungibleAsset>
  } = {}

  response.returnData.forEach((data, i) => {
    if (assets[i].symbol === "USDC") {
      // Oracle won't let us query USDC/USDC, get around this by hardcoding the price
      pricePoints[assets[i].contractAddress] = {
        unitPrice: {
          asset: USD,
          amount: BigInt(10 ** USD.decimals),
        },
        time: Date.now(),
      }
      return
    }
    if (data.success !== true) {
      return
    }

    if (ethers.BigNumber.from(data.returnData).isZero()) {
      return
    }

    const rate = ethers.BigNumber.from(data.returnData)

    const numerator = ethers.BigNumber.from(10).pow(
      SPOT_PRICE_ORACLE_CONSTANTS[network.chainID].USDCDecimals
    )
    // Tokens with no decimals will have a denominator of 0,
    // which will cause a divide by zero error, so we set it to 1
    const denominator = assets[i].decimals
      ? ethers.BigNumber.from(10).pow(assets[i].decimals)
      : ethers.BigNumber.from(1)

    const tokenPerUSDC = denominator
      // Convert to cents
      .mul(100)
      .div(ethers.BigNumber.from(rate).mul(numerator).div(denominator))

    const USDPriceOfToken = Number(tokenPerUSDC) / 100

    pricePoints[assets[i].contractAddress] = {
      unitPrice: {
        asset: USD,
        amount: BigInt(Math.trunc(USDPriceOfToken * 10 ** USD.decimals)),
      },
      time: Date.now(),
    }
  })

  return pricePoints
}
