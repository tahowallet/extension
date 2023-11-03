import Dexie from "dexie"
import { ETHEREUM } from "../../constants"
import { EVMNetwork } from "../../networks"
import { TAHO_INTERNAL_ORIGIN } from "./constants"

type NetworkForOrigin = {
  origin: string
  network: EVMNetwork
}

export class InternalEthereumProviderDatabase extends Dexie {
  private currentNetwork!: Dexie.Table<NetworkForOrigin, string>

  constructor() {
    super("tally/internal-ethereum-provider")

    this.version(1).stores({
      activeNetwork: "&origin,chainId,network, address",
    })

    this.version(2)
      .stores({
        currentNetwork: "&origin,chainId,network, address",
      })
      .upgrade((tx) =>
        tx
          .table("activeNetwork")
          .toArray()
          .then((networksForOrigins) =>
            tx.table("currentNetwork").bulkAdd(networksForOrigins),
          ),
      )

    this.version(3).stores({
      activeNetworks: null,
    })

    this.version(4).stores({
      currentNetwork: "&origin,network.chainID",
    })

    this.on("populate", (tx) =>
      tx.db
        .table("currentNetwork")
        .add({ origin: TAHO_INTERNAL_ORIGIN, network: ETHEREUM }),
    )
  }

  async setCurrentChainIdForOrigin(
    origin: string,
    network: EVMNetwork,
  ): Promise<string | undefined> {
    return this.currentNetwork.put({ origin, network })
  }

  /**
   * Clear origin's current network state if it is the same as the passed
   * chainId.
   */
  async unsetCurrentNetworkForOrigin(
    origin: string,
    chainID: string,
  ): Promise<void> {
    const originMatches =
      (await this.currentNetwork
        .where({ origin, "network.chainID": chainID })
        .count()) > 0

    if (originMatches) {
      await this.currentNetwork.delete(origin)
    }
  }

  async getCurrentNetworkForOrigin(
    origin: string,
  ): Promise<EVMNetwork | undefined> {
    const currentNetwork = await this.currentNetwork.get({ origin })
    return currentNetwork?.network
  }

  async removeStoredPreferencesForChain(chainID: string): Promise<void> {
    await this.currentNetwork.where({ "network.chainID": chainID }).delete()
  }
}

export async function getOrCreateDB(): Promise<InternalEthereumProviderDatabase> {
  return new InternalEthereumProviderDatabase()
}
