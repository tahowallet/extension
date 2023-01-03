import Dexie from "dexie"
import { FeatureFlags, isEnabled } from "../../features"

export interface BaseAsset {
  name: string
  symbol: string
  decimals: number
}

export class NetworksDatabase extends Dexie {
  private baseAssets!: Dexie.Table<BaseAsset, number>

  constructor() {
    super("tally/networks")

    if (isEnabled(FeatureFlags.SUPPORT_CUSTOM_NETWORKS)) {
      this.version(1).stores({
        baseAssets: "++id,&name",
      })
    }
  }
}

export async function getOrCreateDB(): Promise<NetworksDatabase> {
  return new NetworksDatabase()
}
