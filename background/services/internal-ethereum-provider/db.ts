import Dexie from "dexie"
import { TALLY_INTERNAL_ORIGIN } from "./constants"

type ActiveChainId = {
  chainId: string
  origin: string
}
export class InternalEtheremProviderDatabase extends Dexie {
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

  private async getInternalActiveChain(): Promise<ActiveChainId> {
    return this.activeChainId.get({
      origin: TALLY_INTERNAL_ORIGIN,
    }) as Promise<ActiveChainId>
  }

  async setActiveChainIdForOrigin(
    chainId: string,
    origin: string
  ): Promise<string | undefined> {
    return this.activeChainId.put({ origin, chainId })
  }

  async getActiveChainIdForOrigin(origin: string): Promise<string> {
    const activeChainId = await this.activeChainId.get({ origin })
    if (!activeChainId) {
      const defaultChainId = (await this.getInternalActiveChain()).chainId
      return defaultChainId
    }
    return activeChainId?.chainId
  }
}

export async function getOrCreateDB(): Promise<InternalEtheremProviderDatabase> {
  return new InternalEtheremProviderDatabase()
}
