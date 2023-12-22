import Dexie, { Collection, DexieOptions, IndexableTypeArray } from "dexie"

import { UNIXTime } from "../../types"
import { AccountBalance, AddressOnNetwork } from "../../accounts"
import {
  AnyEVMBlock,
  AnyEVMTransaction,
  EVMNetwork,
  Network,
  NetworkBaseAsset,
  sameNetwork,
} from "../../networks"
import { FungibleAsset } from "../../assets"
import {
  BASE_ASSETS,
  CHAIN_ID_TO_COINGECKO_PLATFORM_ID,
  CHAIN_ID_TO_RPC_URLS,
  DEFAULT_NETWORKS,
  ETH,
  SEPOLIA,
  isBuiltInNetwork,
  NETWORK_BY_CHAIN_ID,
  POLYGON,
} from "../../constants"
import { FeatureFlags, isEnabled } from "../../features"

export type Transaction = AnyEVMTransaction & {
  dataSource: "alchemy" | "local"
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

// TODO keep track of blocks invalidated by a reorg
// TODO keep track of transaction replacement / nonce invalidation

export class ChainDatabase extends Dexie {
  static defaultSettings = {
    CHAIN_ID_TO_RPC_URLS,
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

  private rpcConfig!: Dexie.Table<RpcConfig, string>

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
  }: {
    chainName: string
    chainID: string
    decimals: number
    symbol: string
    assetName: string
    rpcUrls: string[]
    blockExplorerURL: string
  }): Promise<EVMNetwork> {
    const network: EVMNetwork = {
      name: chainName,
      coingeckoPlatformID: CHAIN_ID_TO_COINGECKO_PLATFORM_ID[chainID],
      chainID,
      family: "EVM",
      blockExplorerURL,
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
    await this.addRpcUrls(chainID, rpcUrls)
    return network
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
      Object.entries(ChainDatabase.defaultSettings.CHAIN_ID_TO_RPC_URLS).map(
        async ([chainId, rpcUrls]) => {
          if (rpcUrls) {
            await this.addRpcUrls(chainId, rpcUrls)
          }
        },
      ),
    )
  }

  private async initializeBaseAssets(): Promise<void> {
    await this.updateBaseAssets(ChainDatabase.defaultSettings.BASE_ASSETS)
  }

  private async initializeEVMNetworks(): Promise<void> {
    const existingNetworks = await this.getAllEVMNetworks()
    await Promise.all(
      ChainDatabase.defaultSettings.DEFAULT_NETWORKS.map(
        async (defaultNetwork) => {
          if (
            !existingNetworks.some((network) =>
              sameNetwork(network, defaultNetwork),
            )
          ) {
            await this.networks.put(defaultNetwork)
          }
        },
      ),
    )
  }

  async getRpcUrlsByChainId(chainId: string): Promise<string[]> {
    const rpcUrls = await this.rpcConfig.where({ chainId }).first()
    if (rpcUrls) {
      return rpcUrls.rpcUrls
    }
    throw new Error(`No RPC Found for ${chainId}`)
  }

  private async addRpcUrls(chainID: string, rpcUrls: string[]): Promise<void> {
    const existingRpcUrlsForChain = await this.rpcConfig.get(chainID)
    if (existingRpcUrlsForChain) {
      existingRpcUrlsForChain.rpcUrls.push(...rpcUrls)
      existingRpcUrlsForChain.rpcUrls = [
        ...new Set(existingRpcUrlsForChain.rpcUrls),
      ]
      await this.rpcConfig.put(existingRpcUrlsForChain)
    } else {
      await this.rpcConfig.put({ chainID, rpcUrls })
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

  async getAllRpcUrls(): Promise<{ chainID: string; rpcUrls: string[] }[]> {
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
