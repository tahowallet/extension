import { fetchJson } from "@ethersproject/web"
import BlocknativeSdk from "bnc-sdk"

import { BlockPrices, BlockEstimate } from "../../networks"
import { EthereumTransactionData } from "./types"
import { gweiToWei } from "../../lib/utils"
import { ETHEREUM } from "../../constants/networks"
import logger from "../../lib/logger"

const BLOCKNATIVE_API_ROOT = "https://api.blocknative.com"

export const BlocknativeNetworkIds = {
  ethereum: {
    mainnet: 1,
  },
}

// TODO Improve code to clearly discriminate between Bitcoin and
// TODO Ethereum---either top-level or inside the instance.

/**
 * The Blocknative class wraps access to the Blocknative API for the Taho
 * extension backend. It exposes Taho-specific functionality, and manages
 * connection and disconnection from Blocknative based on registered needs and
 * feedback from the Blocknative system to minimize usage when possible.
 */
export default class Blocknative {
  private blocknative: BlocknativeSdk

  private apiKey: string

  static connect(apiKey: string, networkId: number): Blocknative {
    const connection = new this(apiKey, networkId)

    return connection
  }

  private constructor(apiKey: string, networkId: number) {
    // TODO Handle lazy connection, disconnects, resubscribing, rate limits,
    // TODO etc.
    this.blocknative = new BlocknativeSdk({
      dappId: apiKey,
      networkId,
      onopen() {
        logger.debug("Connected to blocknative")
      },
      onclose() {
        logger.warn("Blocknative connection closed")
      },
      // https://docs.blocknative.com/notify-sdk#ondown-optional
      // Log why we went down and rely on sdk to automatically reconnect.
      ondown(closeEvent) {
        logger.warn("Blocknative connection down", closeEvent)
      },
      onreopen() {
        logger.debug("Reconnected to blocknative")
      },
    })

    this.apiKey = apiKey
  }

  watchBalanceUpdatesFor(
    accountAddress: string,
    handler: (
      transactionData: EthereumTransactionData,
      balanceDelta: bigint
    ) => void
  ): void {
    // TODO Centralize handling of txConfirmed.
    this.blocknative
      .account(accountAddress)
      .emitter.on("txConfirmed", (transactionData) => {
        if (
          "system" in transactionData &&
          transactionData.system === "ethereum" // not Bitcoin or a log
        ) {
          const transaction = transactionData as EthereumTransactionData

          const balanceDelta = transaction.netBalanceChanges
            ?.filter(({ address }) => address.toLowerCase() === accountAddress)
            .flatMap(({ balanceChanges }) => balanceChanges)
            .filter(({ asset: { type: assetType } }) => assetType === "ether")
            .reduce(
              (ethBalanceChangeDelta, { delta }) =>
                ethBalanceChangeDelta + BigInt(delta),
              0n
            )

          if (balanceDelta) {
            // Only if there is a balance delta to report.
            handler(transaction, balanceDelta)
          }
        }
      })
  }

  unwatchBalanceUpdatesFor(accountAddress: string): void {
    // TODO After centralizing handling, handle overall unsubscribing through
    // that mechanism.
    this.blocknative.account(accountAddress).emitter.off("txConfirmed")
    this.blocknative.unsubscribe(accountAddress)
  }

  /*
   * Helper function to get current block prices and estimated fees
   * Converts data from Blocknative into our own custom type
   */
  async getBlockPrices(): Promise<BlockPrices> {
    const request = {
      url: `${BLOCKNATIVE_API_ROOT}/gasprices/blockprices`,
      headers: { Authorization: this.apiKey },
    }

    // TODO: What happens if the blocknative API request fails or gets rate limited?
    const response = await fetchJson(request)
    const currentBlock = response.blockPrices[0]

    return {
      network: ETHEREUM,
      blockNumber: currentBlock.blockNumber,
      baseFeePerGas: gweiToWei(currentBlock.baseFeePerGas),
      estimatedPrices: currentBlock.estimatedPrices.map(
        (estimate: BlockEstimate) => {
          return {
            confidence: estimate.confidence,
            price: gweiToWei(estimate.price ?? 0),
            maxPriorityFeePerGas: gweiToWei(estimate.maxPriorityFeePerGas),
            maxFeePerGas: gweiToWei(estimate.maxFeePerGas),
          }
        }
      ),
      dataSource: "blocknative",
    }
  }
}
