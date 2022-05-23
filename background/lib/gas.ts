import { Provider } from "@ethersproject/abstract-provider"
import { fetchJson } from "@ethersproject/web"

import logger from "./logger"
import Blocknative, {
  BlocknativeNetworkIds,
} from "../third-party-data/blocknative"
import { BlockPrices, EVMNetwork } from "../networks"
import { ETHEREUM, POLYGON } from "../constants/networks"
import { gweiToWei } from "./utils"

// We can't use destructuring because webpack has to replace all instances of
// `process.env` variables in the bundled output
const BLOCKNATIVE_API_KEY = process.env.BLOCKNATIVE_API_KEY // eslint-disable-line prefer-destructuring

type PolygonFeeDetails = {
  maxPriorityFee: number // gwei
  maxFee: number // gwei
}

type PolygonGasResponse = {
  safeLow: PolygonFeeDetails
  standard: PolygonFeeDetails
  fast: PolygonFeeDetails
  estimatedBaseFee: number // gwei
  blockTime: number
  blockNumber: number
}

// Not perfect but works most of the time.  Our fallback method does not work at all for polygon.
// This is because the baseFeePerGas on polygon can be so small (oftentimes sub 100 wei (not gwei)) that
// estimating maxFeePerGas as a function of baseFeePerGas almost always results in a "transaction underpriced"
// being returned from alchemy because our maxFeePerGas is below its acceptance threshhold.
const getPolygonGasPrices = async (price: bigint): Promise<BlockPrices> => {
  // @TODO Validate this response using ajv
  const gasEstimates = (await fetchJson(
    "https://gasstation-mainnet.matic.network/v2"
  )) as PolygonGasResponse

  const baseFeePerGas = BigInt(Math.ceil(gasEstimates.estimatedBaseFee * 1e9))

  return {
    network: POLYGON,
    blockNumber: gasEstimates.blockNumber,
    baseFeePerGas,
    estimatedTransactionCount: null,
    estimatedPrices: [
      {
        confidence: 99,
        maxPriorityFeePerGas: gweiToWei(
          Math.ceil(gasEstimates.fast.maxPriorityFee)
        ),
        maxFeePerGas: gweiToWei(Math.ceil(gasEstimates.fast.maxFee)),
        price, // this estimate isn't great
      },
      {
        confidence: 95,
        maxPriorityFeePerGas: gweiToWei(
          Math.ceil(gasEstimates.standard.maxPriorityFee)
        ),
        maxFeePerGas: gweiToWei(Math.ceil(gasEstimates.standard.maxFee)),
        price,
      },
      {
        confidence: 70,
        maxPriorityFeePerGas: gweiToWei(
          Math.ceil(gasEstimates.safeLow.maxPriorityFee)
        ),
        maxFeePerGas: gweiToWei(Math.ceil(gasEstimates.safeLow.maxFee)),
        price,
      },
    ],
    dataSource: "local",
  }
}

export default async function getBlockPrices(
  network: EVMNetwork,
  provider: Provider
): Promise<BlockPrices> {
  // if BlockNative is configured and we're on mainnet, prefer their gas service
  if (
    typeof BLOCKNATIVE_API_KEY !== "undefined" &&
    network.chainID === ETHEREUM.chainID
  ) {
    try {
      const blocknative = Blocknative.connect(
        BLOCKNATIVE_API_KEY,
        BlocknativeNetworkIds.ethereum.mainnet
      )
      return await blocknative.getBlockPrices()
    } catch (err) {
      logger.error("Error getting block prices from BlockNative", err)
    }
  }

  const [currentBlock, feeData] = await Promise.all([
    provider.getBlock("latest"),
    provider.getFeeData(),
  ])

  const baseFeePerGas = currentBlock?.baseFeePerGas?.toBigInt()

  if (network.chainID === POLYGON.chainID) {
    try {
      return await getPolygonGasPrices(
        feeData?.gasPrice?.toBigInt() ??
          0n /* @TODO what do we do if this is 0n */
      )
    } catch (e) {
      logger.error("Error getting block prices from Polygon", e)
    }
  }

  // otherwise, we're going it alone!

  if (feeData.gasPrice === null) {
    logger.warn("Not receiving accurate gas prices from provider", feeData)
  }

  const gasPrice = feeData?.gasPrice?.toBigInt() || 0n

  if (baseFeePerGas) {
    return {
      network,
      blockNumber: currentBlock.number,
      baseFeePerGas,
      estimatedTransactionCount: null,
      estimatedPrices: [
        {
          confidence: 99,
          maxPriorityFeePerGas: 2_500_000_000n,
          maxFeePerGas: baseFeePerGas * 2n + 2_500_000_000n,
          price: gasPrice, // this estimate isn't great
        },
        {
          confidence: 95,
          maxPriorityFeePerGas: 1_500_000_000n,
          maxFeePerGas: (baseFeePerGas * 15n) / 10n + 1_500_000_000n,
          price: (gasPrice * 9n) / 10n,
        },
        {
          confidence: 70,
          maxPriorityFeePerGas: 1_100_000_000n,
          maxFeePerGas: (baseFeePerGas * 13n) / 10n + 1_100_000_000n,
          price: (gasPrice * 8n) / 10n,
        },
      ],
      dataSource: "local",
    }
  }

  if (feeData.maxPriorityFeePerGas === null || feeData.maxFeePerGas === null) {
    logger.warn(
      "Not receiving accurate EIP-1559 gas prices from provider",
      feeData
    )
  }

  const maxFeePerGas = feeData?.maxFeePerGas?.toBigInt() || 0n
  const maxPriorityFeePerGas = feeData?.maxPriorityFeePerGas?.toBigInt() || 0n

  return {
    network,
    blockNumber: currentBlock.number,
    baseFeePerGas: (maxFeePerGas - maxPriorityFeePerGas) / 2n,
    estimatedTransactionCount: null,
    estimatedPrices: [
      {
        confidence: 99,
        maxPriorityFeePerGas,
        maxFeePerGas,
        price: gasPrice,
      },
    ],
    dataSource: "local",
  }
}
