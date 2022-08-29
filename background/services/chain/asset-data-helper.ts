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
import { getBalance, getMetadata as getERC20Metadata } from "../../lib/erc20"
import { USE_MAINNET_FORK } from "../../features"
import { DOGGO, FORK } from "../../constants"

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

    // Load balances of tokens on the mainnet fork
    if (USE_MAINNET_FORK) {
      const tokens = [
        "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", // AAVE
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
        "0x3A283D9c08E8b55966afb64C515f5143cf907611", // crvCVXETH
        "0x29059568bB40344487d62f7450E78b8E6C74e0e5", // YFIETH
        "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F", // SNX
        "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2", // SUSHI
        "0xf4d2888d29D722226FafA5d9B24F9164c092421E", // LOOKS
        "0x85Eee30c52B0b379b046Fb0F85F4f3Dc3009aFEC", // KEEP
        "0xCb08717451aaE9EF950a2524E33B6DCaBA60147B", // crvTETH
        "0x9Dbb61D8977c28B4821e21bc17124E98327cF002", // DOGGOETH
        DOGGO.contractAddress, // DOGGO
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      ]
      const balances = tokens.map(async (token) => {
        const balance = await getBalance(
          provider,
          token,
          addressOnNetwork.address
        )
        return {
          smartContract: {
            contractAddress: token,
            homeNetwork: FORK,
          },
          amount: BigInt(balance.toString()),
        }
      })
      const resolvedBalances = Promise.all(balances)
      return resolvedBalances
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
    endBlock?: number,
    incomingOnly = false
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
        const promises = [
          getAlchemyAssetTransfers(
            provider.currentProvider,
            addressOnNetwork,
            "incoming",
            startBlock,
            endBlock
          ),
        ]
        if (!incomingOnly) {
          promises.push(
            getAlchemyAssetTransfers(
              provider.currentProvider,
              addressOnNetwork,
              "outgoing",
              startBlock,
              endBlock
            )
          )
        }
        return (await Promise.all(promises)).flat()
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
