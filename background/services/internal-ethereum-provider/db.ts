import Dexie from "dexie"
import { ETHEREUM } from "../../constants"

export class InternalEtheremProviderDatabase extends Dexie {
  private activeChainId!: Dexie.Table<{ chainId: string }, string>

  constructor() {
    super("tally/internal-ethereum-provider")

    this.version(1).stores({
      activeChainId: "&chainId",
    })

    this.activeChainId.put({
      chainId: "1",
    })
  }

  async setActiveChainId(chainId: string): Promise<string | undefined> {
    await this.activeChainId.clear()
    return this.activeChainId.put({ chainId })
  }

  async getActiveChainId(): Promise<string> {
    const [activeChainId] = await this.activeChainId.toArray()
    return activeChainId.chainId
  }
}

export async function getOrCreateDB(): Promise<InternalEtheremProviderDatabase> {
  return new InternalEtheremProviderDatabase()
}
