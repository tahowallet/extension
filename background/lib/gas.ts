import { Provider } from "@ethersproject/abstract-provider"

import logger from "./logger"
import Blocknative, {
  BlocknativeNetworkIds,
} from "../third-party-data/blocknative"
import { BlockPrices, EVMNetwork } from "../networks"
import { ETHEREUM } from "../constants/networks"

// We can't use destructuring because webpack has to replace all instances of
// `process.env` variables in the bundled output
const BLOCKNATIVE_API_KEY = process.env.BLOCKNATIVE_API_KEY // eslint-disable-line prefer-destructuring

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

  // otherwise, we're going it alone!

  const [currentBlock, feeData] = await Promise.all([
    provider.getBlock("latest"),
    provider.getFeeData(),
  ])
  const baseFeePerGas = currentBlock?.baseFeePerGas?.toBigInt()

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
          maxPriorityFeePerGas: 2500000000n,
          maxFeePerGas: baseFeePerGas * 2n + 2500000000n,
          price: gasPrice, // this estimate isn't great
        },
        {
          confidence: 95,
          maxPriorityFeePerGas: 1500000000n,
          maxFeePerGas: (baseFeePerGas * 15n) / 10n + 1500000000n,
          price: (gasPrice * 9n) / 10n,
        },
        {
          confidence: 70,
          maxPriorityFeePerGas: 2500000000n,
          maxFeePerGas: (baseFeePerGas * 13n) / 10n + 1100000000n,
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
