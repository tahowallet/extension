import Dexie, { Collection, DexieOptions, IndexableTypeArray } from "dexie"

import { UNIXTime } from "../../types"
import { AccountBalance, AddressOnNetwork } from "../../accounts"
import {
  AnyEVMBlock,
  AnyEVMTransaction,
  EVMNetwork,
  Network,
  NetworkBaseAsset,
  RpcEndpoint,
} from "../../networks"
import { FungibleAsset } from "../../assets"
import {
  BASE_ASSETS,
  CHAIN_ID_TO_COINGECKO_PLATFORM_ID,
  CHAIN_ID_TO_RPC_URLS,
  DEFAULT_NETWORKS,
  DEFAULT_BLOCK_EXPLORER_URLS_BY_CHAIN_ID,
  DEFAULT_RPC_ENDPOINTS_BY_CHAIN_ID,
  ETH,
  SEPOLIA,
  isBuiltInNetwork,
  NETWORK_BY_CHAIN_ID,
  POLYGON,
} from "../../constants"
import { FeatureFlags, isEnabled } from "../../features"

export type Transaction = AnyEVMTransaction & {
  dataSource: "boar" | "local"
  firstSeen: UNIXTime
}

type AccountAssetTransferLookup = {
  addressNetwork: AddressOnNetwork
  retrievedAt: UNIXTime
  startBlock: bigint
  endBlock: bigint
}

export type RpcConfig = {
  chainID: string
  rpcUrls: string[]
  supportedMethods?: string[]
}

/**
 * The stored per-chain RPC endpoint list. Once a row exists for a chain, it
 * is the sole source of truth for that chain's RPC endpoints — the hardcoded
 * defaults are only used to seed rows for chains that have none.
 */
export type ChainRpcConfig = {
  chainID: string
  endpoints: RpcEndpoint[]
}

/**
 * RPC endpoint URLs that are permanently gone and should be dropped from
 * existing installs' stored endpoint lists. Removing a URL from the
 * hardcoded defaults is not enough on its own: stored endpoint lists are
 * seeded once and are the sole source of truth from then on, so a dead
 * endpoint sticks around until it is explicitly scrubbed by a migration.
 */
export const DEAD_RPC_URLS = ["https://polygon-rpc.com"]

/**
 * Drops every endpoint whose URL exactly matches one of `deadUrls`, unless
 * that would leave the chain with no endpoints at all; a chain with an empty
 * endpoint list is unusable, so in that case the list is returned unchanged
 * and the dead endpoints are left in place.
 */
export function scrubDeadEndpoints(
  endpoints: RpcEndpoint[],
  deadUrls: string[],
): RpcEndpoint[] {
  const liveEndpoints = endpoints.filter(({ url }) => !deadUrls.includes(url))

  return liveEndpoints.length > 0 ? liveEndpoints : endpoints
}

// TODO keep track of blocks invalidated by a reorg
// TODO keep track of transaction replacement / nonce invalidation

export class ChainDatabase extends Dexie {
  static defaultSettings = {
    DEFAULT_RPC_ENDPOINTS_BY_CHAIN_ID,
    DEFAULT_BLOCK_EXPLORER_URLS_BY_CHAIN_ID,
    BASE_ASSETS,
    DEFAULT_NETWORKS,
  }

  /*
   * Accounts whose transaction and balances should be tracked on a particular
   * network.
   *
   * Keyed by the [address, network name, network chain ID] triplet.
   */
  private accountsToTrack!: Dexie.Table<
    AddressOnNetwork,
    [string, string, string]
  >

  /**
   * Keep track of details of asset transfers we've looked up before per
   * account.
   */
  private accountAssetTransferLookups!: Dexie.Table<
    AccountAssetTransferLookup,
    [number]
  >

  /*
   * Partial block headers cached to track reorgs and network status.
   *
   * Keyed by the [block hash, network name] pair.
   */
  private blocks!: Dexie.Table<AnyEVMBlock, [string, string]>

  /*
   * Historic and pending chain transactions relevant to tracked accounts.
   * chainTransaction is used in this context to distinguish from database
   * transactions.
   *
   * Keyed by the [transaction hash, network name] pair.
   */
  private chainTransactions!: Dexie.Table<Transaction, [string, string]>

  /*
   * Historic account balances.
   */
  private balances!: Dexie.Table<AccountBalance, number>

  private networks!: Dexie.Table<EVMNetwork, string>

  private baseAssets!: Dexie.Table<NetworkBaseAsset, string>

  private rpcConfig!: Dexie.Table<ChainRpcConfig, string>

  private customRpcConfig!: Dexie.Table<RpcConfig, string>

  constructor(options?: DexieOptions) {
    super("tally/chain", options)
    this.version(1).stores({
      migrations: "++id,appliedAt",
      accountsToTrack:
        "&[address+network.name+network.chainID],address,network.family,network.chainID,network.name",
      accountAssetTransferLookups:
        "++id,[addressNetwork.address+addressNetwork.network.name+addressNetwork.network.chainID],[addressNetwork.address+addressNetwork.network.name+addressNetwork.network.chainID+startBlock],[addressNetwork.address+addressNetwork.network.name+addressNetwork.network.chainID+endBlock],addressNetwork.address,addressNetwork.network.chainID,addressNetwork.network.name,startBlock,endBlock",
      balances:
        "++id,address,assetAmount.amount,assetAmount.asset.symbol,network.name,blockHeight,retrievedAt",
      chainTransactions:
        "&[hash+network.name],hash,from,[from+network.name],to,[to+network.name],nonce,[nonce+from+network.name],blockHash,blockNumber,network.name,firstSeen,dataSource",
      blocks:
        "&[hash+network.name],[network.name+timestamp],hash,network.name,timestamp,parentHash,blockHeight,[blockHeight+network.name]",
    })

    this.version(2).stores({
      migrations: null,
    })

    this.version(3).upgrade((tx) => {
      tx.table("accountsToTrack")
        .toArray()
        .then((accounts) => {
          const addresses = new Set<string>()

          accounts.forEach(({ address }) => addresses.add(address))
          ;[...addresses].forEach((address) => {
            tx.table("accountsToTrack").put({
              network: POLYGON,
              address,
            })
          })
        })
    })

    this.version(4).upgrade((tx) => {
      tx.table("accountsToTrack")
        .where("network.chainID")
        .equals(SEPOLIA.chainID)
        .delete()
    })

    this.chainTransactions.hook(
      "updating",
      (modifications, _, chainTransaction) => {
        // Only these properties can be updated on a stored transaction.
        // NOTE: Currently we do NOT throw if another property modification is
        // attempted; instead, we just ignore it.
        const allowedVariants = ["blockHeight", "blockHash", "firstSeen"]

        const filteredModifications = Object.fromEntries(
          Object.entries(modifications).filter(([k]) =>
            allowedVariants.includes(k),
          ),
        )

        // If there is an attempt to modify `firstSeen`, prefer the earliest
        // first seen value between the update and the existing value.
        if ("firstSeen" in filteredModifications) {
          return {
            ...filteredModifications,
            firstSeen: Math.min(
              chainTransaction.firstSeen,
              filteredModifications.firstSeen,
            ),
          }
        }

        return filteredModifications
      },
    )

    this.version(5).stores({
      networks: "&chainID,name,family",
    })

    this.version(6).stores({
      baseAssets: "&chainID,symbol,name",
    })

    this.version(7).stores({
      rpcUrls: "&chainID, rpcUrls",
    })

    // Updates saved accounts stored networks for old installs
    this.version(8).upgrade((tx) => {
      tx.table("accountsToTrack")
        .toCollection()
        .modify((account: AddressOnNetwork) => {
          if (isBuiltInNetwork(account.network)) {
            Object.assign(account, {
              network: NETWORK_BY_CHAIN_ID[account.network.chainID],
            })
          }
        })
    })

    this.version(9)
      .stores({
        rpcConfig: "&chainID, rpcUrls",
        customRpcConfig: "&chainID, rpcUrls, supportedMethods",
      })
      .upgrade(async (tx) => {
        const rpcUrls = await tx.table<RpcConfig>("rpcUrls").toArray()
        tx.table<RpcConfig>("rpcConfig").bulkPut(rpcUrls)
      })
      .stores({
        rpcUrls: null,
      })

    this.version(10).upgrade(async (tx) =>
      tx
        .table<RpcConfig>("rpcConfig")
        .toCollection()
        .modify((rpcConfig) => {
          const { chainID, rpcUrls } = rpcConfig
          // If it's a built in network
          if (chainID in CHAIN_ID_TO_RPC_URLS) {
            const removedAnkrUrls = rpcUrls.filter(
              (url) => !/ankr\.com/i.test(url),
            )

            const newBuiltInRPCUrls = new Set([
              ...CHAIN_ID_TO_RPC_URLS[chainID],
              ...removedAnkrUrls,
            ])

            Object.assign(rpcConfig, { rpcUrls: [...newBuiltInRPCUrls] })
          }
        }),
    )

    // Converts stored per-chain RPC URL lists into capability-carrying
    // endpoint lists ({ url, capabilities? } per endpoint).
    this.version(11)
      .stores({
        rpcConfig: "&chainID",
      })
      .upgrade(async (tx) =>
        tx
          .table("rpcConfig")
          .toCollection()
          .modify((rpcConfig: RpcConfig & Partial<ChainRpcConfig>) => {
            const { rpcUrls } = rpcConfig
            if (rpcUrls !== undefined) {
              Object.assign(rpcConfig, {
                endpoints: rpcUrls.map((url) => ({ url })),
              })
              // eslint-disable-next-line no-param-reassign
              delete (rpcConfig as Partial<RpcConfig>).rpcUrls
            }
          }),
      )

    // Scrubs permanently dead RPC endpoints from stored endpoint lists; see
    // {@link DEAD_RPC_URLS} for why a migration is needed at all.
    this.version(12).upgrade(async (tx) =>
      tx
        .table("rpcConfig")
        .toCollection()
        .modify((rpcConfig: Partial<ChainRpcConfig>) => {
          const { endpoints } = rpcConfig
          if (endpoints !== undefined) {
            Object.assign(rpcConfig, {
              endpoints: scrubDeadEndpoints(endpoints, DEAD_RPC_URLS),
            })
          }
        }),
    )
  }

  async initialize(): Promise<void> {
    await this.initializeBaseAssets()
    await this.initializeRPCs()
    await this.initializeEVMNetworks()
  }

  async getLatestBlock(network: Network): Promise<AnyEVMBlock | null> {
    return (
      (
        await this.blocks
          .where("[network.name+timestamp]")
          // Only query blocks from the last 86 seconds
          .aboveOrEqual([network.name, Date.now() - 60 * 60 * 24])
          .and((block) => block.network.name === network.name)
          .reverse()
          .sortBy("timestamp")
      )[0] || null
    )
  }

  async getTransaction(
    network: Network,
    txHash: string,
  ): Promise<AnyEVMTransaction | null> {
    return (
      (
        await this.chainTransactions
          .where("[hash+network.name]")
          .equals([txHash, network.name])
          .toArray()
      )[0] || null
    )
  }

  async addEVMNetwork({
    chainName,
    chainID,
    decimals,
    symbol,
    assetName,
    rpcUrls,
    blockExplorerURL,
    iconUrl,
  }: {
    chainName: string
    chainID: string
    decimals: number
    symbol: string
    assetName: string
    rpcUrls: string[]
    blockExplorerURL: string
    iconUrl?: string
  }): Promise<EVMNetwork> {
    const network: EVMNetwork = {
      name: chainName,
      coingeckoPlatformID: CHAIN_ID_TO_COINGECKO_PLATFORM_ID[chainID],
      chainID,
      family: "EVM",
      blockExplorerURL,
      iconUrl,
      baseAsset: {
        decimals,
        symbol,
        name: assetName,
        chainID,
      },
    }
    await this.networks.put(network)
    // A bit awkward that we are adding the base asset to the network as well
    // as to its own separate table - but lets forge on for now.
    await this.addBaseAsset(assetName, symbol, chainID, decimals)
    await this.addRpcEndpoints(
      chainID,
      rpcUrls.map((url) => ({ url })),
    )
    return network
  }

  /**
   * Updates the editable metadata of an existing EVM network — its name,
   * block explorer URL, icon, and base asset details. The chain ID and family
   * are fixed for the life of the network. RPC endpoints are *not* touched
   * here; they are persisted separately via {@link setRpcEndpoints}, so a
   * settings save writes them exactly once.
   *
   * A rename is not just a field update. Several tables key or index rows by
   * the network's *name*, so rows written under the old name become
   * unreachable the moment it changes; see {@link migrateNetworkNameChange}.
   */
  async updateEVMNetwork({
    chainName,
    chainID,
    decimals,
    symbol,
    assetName,
    blockExplorerURL,
    iconUrl,
  }: {
    chainName: string
    chainID: string
    decimals: number
    symbol: string
    assetName: string
    blockExplorerURL: string
    iconUrl?: string
  }): Promise<EVMNetwork> {
    const existingNetwork = await this.getEVMNetworkByChainID(chainID)
    if (existingNetwork === undefined) {
      throw new Error(`No network found for chain ID ${chainID}`)
    }

    const network: EVMNetwork = {
      ...existingNetwork,
      name: chainName,
      blockExplorerURL,
      iconUrl,
      baseAsset: {
        decimals,
        symbol,
        name: assetName,
        chainID,
      },
    }

    const previousName = existingNetwork.name

    // One transaction over everything a rename touches, so the network row and
    // the rows keyed by its name can never disagree about which name is
    // current.
    await this.transaction(
      "rw",
      [
        this.networks,
        this.baseAssets,
        this.accountsToTrack,
        this.accountAssetTransferLookups,
        this.balances,
        this.chainTransactions,
        this.blocks,
      ],
      async () => {
        await this.networks.put(network)
        await this.addBaseAsset(assetName, symbol, chainID, decimals)

        if (previousName !== network.name) {
          await this.migrateNetworkNameChange(previousName, network)
        }
      },
    )

    return network
  }

  /**
   * Moves every row that identifies its network by name off a custom network's
   * old name and onto its new one.
   *
   * Per table, and why each is handled the way it is:
   *
   * - `accountsToTrack`: the compound primary key embeds `network.name`, so a
   *   row cannot be updated in place — it is deleted and re-added under the new
   *   key. Losing these rows would silently stop tracking the account.
   * - `accountAssetTransferLookups`: auto-increment primary key, name only in
   *   secondary indices, so the stored network is rewritten in place; Dexie
   *   reindexes. Losing these would restart transfer discovery from scratch and
   *   re-scan the whole chain.
   * - `balances`: auto-increment primary key, name only in a secondary index,
   *   so it is rewritten in place too — cheap, and it keeps the recent-balance
   *   cache readable instead of forcing a refetch.
   * - `chainTransactions` and `blocks`: the compound primary keys embed
   *   `network.name`, and both are re-derivable caches. Old-name rows are
   *   deleted rather than re-keyed, which avoids writing a second copy of the
   *   same history under the new name.
   */
  private async migrateNetworkNameChange(
    previousName: string,
    network: EVMNetwork,
  ): Promise<void> {
    const { chainID } = network

    const staleAccounts = await this.accountsToTrack
      .where("network.name")
      .equals(previousName)
      .filter((account) => account.network.chainID === chainID)
      .toArray()

    await this.accountsToTrack
      .where("network.name")
      .equals(previousName)
      .filter((account) => account.network.chainID === chainID)
      .delete()

    await this.accountsToTrack.bulkPut(
      staleAccounts.map(({ address }) => ({ address, network })),
    )

    await this.accountAssetTransferLookups
      .where("addressNetwork.network.name")
      .equals(previousName)
      .filter(
        ({ addressNetwork }) => addressNetwork.network.chainID === chainID,
      )
      .modify((lookup) => {
        Object.assign(lookup.addressNetwork, { network })
      })

    await this.balances
      .where("network.name")
      .equals(previousName)
      .filter((balance) => balance.network.chainID === chainID)
      .modify((balance) => {
        Object.assign(balance, { network })
      })

    await this.chainTransactions
      .where("network.name")
      .equals(previousName)
      .filter((transaction) => transaction.network.chainID === chainID)
      .delete()

    await this.blocks
      .where("network.name")
      .equals(previousName)
      .filter((block) => block.network.chainID === chainID)
      .delete()
  }

  async removeEVMNetwork(chainID: string): Promise<void> {
    await this.transaction(
      "rw",
      this.networks,
      this.baseAssets,
      this.rpcConfig,
      this.accountsToTrack,
      this.customRpcConfig,
      async () => {
        await Promise.all([
          this.networks.where({ chainID }).delete(),
          this.baseAssets.where({ chainID }).delete(),
          this.rpcConfig.where({ chainID }).delete(),
          this.customRpcConfig.where({ chainID }).delete(),
        ])

        // @TODO - Deleting accounts inside the Promise.all does not seem
        // to work, figure out why this is happening and parallelize if possible.
        const accountsToTrack = await this.accountsToTrack
          .toCollection()
          .filter((account) => account.network.chainID === chainID)
        return accountsToTrack.delete()
      },
    )
  }

  async getAllEVMNetworks(): Promise<EVMNetwork[]> {
    return this.networks.where("family").equals("EVM").toArray()
  }

  async getEVMNetworkByChainID(
    chainID: string,
  ): Promise<EVMNetwork | undefined> {
    return (await this.networks.where("family").equals("EVM").toArray()).find(
      (network) => network.chainID === chainID,
    )
  }

  private async addBaseAsset(
    name: string,
    symbol: string,
    chainID: string,
    decimals: number,
  ) {
    await this.baseAssets.put({
      decimals,
      name,
      symbol,
      chainID,
    })
  }

  async getBaseAssetForNetwork(chainID: string): Promise<NetworkBaseAsset> {
    if (isEnabled(FeatureFlags.USE_MAINNET_FORK)) {
      return ETH
    }
    const baseAsset = await this.baseAssets.get(chainID)
    if (!baseAsset) {
      throw new Error(`No Base Asset Found For Network ${chainID}`)
    }
    return baseAsset
  }

  async getAllBaseAssets(): Promise<NetworkBaseAsset[]> {
    return this.baseAssets.toArray()
  }

  private async initializeRPCs(): Promise<void> {
    await Promise.all(
      Object.entries(
        ChainDatabase.defaultSettings.DEFAULT_RPC_ENDPOINTS_BY_CHAIN_ID,
      ).map(async ([chainID, endpoints]) => {
        if (endpoints) {
          // Seed only chains that have no stored endpoint list. Once a chain
          // has one, the stored list is the sole source of truth; the
          // hardcoded defaults are never merged back in.
          const existingConfig = await this.rpcConfig.get(chainID)
          if (existingConfig === undefined) {
            await this.rpcConfig.put({ chainID, endpoints })
          }
        }
      }),
    )
  }

  private async initializeBaseAssets(): Promise<void> {
    await this.updateBaseAssets(ChainDatabase.defaultSettings.BASE_ASSETS)
  }

  private async initializeEVMNetworks(): Promise<void> {
    await Promise.all(
      ChainDatabase.defaultSettings.DEFAULT_NETWORKS.map(
        async (defaultNetwork) => {
          // The block explorer URL follows the same rules as RPC endpoints:
          // it is seeded from the hardcoded defaults only when no stored
          // value exists, and the stored value is the sole source of truth
          // from then on.
          const existingNetwork = await this.networks.get(
            defaultNetwork.chainID,
          )
          await this.networks.put({
            ...defaultNetwork,
            blockExplorerURL:
              existingNetwork?.blockExplorerURL ??
              ChainDatabase.defaultSettings
                .DEFAULT_BLOCK_EXPLORER_URLS_BY_CHAIN_ID[
                defaultNetwork.chainID
              ],
          })
        },
      ),
    )
  }

  async setBlockExplorerUrl(
    chainID: string,
    blockExplorerURL: string,
  ): Promise<void> {
    await this.networks.update(chainID, { blockExplorerURL })
  }

  async getRpcEndpointsByChainId(chainID: string): Promise<RpcEndpoint[]> {
    const config = await this.rpcConfig.get(chainID)
    if (config) {
      return config.endpoints
    }
    throw new Error(`No RPC Found for ${chainID}`)
  }

  /**
   * Replaces the stored RPC endpoint list for the given chain, unlike
   * {@link addRpcEndpoints}, which merges with any existing list. Endpoints
   * are deduplicated by URL, keeping the first occurrence's capabilities.
   */
  async setRpcEndpoints(
    chainID: string,
    endpoints: RpcEndpoint[],
  ): Promise<void> {
    const dedupedEndpoints = endpoints.filter(
      (endpoint, index) =>
        endpoints.findIndex(({ url }) => url === endpoint.url) === index,
    )
    await this.rpcConfig.put({ chainID, endpoints: dedupedEndpoints })
  }

  private async addRpcEndpoints(
    chainID: string,
    endpoints: RpcEndpoint[],
  ): Promise<void> {
    const existingConfig = await this.rpcConfig.get(chainID)
    if (existingConfig) {
      const mergedEndpoints = [...existingConfig.endpoints]
      endpoints.forEach((endpoint) => {
        if (!mergedEndpoints.some(({ url }) => url === endpoint.url)) {
          mergedEndpoints.push(endpoint)
        }
      })
      await this.rpcConfig.put({ chainID, endpoints: mergedEndpoints })
    } else {
      await this.rpcConfig.put({ chainID, endpoints })
    }
  }

  async addCustomRpcUrl(
    chainID: string,
    rpcUrl: string,
    supportedMethods: string[] = [],
  ): Promise<string> {
    return this.customRpcConfig.put({
      chainID,
      rpcUrls: [rpcUrl],
      supportedMethods,
    })
  }

  async removeCustomRpcUrl(chainID: string): Promise<number> {
    return this.customRpcConfig.where({ chainID }).delete()
  }

  async getAllRpcEndpoints(): Promise<ChainRpcConfig[]> {
    return this.rpcConfig.toArray()
  }

  async getAllCustomRpcUrls(): Promise<RpcConfig[]> {
    return this.customRpcConfig.toArray()
  }

  async getAllSavedTransactionHashes(): Promise<IndexableTypeArray> {
    return this.chainTransactions.orderBy("hash").keys()
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return this.chainTransactions.toArray()
  }

  async getTransactionsForNetworkQuery(
    network: Network,
  ): Promise<Collection<Transaction, [string, string]>> {
    return this.chainTransactions.where("network.name").equals(network.name)
  }

  async getTransactionsForNetwork(network: Network): Promise<Transaction[]> {
    return (await this.getTransactionsForNetworkQuery(network)).toArray()
  }

  /**
   * Looks up and returns all pending transactions for the given network.
   */
  async getNetworkPendingTransactions(
    network: Network,
  ): Promise<(AnyEVMTransaction & { firstSeen: UNIXTime })[]> {
    const transactions = await this.getTransactionsForNetworkQuery(network)
    return transactions
      .filter(
        (transaction) =>
          !("status" in transaction) &&
          (transaction.blockHash === null || transaction.blockHeight === null),
      )
      .toArray()
  }

  async getBlock(
    network: Network,
    blockHash: string,
  ): Promise<AnyEVMBlock | null> {
    return (
      (
        await this.blocks
          .where("[hash+network.name]")
          .equals([blockHash, network.name])
          .toArray()
      )[0] || null
    )
  }

  async addOrUpdateTransaction(
    tx: AnyEVMTransaction,
    dataSource: Transaction["dataSource"],
  ): Promise<void> {
    await this.transaction("rw", this.chainTransactions, () =>
      this.chainTransactions.put({
        ...tx,
        firstSeen: Date.now(),
        dataSource,
      }),
    )
  }

  async getLatestAccountBalance(
    address: string,
    network: Network,
    asset: FungibleAsset,
  ): Promise<AccountBalance | null> {
    // TODO this needs to be tightened up, both for performance and specificity
    const balanceCandidates = await this.balances
      .where("retrievedAt")
      .above(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .filter(
        (balance) =>
          balance.address === address &&
          balance.assetAmount.asset.symbol === asset.symbol &&
          balance.network.name === network.name,
      )
      .reverse()
      .sortBy("retrievedAt")
    return balanceCandidates.length > 0 ? balanceCandidates[0] : null
  }

  async addAccountToTrack(addressNetwork: AddressOnNetwork): Promise<void> {
    await this.accountsToTrack.put(addressNetwork)
  }

  async removeAccountToTrack(address: string): Promise<void> {
    // @TODO Network Specific deletion when we support it.
    await this.accountsToTrack.where("address").equals(address).delete()
  }

  async getOldestAccountAssetTransferLookup(
    addressNetwork: AddressOnNetwork,
  ): Promise<bigint | null> {
    // TODO this is inefficient, make proper use of indexing
    const lookups = await this.accountAssetTransferLookups
      .where("[addressNetwork.address+addressNetwork.network.name]")
      .equals([addressNetwork.address, addressNetwork.network.name])
      .toArray()
    return lookups.reduce(
      (oldestBlock: bigint | null, lookup) =>
        oldestBlock === null || lookup.startBlock < oldestBlock
          ? lookup.startBlock
          : oldestBlock,
      null,
    )
  }

  async getNewestAccountAssetTransferLookup(
    addressNetwork: AddressOnNetwork,
  ): Promise<bigint | null> {
    // TODO this is inefficient, make proper use of indexing
    const lookups = await this.accountAssetTransferLookups
      .where("[addressNetwork.address+addressNetwork.network.name]")
      .equals([addressNetwork.address, addressNetwork.network.name])

      .toArray()
    return lookups.reduce(
      (newestBlock: bigint | null, lookup) =>
        newestBlock === null || lookup.endBlock > newestBlock
          ? lookup.endBlock
          : newestBlock,
      null,
    )
  }

  async recordAccountAssetTransferLookup(
    addressNetwork: AddressOnNetwork,
    startBlock: bigint,
    endBlock: bigint,
  ): Promise<void> {
    await this.accountAssetTransferLookups.add({
      addressNetwork,
      startBlock,
      endBlock,
      retrievedAt: Date.now(),
    })
  }

  async addBlock(block: AnyEVMBlock): Promise<void> {
    // TODO Consider exposing whether the block was added or updated.
    // TODO Consider tracking history of block changes, e.g. in case of reorg.
    await this.blocks.put(block)
  }

  async addBalance(accountBalance: AccountBalance): Promise<void> {
    await this.balances.add(accountBalance)
  }

  async updateBaseAssets(baseAssets: NetworkBaseAsset[]): Promise<void> {
    await this.baseAssets.bulkPut(baseAssets)
  }

  async getAccountsToTrack(): Promise<AddressOnNetwork[]> {
    return this.accountsToTrack.toArray()
  }

  async getTrackedAddressesOnNetwork(
    network: EVMNetwork,
  ): Promise<AddressOnNetwork[]> {
    return this.accountsToTrack
      .where("network.name")
      .equals(network.name)
      .toArray()
  }

  async getTrackedAccountOnNetwork({
    address,
    network,
  }: AddressOnNetwork): Promise<AddressOnNetwork | null> {
    return (
      (
        await this.accountsToTrack
          .where("[address+network.name+network.chainID]")
          .equals([address, network.name, network.chainID])
          .toArray()
      )[0] ?? null
    )
  }

  async getChainIDsToTrack(): Promise<Set<string>> {
    const chainIDs = await this.accountsToTrack
      .orderBy("network.chainID")
      .keys()
    return new Set(
      chainIDs.filter(
        (chainID): chainID is string => typeof chainID === "string",
      ),
    )
  }
}

export function createDB(options?: DexieOptions): ChainDatabase {
  return new ChainDatabase(options)
}
