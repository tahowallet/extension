import logger from "../../lib/logger"
import { HexString } from "../../types"
import { EVMNetwork, sameNetwork } from "../../networks"
import { AccountBalance, AddressOnNetwork } from "../../accounts"
import {
  AnyAsset,
  AnyAssetMetadata,
  FungibleAsset,
  isSmartContractFungibleAsset,
  PricePoint,
  SmartContractAmount,
  SmartContractFungibleAsset,
} from "../../assets"
import {
  ARBITRUM_ONE,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  BUILT_IN_NETWORK_BASE_ASSETS,
  ETHEREUM,
  FIAT_CURRENCIES,
  HOUR,
  MINUTE,
  NETWORK_BY_CHAIN_ID,
  OPTIMISM,
  POLYGON,
  SECOND,
  USD,
} from "../../constants"
import { getPrices, getTokenPrices, getPricePoint } from "../../lib/prices"

import {
  getUSDPriceForBaseAsset,
  getUSDPriceForTokens,
} from "../../lib/priceOracle"
import {
  fetchAndValidateTokenList,
  mergeAssets,
  networkAssetsFromLists,
} from "../../lib/token-lists"
import PreferenceService from "../preferences"
import ChainService from "../chain"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { getOrCreateDb, IndexingDatabase } from "./db"
import BaseService from "../base"
import { EnrichedEVMTransaction } from "../enrichment/types"
import {
  normalizeAddressOnNetwork,
  normalizeEVMAddress,
  sameEVMAddress,
} from "../../lib/utils"
import {
  isBaselineTrustedAsset,
  isUnverifiedAsset,
  isTrustedAsset,
  isSameAsset,
} from "../../redux-slices/utils/asset-utils"

// Transactions seen within this many blocks of the chain tip will schedule a
// token refresh sooner than the standard rate.
const FAST_TOKEN_REFRESH_BLOCK_RANGE = 10
// The number of ms to coalesce tokens whose balances are known to have changed
// before balance-checking them.
const ACCELERATED_TOKEN_REFRESH_TIMEOUT = 300

interface Events extends ServiceLifecycleEvents {
  accountsWithBalances: {
    /**
     * Retrieved token balances
     */
    balances: AccountBalance[]
    /**
     * The respective address and network for these balances,
     * useful for identifying which account has no balances left
     * when the balances array is empty
     */
    addressOnNetwork: AddressOnNetwork
  }
  prices: PricePoint[]
  assets: AnyAsset[]
  refreshAsset: SmartContractFungibleAsset
  removeAssetData: SmartContractFungibleAsset
}

const getAssetsByAddress = (assets: SmartContractFungibleAsset[]) => {
  const activeAssetsByAddress = assets.reduce(
    (agg, t) => {
      const newAgg = {
        ...agg,
      }
      newAgg[t.contractAddress.toLowerCase()] = t
      return newAgg
    },
    {} as { [address: string]: SmartContractFungibleAsset },
  )

  return activeAssetsByAddress
}

const getActiveAssetsByAddressForNetwork = (
  network: EVMNetwork,
  activeAssetsToTrack: SmartContractFungibleAsset[],
) => {
  const networkActiveAssets = activeAssetsToTrack.filter(
    (asset) => asset.homeNetwork.chainID === network.chainID,
  )

  return getAssetsByAddress(networkActiveAssets)
}

function allowVerifyAssetByManualImport(
  asset: SmartContractFungibleAsset,
  verified?: boolean,
): boolean {
  // Only not baseline trusted and unverified assets can be verified.
  if (!isBaselineTrustedAsset(asset) && isUnverifiedAsset(asset)) {
    return !!verified
  }

  return false
}

/**
 * IndexingService is responsible for pulling and maintaining all application-
 * level "indexing" data — things like fungible token balances and NFTs, as well
 * as more abstract application concepts like governance proposals.
 *
 * Today, the service periodically polls for price and token balance
 * changes for all tracked tokens and accounts, as well as up to date
 * token metadata. Relevant prices and balances are emitted as events.
 */
export default class IndexingService extends BaseService<Events> {
  /**
   * True if an off-cycle token refresh was scheduled, typically when a watched
   * account had a transaction confirmed.
   */
  private scheduledTokenRefresh = false

  private lastPriceAlarmTime = 0

  private cachedAssets: Record<EVMNetwork["chainID"], AnyAsset[]> =
    Object.fromEntries(
      Object.keys(NETWORK_BY_CHAIN_ID).map((network) => [network, []]),
    )

  /**
   * Create a new IndexingService. The service isn't initialized until
   * startService() is called and resolved.
   *
   * @param preferenceService - Required for token metadata and currency
   *        preferences.
   * @param chainService - Required for chain interactions.
   * @returns A new, initializing IndexingService
   */
  static create: ServiceCreatorFunction<
    Events,
    IndexingService,
    [Promise<PreferenceService>, Promise<ChainService>]
  > = async (preferenceService, chainService, dexieOptions) =>
    new this(
      await getOrCreateDb(dexieOptions),
      await preferenceService,
      await chainService,
    )

  private constructor(
    private db: IndexingDatabase,
    private preferenceService: PreferenceService,
    private chainService: ChainService,
  ) {
    super({
      balance: {
        schedule: {
          periodInMinutes: 1,
        },
        handler: () => this.handleBalanceAlarm(),
      },
      forceBalance: {
        schedule: {
          periodInMinutes: (12 * HOUR) / MINUTE,
        },
        handler: () => this.handleBalanceAlarm(),
      },
      balanceRefresh: {
        schedule: {
          periodInMinutes: 1,
        },
        handler: () => this.handleBalanceRefresh(),
      },
      prices: {
        schedule: {
          delayInMinutes: 1,
          periodInMinutes: 10,
        },
        handler: () => this.handlePriceAlarm(),
      },
    })
  }

  override async internalStartService(): Promise<void> {
    await super.internalStartService()

    this.connectChainServiceEvents()

    // Kick off token list fetching in the background
    const tokenListLoad = this.fetchAndCacheTokenLists()

    this.chainService.emitter.once("serviceStarted").then(async () => {
      this.handlePriceAlarm()

      const trackedNetworks = await this.chainService.getTrackedNetworks()

      // Push any assets we have cached in the db for all active networks
      Promise.allSettled(
        trackedNetworks.map(async (network) => {
          await this.cacheAssetsForNetwork(network)
          this.emitter.emit("assets", this.getCachedAssets(network))
        }),
        // Load balances after token lists load and after assets are cached, otherwise
        // we will not load balances on initial balance query
      ).then(() => tokenListLoad.then(() => this.loadAccountBalances()))
    })
  }

  /**
   * Get all assets we're tracking, for both balances and prices. Only fungible
   * assets are currently supported.
   *
   * @returns An array of fungible smart contract assets.
   */
  async getAssetsToTrack(): Promise<SmartContractFungibleAsset[]> {
    return this.db.getAssetsToTrack()
  }

  /**
   * Begin tracking the price and any balance changes of a fungible network-
   * specific asset.
   *
   * @param asset The fungible asset to track.
   */
  async addAssetToTrack(asset: SmartContractFungibleAsset): Promise<void> {
    // TODO Track across all account/network pairs, not just on one network or
    // TODO account.
    await this.db.addAssetToTrack(asset)
  }

  /**
   * Check whether the specified asset is already being tracked.
   *
   * @param asset The fungible asset to track.
   */
  async isTrackingAsset(asset: SmartContractFungibleAsset): Promise<boolean> {
    return this.db.isTrackingAsset(asset)
  }

  /**
   * Adds/updates a custom asset, invalidates internal cache for asset network
   * @param asset The custom asset
   */
  async addOrUpdateCustomAsset(
    asset: SmartContractFungibleAsset,
  ): Promise<void> {
    await this.db.addOrUpdateCustomAsset(asset)
    await this.cacheAssetsForNetwork(asset.homeNetwork)
  }

  /**
   * Retrieves the latest balance of the specified asset for the specified
   * account on the specified network.
   *
   * @param account The account that owns the given asset.
   * @param network The network on which the balance is being checked.
   * @param asset The asset whose balance is being checked.
   */
  async getLatestAccountBalance(
    account: string,
    network: EVMNetwork,
    asset: FungibleAsset,
  ): Promise<AccountBalance | null> {
    return this.db.getLatestAccountBalance(account, network, asset)
  }

  /**
   * Retrieves cached assets data from internal cache
   * @returns An array of assets, including network base assets, token list
   *          assets and custom assets.
   */
  getCachedAssets(network: EVMNetwork): AnyAsset[] {
    return this.cachedAssets[network.chainID] ?? []
  }

  /**
   * Caches to memory asset metadata from hard-coded base assets and configured token
   * lists.
   */
  async cacheAssetsForNetwork(network: EVMNetwork): Promise<void> {
    // FIXME Somewhere along the line, we started confusing tracked and custom
    // FIXME assets as informational data. We pull tracked and then custom
    // FIXME assets, but really this should never touch custom assets; all
    // FIXME custom assets should be tracked if we want to pull them.
    const trackedAssets = (await this.db.getAssetsToTrack()).filter((asset) =>
      sameNetwork(asset.homeNetwork, network),
    )
    const customAssets = await this.db.getActiveCustomAssetsByNetworks([
      network,
    ])
    const tokenListPrefs =
      await this.preferenceService.getTokenListPreferences()
    const tokenLists = await this.db.getLatestTokenLists(tokenListPrefs.urls)

    this.cachedAssets[network.chainID] = mergeAssets<FungibleAsset>(
      [network.baseAsset],
      trackedAssets,
      customAssets,
      networkAssetsFromLists(network, tokenLists),
    )
  }

  /**
   * Find the metadata for a known SmartContractFungibleAsset based on the
   * network and address.
   *
   * @param network - the home network of the asset
   * @param contractAddress - the address of the asset on its home network
   */
  getKnownSmartContractAsset(
    network: EVMNetwork,
    contractAddress: HexString,
  ): SmartContractFungibleAsset | undefined {
    const knownAssets = this.getCachedAssets(network)

    const searchResult = knownAssets.find(
      (asset): asset is SmartContractFungibleAsset =>
        isSmartContractFungibleAsset(asset) &&
        sameNetwork(asset.homeNetwork, network) &&
        sameEVMAddress(asset.contractAddress, contractAddress),
    )

    return searchResult
  }

  /* *****************
   * PRIVATE METHODS *
   ******************* */

  private acceleratedTokenRefresh: {
    timeout: number | undefined
    assetLookups: {
      asset: SmartContractFungibleAsset
      addressOnNetwork: AddressOnNetwork
    }[]
  } = {
    timeout: undefined,
    assetLookups: [],
  }

  notifyEnrichedTransaction(
    enrichedEVMTransaction: EnrichedEVMTransaction,
  ): void {
    const jointAnnotations =
      typeof enrichedEVMTransaction.annotation === "undefined"
        ? []
        : [
            enrichedEVMTransaction.annotation,
            ...(enrichedEVMTransaction.annotation.subannotations ?? []),
          ]

    jointAnnotations.forEach(async (annotation) => {
      // Note asset transfers of smart contract assets to or from an
      // address we're tracking, and ensure we're tracking that asset +
      // that we do an accelerated balance check.
      if (
        typeof annotation !== "undefined" &&
        annotation.type === "asset-transfer" &&
        isSmartContractFungibleAsset(annotation.assetAmount.asset)
      ) {
        const { asset } = annotation.assetAmount
        const annotationAddressesOnNetwork = [
          annotation.sender.address,
          annotation.recipient.address,
        ].map((address) => ({
          address,
          network: enrichedEVMTransaction.network,
        }))

        const trackedAddresesOnNetworks =
          await this.chainService.filterTrackedAddressesOnNetworks(
            annotationAddressesOnNetwork,
          )

        // An asset has baseline trust if we are already tracking the asset
        // (e.g. via a previously baseline-trusted interaction or via a token
        // list) OR the sender is a tracked address.
        const baselineTrustedAsset =
          typeof this.getKnownSmartContractAsset(
            enrichedEVMTransaction.network,
            asset.contractAddress,
          ) !== "undefined" ||
          (
            await this.chainService.filterTrackedAddressesOnNetworks([
              {
                address: normalizeEVMAddress(enrichedEVMTransaction.from),
                network: enrichedEVMTransaction.network,
              },
            ])
          ).length > 0

        if (baselineTrustedAsset) {
          const assetLookups = trackedAddresesOnNetworks.map(
            (addressOnNetwork) => ({
              asset,
              addressOnNetwork,
            }),
          )

          this.acceleratedTokenRefresh.assetLookups.push(...assetLookups)
          this.acceleratedTokenRefresh.timeout ??= window.setTimeout(
            this.handleAcceleratedTokenRefresh.bind(this),
            ACCELERATED_TOKEN_REFRESH_TIMEOUT,
          )
        }
      }
    })
  }

  private async handleAcceleratedTokenRefresh(): Promise<void> {
    try {
      const { assetLookups } = this.acceleratedTokenRefresh

      this.acceleratedTokenRefresh.timeout = undefined
      this.acceleratedTokenRefresh.assetLookups = []

      const lookupsByAddressOnNetwork = assetLookups.reduce<
        [AddressOnNetwork, SmartContractFungibleAsset[]][]
      >((lookups, { asset, addressOnNetwork: { address, network } }) => {
        const existingAddressOnNetworkIndex = lookups.findIndex(
          ([{ address: existingAddress, network: existingNetwork }]) =>
            sameEVMAddress(address, existingAddress) &&
            sameNetwork(network, existingNetwork),
        )

        if (existingAddressOnNetworkIndex !== -1) {
          lookups[existingAddressOnNetworkIndex][1].push(asset)
        } else {
          lookups.push([{ address, network }, [asset]])
        }

        return lookups
      }, [])

      lookupsByAddressOnNetwork.forEach(([addressOnNetwork, assets]) => {
        this.retrieveTokenBalances(addressOnNetwork, assets)
      })
    } catch (error) {
      logger.error("Error during accelerated token refresh", error)
    }
  }

  private async connectChainServiceEvents(): Promise<void> {
    // listen for assetTransfers, and if we find them, track those tokens
    // TODO update for NFTs
    this.chainService.emitter.on(
      "assetTransfers",
      async ({ addressNetwork, assetTransfers }) => {
        assetTransfers.forEach((transfer) => {
          const fungibleAsset = transfer.assetAmount.asset
          if (isSmartContractFungibleAsset(fungibleAsset)) {
            this.addTokenToTrackByContract(
              addressNetwork.network,
              fungibleAsset.contractAddress,
              {
                discoveryTxHash: { [addressNetwork.address]: transfer.txHash },
              },
            )
          }
        })
      },
    )

    this.chainService.emitter.on(
      "newAccountToTrack",
      async (addressOnNetwork) => {
        // whenever a new account is added, get token balances from Alchemy's
        // default list and add any non-zero tokens to the tracking list
        const balances = await this.retrieveTokenBalances(addressOnNetwork)

        // FIXME Refactor this to only update prices for tokens with balances.
        this.handlePriceAlarm()

        // Every asset we have that hasn't already been balance checked and is
        // on the currently selected network should be checked once.
        //
        // Note that we'll want to move this to a queuing system that can be
        // easily rate-limited eventually.
        const checkedContractAddresses = new Set(
          balances.map(
            ({ smartContract: { contractAddress } }) => contractAddress,
          ),
        )
        const cachedAssets = this.getCachedAssets(addressOnNetwork.network)

        const otherActiveAssets = cachedAssets
          .filter(isSmartContractFungibleAsset)
          .filter(
            (a) =>
              a.homeNetwork.chainID === addressOnNetwork.network.chainID &&
              !checkedContractAddresses.has(a.contractAddress),
          )

        await this.retrieveTokenBalances(addressOnNetwork, otherActiveAssets)
      },
    )

    this.chainService.emitter.on(
      "transaction",
      async ({ transaction, forAccounts }) => {
        if (
          "status" in transaction &&
          transaction.status === 1 &&
          transaction.blockHeight >
            (await this.chainService.getBlockHeight(transaction.network)) -
              FAST_TOKEN_REFRESH_BLOCK_RANGE
        ) {
          this.scheduledTokenRefresh = true
        }
        if (
          "status" in transaction &&
          (transaction.status === 1 || transaction.status === 0)
        ) {
          forAccounts.forEach((accountAddress) => {
            this.chainService.getLatestBaseAccountBalance({
              address: accountAddress,
              network: transaction.network,
            })
          })
        }
      },
    )
  }

  /**
   * Retrieve token balances for a particular account on a particular network,
   * saving the resulting balances and adding any asset with a non-zero balance
   * to the list of assets to track.
   *
   * @param addressNetwork
   * @param contractAddresses
   */
  async retrieveTokenBalances(
    unsafeAddressNetwork: AddressOnNetwork,
    smartContractAssets?: SmartContractFungibleAsset[],
  ): Promise<SmartContractAmount[]> {
    const addressNetwork = normalizeAddressOnNetwork(unsafeAddressNetwork)

    const balances = await this.chainService.assetData.getTokenBalances(
      addressNetwork,
      smartContractAssets?.map(({ contractAddress }) => contractAddress),
    )

    const listedAssetByAddress = (smartContractAssets ?? []).reduce<{
      [contractAddress: string]: SmartContractFungibleAsset
    }>((acc, asset) => {
      acc[normalizeEVMAddress(asset.contractAddress)] = asset
      return acc
    }, {})

    const removedCustomAssets = await this.db.getRemovedCustomAssetsByNetworks([
      addressNetwork.network,
    ])

    // look up all assets and set balances
    const unfilteredAccountBalances = await Promise.allSettled(
      balances.map(async ({ smartContract: { contractAddress }, amount }) => {
        const knownAsset =
          listedAssetByAddress[normalizeEVMAddress(contractAddress)] ??
          this.getKnownSmartContractAsset(
            addressNetwork.network,
            contractAddress,
          )

        if (amount > 0) {
          if (knownAsset) {
            await this.addAssetToTrack(knownAsset)
          } else {
            await this.addTokenToTrackByContract(
              addressNetwork.network,
              contractAddress,
            )
          }
        }

        if (knownAsset) {
          const accountBalance = {
            ...addressNetwork,
            assetAmount: {
              asset: knownAsset,
              amount,
            },
            retrievedAt: Date.now(),
            dataSource: "alchemy",
          } as const

          return accountBalance
        }

        return undefined
      }),
    )

    const accountBalances = unfilteredAccountBalances.reduce<AccountBalance[]>(
      (acc, current) => {
        if (
          current.status === "fulfilled" &&
          current.value &&
          !removedCustomAssets.some((asset) =>
            isSameAsset(asset, current.value?.assetAmount.asset),
          )
        ) {
          return [...acc, current.value]
        }
        return acc
      },
      [],
    )

    await this.db.addBalances(accountBalances)
    this.emitter.emit("accountsWithBalances", {
      balances: accountBalances,
      addressOnNetwork: addressNetwork,
    })

    return balances
  }

  async updateAssetMetadata(
    asset: SmartContractFungibleAsset,
    metadata: AnyAssetMetadata,
  ): Promise<void> {
    const updatedAsset: SmartContractFungibleAsset = {
      ...asset,
      metadata: {
        ...asset.metadata,
        ...metadata,
      },
    }

    await this.db.addOrUpdateCustomAsset(updatedAsset)
    await this.cacheAssetsForNetwork(asset.homeNetwork)
    this.emitter.emit("refreshAsset", updatedAsset)
  }

  async hideAsset(asset: SmartContractFungibleAsset): Promise<void> {
    const metadata = {
      ...asset.metadata,
      removed: true,
    }

    // The updated metadata should only be sent to the db
    await this.db.addOrUpdateCustomAsset({ ...asset, metadata })
    await this.cacheAssetsForNetwork(asset.homeNetwork)
    this.emitter.emit("removeAssetData", asset)
  }

  async removeDiscoveryTxHash(address: string): Promise<void> {
    const customAssets = await this.db.getAllCustomAssets()

    customAssets
      .filter(
        (asset) => asset.metadata?.discoveryTxHash?.[address] !== undefined,
      )
      .forEach((assetWithDiscoveryHashReference) => {
        const { metadata } = assetWithDiscoveryHashReference
        if (Object.keys(metadata?.discoveryTxHash ?? {}).length !== 0) {
          delete metadata?.discoveryTxHash?.[address]
          this.updateAssetMetadata(
            assetWithDiscoveryHashReference,
            metadata ?? {},
          )
        }
      })
  }

  async importCustomToken(asset: SmartContractFungibleAsset): Promise<boolean> {
    const customAsset = {
      ...asset,
      metadata: {
        ...(asset.metadata ?? {}),
        // Manually imported tokens are verified
        verified: true,
      },
    }

    await this.addTokenToTrackByContract(
      asset.homeNetwork,
      asset.contractAddress,
      customAsset.metadata,
    )

    try {
      const addresses = await this.chainService.getTrackedAddressesOnNetwork(
        asset.homeNetwork,
      )
      await Promise.allSettled(
        addresses.map(async (addressNetwork) => {
          await this.retrieveTokenBalances(addressNetwork, [customAsset])
        }),
      )
      return true
    } catch (error) {
      logger.error(
        "Error retrieving new custom token balances for ",
        asset,
        ": ",
        error,
      )
      return false
    }
  }

  /**
   * Add an asset to track to a particular account and network, specified by the
   * contract address and optional decimals.
   *
   * If the asset has already been cached, use that. Otherwise, infer asset
   * details from the contract and outside services.
   *
   * @param addressOnNetwork the account and network on which this asset should
   *        be tracked
   * @param contractAddress the address of the token contract on this network
   * @param decimals optionally include the number of decimals tracked by a
   *        fungible asset. Useful in case this asset isn't found in existing
   *        metadata.
   */
  async addTokenToTrackByContract(
    network: EVMNetwork,
    contractAddress: string,
    metadata: {
      discoveryTxHash?: {
        [address: HexString]: HexString
      }
      verified?: boolean
      logoURL?: string
    } = {},
  ): Promise<SmartContractFungibleAsset | undefined> {
    const normalizedAddress = normalizeEVMAddress(contractAddress)

    const knownAsset = this.getKnownSmartContractAsset(
      network,
      normalizedAddress,
    )

    if (
      knownAsset &&
      // Refresh a known unverified asset if it has been manually imported.
      // This check allows the user to add an asset from the unverified list.
      !allowVerifyAssetByManualImport(knownAsset, metadata?.verified)
    ) {
      await this.addAssetToTrack(knownAsset)
      return knownAsset
    }

    let customAsset = await this.db.getCustomAssetByAddressAndNetwork(
      network,
      normalizedAddress,
    )

    if (!customAsset) {
      // pull metadata from Alchemy
      customAsset =
        (await this.chainService.assetData.getTokenMetadata({
          contractAddress: normalizedAddress,
          homeNetwork: network,
        })) || undefined
    }

    if (customAsset) {
      const isRemoved = customAsset?.metadata?.removed ?? false
      const isVerified = metadata.verified ?? false
      // If the asset has been removed, it should be added again when the user did it manually by import.
      if (!isRemoved || (isRemoved && isVerified)) {
        if (Object.keys(metadata).length !== 0) {
          customAsset.metadata ??= {}

          if (metadata.verified !== undefined) {
            customAsset.metadata.verified = metadata.verified
          }

          if (metadata.discoveryTxHash) {
            customAsset.metadata.discoveryTxHash ??= {}
            Object.assign(
              customAsset.metadata.discoveryTxHash,
              metadata.discoveryTxHash,
            )
          }

          if (metadata.logoURL) {
            customAsset.metadata.logoURL = metadata.logoURL
          }

          if (isRemoved) {
            customAsset.metadata.removed = false
          }
        }
        await this.addOrUpdateCustomAsset(customAsset)
        this.emitter.emit("refreshAsset", customAsset)
        // TODO if we still don't have anything, use a contract read + a
        // CoinGecko lookup
        await this.addAssetToTrack(customAsset)
      }
    }

    return customAsset
  }

  /**
   * Loads prices for base network assets
   */
  private async getBaseAssetsPrices() {
    try {
      // TODO include user-preferred currencies
      // get the prices of ETH and BTC vs major currencies
      const baseAssets = await this.chainService.getNetworkBaseAssets()
      let basicPrices = await getPrices(baseAssets, FIAT_CURRENCIES)

      if (basicPrices.length === 0) {
        basicPrices = await Promise.all(
          [
            ETHEREUM,
            ARBITRUM_ONE,
            OPTIMISM,
            BINANCE_SMART_CHAIN,
            POLYGON,
            AVALANCHE,
          ].map(async (network: EVMNetwork) => {
            const provider =
              this.chainService.providerForNetworkOrThrow(network)
            return getUSDPriceForBaseAsset(network, provider)
          }),
        )
      }

      // kick off db writes and event emission, don't wait for the promises to
      // settle
      const measuredAt = Date.now()
      basicPrices.forEach((pricePoint) => {
        this.db
          .savePriceMeasurement(pricePoint, measuredAt, "coingecko")
          .catch((err) =>
            logger.error(
              "Error saving price point",
              err,
              pricePoint,
              measuredAt,
            ),
          )
      })
      this.emitter.emit("prices", basicPrices)
    } catch (e) {
      logger.error(
        "Error getting base asset prices from coingecko",
        BUILT_IN_NETWORK_BASE_ASSETS,
        FIAT_CURRENCIES,
      )
    }
  }

  /**
   * Loads prices for all tracked assets except untrusted/custom network assets
   */
  private async getTrackedAssetsPrices() {
    // get the prices of all assets to track and save them
    const assetsToTrack = await this.db.getAssetsToTrack()
    const trackedNetworks = await this.chainService.getTrackedNetworks()
    // Filter all assets based on supported networks
    const activeAssetsToTrack = assetsToTrack.filter(
      (asset) =>
        isTrustedAsset(asset) &&
        trackedNetworks.some((network) =>
          sameNetwork(network, asset.homeNetwork),
        ),
    )
    try {
      // TODO only uses USD

      const allActiveAssetsByAddress = getAssetsByAddress(activeAssetsToTrack)

      const activeAssetsByNetwork = trackedNetworks
        .map((network) => ({
          activeAssetsByAddress: getActiveAssetsByAddressForNetwork(
            network,
            activeAssetsToTrack,
          ),
          network,
        }))
        .filter(
          ({ activeAssetsByAddress }) =>
            Object.keys(activeAssetsByAddress).length > 0,
        )

      const measuredAt = Date.now()

      // @TODO consider allSettled here
      const activeAssetPricesByNetwork = await Promise.all(
        activeAssetsByNetwork.map(
          async ({ activeAssetsByAddress, network }) => {
            const coingeckoTokenPrices = await getTokenPrices(
              Object.keys(activeAssetsByAddress),
              USD,
              network,
            )
            if (Object.keys(coingeckoTokenPrices).length) {
              return coingeckoTokenPrices
            }

            const provider =
              this.chainService.providerForNetworkOrThrow(network)

            return getUSDPriceForTokens(
              Object.values(activeAssetsByAddress),
              network,
              provider,
            )
          },
        ),
      )

      const activeAssetPrices = activeAssetPricesByNetwork.flatMap(
        (activeAssetPrice) => Object.entries(activeAssetPrice),
      )

      const pricePoints = activeAssetPrices
        .map(([contractAddress, unitPricePoint]) => {
          const asset = allActiveAssetsByAddress[contractAddress.toLowerCase()]
          if (asset) {
            const pricePoint = getPricePoint(asset, unitPricePoint)
            this.db
              .savePriceMeasurement(pricePoint, measuredAt, "coingecko")
              .catch(() =>
                logger.error(
                  "Error saving price point",
                  pricePoint,
                  measuredAt,
                ),
              )
            return pricePoint
          }
          logger.warn(
            "Discarding price from unknown asset",
            contractAddress,
            unitPricePoint,
          )
          return null
        })
        .filter((pricePoint): pricePoint is PricePoint => pricePoint !== null)

      this.emitter.emit("prices", pricePoints)
    } catch (err) {
      logger.error(
        "Error getting token prices from coingecko",
        activeAssetsToTrack,
        err,
      )
    }
  }

  private async handlePriceAlarm(): Promise<void> {
    if (Date.now() < this.lastPriceAlarmTime + 5 * SECOND) {
      // If this is quickly called multiple times (for example when
      // using a network for the first time with a wallet loaded
      // with many accounts) only fetch prices once.
      return
    }

    this.lastPriceAlarmTime = Date.now()

    // Avoid awaiting here so price fetching can happen in the background
    // and the extension can go on doing whatever it needs to do while waiting
    // for prices to come back.
    this.getBaseAssetsPrices()
    this.getTrackedAssetsPrices()
  }

  private async fetchAndCacheTokenLists(): Promise<void> {
    const tokenListPrefs =
      await this.preferenceService.getTokenListPreferences()

    // load each token list in preferences
    await Promise.allSettled(
      tokenListPrefs.urls.map(async (url) => {
        const cachedList = await this.db.getLatestTokenList(url)
        if (!cachedList) {
          try {
            const newListRef = await fetchAndValidateTokenList(url)

            await this.db.saveTokenList(url, newListRef.tokenList)
          } catch (err) {
            logger.error(
              `Error fetching, validating, and saving token list ${url}`,
            )
          }
        }
      }),
    )

    // Cache assets across all supported networks even if a network
    // may be inactive.
    await Promise.allSettled(
      this.chainService.supportedNetworks.map(async (network) => {
        await this.cacheAssetsForNetwork(network)
        this.emitter.emit("assets", this.getCachedAssets(network))
      }),
    )

    // TODO if tokenListPrefs.autoUpdate is true, pull the latest and update if
    // the version has gone up
  }

  private async handleBalanceRefresh(): Promise<void> {
    if (this.scheduledTokenRefresh) {
      await this.handleBalanceAlarm()
      this.scheduledTokenRefresh = false
    }
  }

  private async loadAccountBalances(onlyActiveAccounts = false): Promise<void> {
    // TODO doesn't support multi-network assets
    // like USDC or CREATE2-based contracts on L1/L2

    const accounts =
      await this.chainService.getAccountsToTrack(onlyActiveAccounts)

    await Promise.allSettled(
      accounts.map(async (addressOnNetwork) => {
        const { network } = addressOnNetwork

        const provider = this.chainService.providerForNetworkOrThrow(network)

        const loadBaseAccountBalance =
          this.chainService.getLatestBaseAccountBalance(addressOnNetwork)

        /**
         * When the provider supports alchemy we can use alchemy_getTokenBalances
         * to query all erc20 token balances without specifying which assets we
         * need to check. When it does not, we try checking balances for every asset
         * we've seen in the network.
         */
        const assetsToCheck = provider.supportsAlchemy
          ? []
          : // This doesn't pass assetsToTrack stored in the db as
            // it assumes they've already been cached
            this.getCachedAssets(network).filter(isSmartContractFungibleAsset)

        const loadTokenBalances = this.retrieveTokenBalances(
          addressOnNetwork,
          assetsToCheck,
        )

        return Promise.all([loadBaseAccountBalance, loadTokenBalances])
      }),
    )
  }

  private async handleBalanceAlarm(): Promise<void> {
    await this.fetchAndCacheTokenLists().then(() =>
      this.loadAccountBalances(true),
    )
  }
}
