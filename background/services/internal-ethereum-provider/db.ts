import Dexie from "dexie"
import { TALLY_INTERNAL_ORIGIN } from "./constants"

export type ActiveChainId = {
  chainId: string
  origin: string
}

export class InternalEthereumProviderDatabase extends Dexie {
  private activeChainId!: Dexie.Table<ActiveChainId, string>

  constructor() {
    super("tally/internal-ethereum-provider")

    this.version(1).stores({
      activeChainId: "&origin,chainId",
    })

    this.activeChainId.put({
      origin: TALLY_INTERNAL_ORIGIN,
      // New installs will default to having `Ethereum` as their active chain.
      chainId: "1",
    })
  }

  async setActiveChainIdForOrigin(
    chainId: string,
    origin: string
  ): Promise<string | undefined> {
    return this.activeChainId.put({ origin, chainId })
  }

  async getActiveChainIdForOrigin(
    origin: string
  ): Promise<ActiveChainId | undefined> {
    return this.activeChainId.get({ origin })
  }
}

export async function getOrCreateDB(): Promise<InternalEthereumProviderDatabase> {
  return new InternalEthereumProviderDatabase()
}
