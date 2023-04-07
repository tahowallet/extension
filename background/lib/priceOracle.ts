import * as ethers from "ethers"
import { AnyAsset, PricePoint } from "../assets"
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

// eslint-disable-next-line max-len
const OffChainOracleAbi =
  '[{"inputs":[{"internalType":"contract MultiWrapper","name":"_multiWrapper","type":"address"},{"internalType":"contract IOracle[]","name":"existingOracles","type":"address[]"},{"internalType":"enum OffchainOracle.OracleType[]","name":"oracleTypes","type":"uint8[]"},{"internalType":"contract IERC20[]","name":"existingConnectors","type":"address[]"},{"internalType":"contract IERC20","name":"wBase","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"contract IERC20","name":"connector","type":"address"}],"name":"ConnectorAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"contract IERC20","name":"connector","type":"address"}],"name":"ConnectorRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"contract MultiWrapper","name":"multiWrapper","type":"address"}],"name":"MultiWrapperUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"contract IOracle","name":"oracle","type":"address"},{"indexed":false,"internalType":"enum OffchainOracle.OracleType","name":"oracleType","type":"uint8"}],"name":"OracleAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"contract IOracle","name":"oracle","type":"address"},{"indexed":false,"internalType":"enum OffchainOracle.OracleType","name":"oracleType","type":"uint8"}],"name":"OracleRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"inputs":[{"internalType":"contract IERC20","name":"connector","type":"address"}],"name":"addConnector","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IOracle","name":"oracle","type":"address"},{"internalType":"enum OffchainOracle.OracleType","name":"oracleKind","type":"uint8"}],"name":"addOracle","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"connectors","outputs":[{"internalType":"contract IERC20[]","name":"allConnectors","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"contract IERC20","name":"srcToken","type":"address"},{"internalType":"contract IERC20","name":"dstToken","type":"address"},{"internalType":"bool","name":"useWrappers","type":"bool"}],"name":"getRate","outputs":[{"internalType":"uint256","name":"weightedRate","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"contract IERC20","name":"srcToken","type":"address"},{"internalType":"bool","name":"useSrcWrappers","type":"bool"}],"name":"getRateToEth","outputs":[{"internalType":"uint256","name":"weightedRate","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"multiWrapper","outputs":[{"internalType":"contract MultiWrapper","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"oracles","outputs":[{"internalType":"contract IOracle[]","name":"allOracles","type":"address[]"},{"internalType":"enum OffchainOracle.OracleType[]","name":"oracleTypes","type":"uint8[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"contract IERC20","name":"connector","type":"address"}],"name":"removeConnector","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IOracle","name":"oracle","type":"address"},{"internalType":"enum OffchainOracle.OracleType","name":"oracleKind","type":"uint8"}],"name":"removeOracle","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract MultiWrapper","name":"_multiWrapper","type":"address"}],"name":"setMultiWrapper","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}]'
const offChainOracleAddress = "0x07D91f5fb9Bf7798734C3f606dB065549F6893bb"
const offChainOracleContract = new ethers.Contract(
  offChainOracleAddress,
  JSON.parse(OffChainOracleAbi)
)

export const foo = 1

// TODO Better Method Name
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
  const connected = offChainOracleContract.connect(provider)

  const [rate] = await connected.functions.getRateToEth(
    SPOT_PRICE_ORACLE_CONSTANTS[network.chainID].USDCAddress,
    true
  )

  const numerator = ethers.BigNumber.from(10).pow(
    SPOT_PRICE_ORACLE_CONSTANTS[network.chainID].USDCDecimals
  )
  const denominator = ethers.BigNumber.from(10).pow(18) // eth decimals
  const ETHperUSDC = denominator
    // Convert to cents
    .mul(100)
    .div(ethers.BigNumber.from(rate).mul(numerator).div(denominator))

  const USDPriceOfBaseAsset = Number(ETHperUSDC) / 100

  return toUSDPricePoint(ETH, USDPriceOfBaseAsset)
}
