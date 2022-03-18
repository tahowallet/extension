import {
  AlchemyProvider,
  AlchemyWebSocketProvider,
} from "@ethersproject/providers"
import {
  getAssetTransfers as getAlchemyAssetTransfers,
  getTokenBalances as getAlchemyTokenBalances,
  getTokenMetadata as getAlchemyTokenMetadata,
} from "../../lib/alchemy"
import SerialFallbackProvider from "./serial-fallback-provider"
import {
  AssetTransfer,
  SmartContractAmount,
  SmartContractFungibleAsset,
} from "../../assets"
import { AddressOnNetwork } from "../../accounts"
import { HexString } from "../../types"
import logger from "../../lib/logger"
import { EVMNetwork, SmartContract } from "../../networks"
import { getMetadata as getERC20Metadata } from "../../lib/erc20"

interface ProviderManager {
  providerForNetwork(network: EVMNetwork): SerialFallbackProvider | undefined
}

/**
 * AssetDataHelper is a wrapper for asset-related functionality like token
 * balance and transfer lookup that may use several different strategies to
 * attempt data lookup depending on the underlying network and data provider.
 * It exposes a uniform interface to fetch various aspects of asset information
 * from the chain, and manages underlying provider differences and
 * optimizations.
 */
export default class AssetDataHelper {
  constructor(private providerTracker: ProviderManager) {}

  async getTokenBalances(
    addressOnNetwork: AddressOnNetwork,
    smartContractAddresses?: HexString[]
  ): Promise<SmartContractAmount[]> {
    const provider = this.providerTracker.providerForNetwork(
      addressOnNetwork.network
    )
    if (typeof provider === "undefined") {
      return []
    }

    try {
      // FIXME Allow arbitrary providers?
      if (
        provider.currentProvider instanceof AlchemyWebSocketProvider ||
        provider.currentProvider instanceof AlchemyProvider
      ) {
        return await getAlchemyTokenBalances(
          provider.currentProvider,
          addressOnNetwork,
          smartContractAddresses
        )
      }
    } catch (error) {
      logger.debug(
        "Problem resolving asset balances via Alchemy helper; network " +
          "may not support it.",
        error
      )
    }

    return []
  }

  async getTokenMetadata(
    tokenSmartContract: SmartContract
  ): Promise<SmartContractFungibleAsset | undefined> {
    const provider = this.providerTracker.providerForNetwork(
      tokenSmartContract.homeNetwork
    )
    if (typeof provider === "undefined") {
      return undefined
    }

    try {
      if (
        provider.currentProvider instanceof AlchemyWebSocketProvider ||
        provider.currentProvider instanceof AlchemyProvider
      ) {
        return await getAlchemyTokenMetadata(
          provider.currentProvider,
          tokenSmartContract
        )
      }
    } catch (error) {
      logger.debug(
        "Problem resolving asset metadata via Alchemy helper; network may " +
          "not support it. Falling back to standard lookup.",
        error
      )
    }

    return getERC20Metadata(provider, tokenSmartContract)
  }

  /**
   * Best-effort fetch of asset transfers from the current provider. May return
   * an empty list if the current provider does not support lookup of assets.
   */
  async getAssetTransfers(
    addressOnNetwork: AddressOnNetwork,
    startBlock: number,
    endBlock?: number
  ): Promise<AssetTransfer[]> {
    const provider = this.providerTracker.providerForNetwork(
      addressOnNetwork.network
    )
    if (typeof provider === "undefined") {
      return []
    }

    try {
      if (
        provider.currentProvider instanceof AlchemyWebSocketProvider ||
        provider.currentProvider instanceof AlchemyProvider
      ) {
        return await getAlchemyAssetTransfers(
          provider.currentProvider,
          addressOnNetwork,
          startBlock,
          endBlock
        )
      }
    } catch (error) {
      logger.warn(
        "Problem resolving asset transfers via Alchemy helper; network may " +
          "not support it.",
        error
      )

      // Rethrow as consumers like ChainService need the exception to manage
      // retries. Eventually we may want retries to be handled here.
      throw error
    }

    return []
  }
}
