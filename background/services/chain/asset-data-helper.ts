import {
  getAssetTransfers as getBoarAssetTransfers,
  getTokenBalances as getBoarTokenBalances,
  getTokenMetadata as getBoarTokenMetadata,
} from "../../lib/boar"
import SerialFallbackProvider from "./serial-fallback-provider"
import { SmartContractAmount, SmartContractFungibleAsset } from "../../assets"
import type { ScannedTransfers } from "../../nfts"
import type { AddressOnNetwork } from "../../accounts"
import type { HexString } from "../../types"
import logger from "../../lib/logger"
import { EVMNetwork, SmartContract } from "../../networks"
import {
  getBalance,
  getMetadata as getERC20Metadata,
  getTokenBalances,
} from "../../lib/erc20"
import { getAssetTransfersViaLogs } from "../../lib/erc20-transfer-logs"
import { BLOCKS_PER_TRANSFER_LOG_SCAN } from "./asset-transfer-scanner"
import { FeatureFlags, isEnabled } from "../../features"
import { DOGGO, FORK } from "../../constants"

interface ProviderManager {
  providerForNetwork(network: EVMNetwork): SerialFallbackProvider | undefined
}

/** The asset transfer lookups AssetDataHelper picks between. */
export type AssetTransferLookups = {
  viaAlchemy: typeof getBoarAssetTransfers
  viaLogs: typeof getAssetTransfersViaLogs
}

const defaultAssetTransferLookups: AssetTransferLookups = {
  viaAlchemy: getBoarAssetTransfers,
  viaLogs: getAssetTransfersViaLogs,
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
  constructor(
    private providerTracker: ProviderManager,
    private assetTransferLookups: AssetTransferLookups = defaultAssetTransferLookups,
  ) {}

  async getTokenBalance(
    addressOnNetwork: AddressOnNetwork,
    smartContractAddress: HexString,
  ): Promise<SmartContractAmount> {
    const provider = this.providerTracker.providerForNetwork(
      addressOnNetwork.network,
    )

    if (!provider) {
      throw logger.buildError(
        "Could not find a provider for network",
        addressOnNetwork.network,
      )
    }

    const balances = await getTokenBalances(
      addressOnNetwork,
      [smartContractAddress],
      provider,
    )

    if (balances.length < 1) {
      throw logger.buildError(
        "Unable to retrieve balances for contract",
        smartContractAddress,
      )
    }

    return balances[0]
  }

  async getTokenBalances(
    addressOnNetwork: AddressOnNetwork,
    smartContractAddresses?: HexString[],
  ): Promise<{
    balances: SmartContractAmount[]
    dataSource: "boar" | "generic-rpc" | "local"
  }> {
    const provider = this.providerTracker.providerForNetwork(
      addressOnNetwork.network,
    )
    if (typeof provider === "undefined") {
      return { balances: [], dataSource: "local" }
    }

    try {
      if (provider.supportsAlchemyMethods) {
        return {
          balances: await getBoarTokenBalances(provider, addressOnNetwork),
          dataSource: "boar",
        }
      }
    } catch (error) {
      logger.debug(
        "Problem resolving asset balances on Alchemy-capable network",
        addressOnNetwork.network,
        error,
      )
    }

    try {
      return {
        balances: await getTokenBalances(
          addressOnNetwork,
          smartContractAddresses || [],
          provider,
        ),
        dataSource: "generic-rpc",
      }
    } catch (error) {
      logger.debug(
        "Problem resolving asset balances; network may not support it",
        addressOnNetwork.network,
        error,
      )
    }

    // Load balances of tokens on the mainnet fork
    if (isEnabled(FeatureFlags.USE_MAINNET_FORK)) {
      const tokens = [
        "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
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
          addressOnNetwork.address,
        )
        return {
          smartContract: {
            contractAddress: token,
            homeNetwork: FORK,
          },
          amount: BigInt(balance.toString()),
        }
      })
      const resolvedBalances = await Promise.all(balances)
      return { balances: resolvedBalances, dataSource: "generic-rpc" }
    }
    return { balances: [], dataSource: "local" }
  }

  async getTokenMetadata(
    tokenSmartContract: SmartContract,
  ): Promise<SmartContractFungibleAsset | undefined> {
    const provider = this.providerTracker.providerForNetwork(
      tokenSmartContract.homeNetwork,
    )
    if (typeof provider === "undefined") {
      return undefined
    }

    if (provider.supportsAlchemyMethods) {
      return getBoarTokenMetadata(provider, tokenSmartContract)
    }

    return getERC20Metadata(provider, tokenSmartContract)
  }

  /**
   * Best-effort fetch of asset and ERC-721 transfers from the current
   * provider. May return empty lists if the current provider does not support
   * lookup of assets.
   */
  async getAssetTransfers(
    addressOnNetwork: AddressOnNetwork,
    startBlock: number,
    endBlock?: number,
    incomingOnly = false,
  ): Promise<ScannedTransfers> {
    const provider = this.providerTracker.providerForNetwork(
      addressOnNetwork.network,
    )
    if (typeof provider === "undefined") {
      return { assetTransfers: [], nftTransfers: [] }
    }

    try {
      if (provider.supportsAlchemyMethods) {
        const promises = [
          this.assetTransferLookups.viaAlchemy(
            provider,
            addressOnNetwork,
            "incoming",
            startBlock,
            endBlock,
          ),
        ]
        if (!incomingOnly) {
          promises.push(
            this.assetTransferLookups.viaAlchemy(
              provider,
              addressOnNetwork,
              "outgoing",
              startBlock,
              endBlock,
            ),
          )
        }
        const results = await Promise.all(promises)
        return {
          assetTransfers: results.flatMap((result) => result.assetTransfers),
          nftTransfers: results.flatMap((result) => result.nftTransfers),
        }
      }
    } catch (error) {
      logger.warn(
        "Problem resolving asset transfers via Alchemy-compatible helper on " +
          `chain ${addressOnNetwork.network.chainID}; falling back to ` +
          "Transfer log scanning.",
        error,
      )

      // Deliberately no rethrow: an endpoint that advertises the enhanced API
      // but does not actually serve it — a mistagged capability, a revoked
      // key — would otherwise disable transfer discovery for the network for
      // good, since the caller retries the identical lookup on every alarm
      // and never reaches the standard-RPC fallback below. Fall through to it
      // instead; it rethrows on its own failure, which is what preserves the
      // retry contract callers depend on.
    }

    // Without a working Alchemy-capable endpoint, fall back to scanning
    // standard ERC-20 Transfer logs via eth_getLogs. Native-asset transfers
    // are not captured this way. Failures are left to the caller, which
    // retries and logs them.
    //
    // A range meant for a single Alchemy call can reach all the way back to
    // genesis, which as log queries can mean thousands of requests. Instead,
    // scan only the newest BLOCKS_PER_TRANSFER_LOG_SCAN blocks of it and
    // report where the scan started, so the caller can pick up the rest of
    // the range a step at a time.
    const resolvedEndBlock = endBlock ?? (await provider.getBlockNumber())
    const fromBlock = Math.max(
      startBlock,
      resolvedEndBlock - BLOCKS_PER_TRANSFER_LOG_SCAN + 1,
    )

    const scanned = await this.assetTransferLookups.viaLogs(
      provider,
      addressOnNetwork,
      fromBlock,
      resolvedEndBlock,
      incomingOnly,
    )
    return fromBlock > startBlock
      ? { ...scanned, coveredFromBlock: fromBlock }
      : scanned
  }
}
