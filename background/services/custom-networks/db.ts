import Dexie from "dexie"
import { FeatureFlags, isEnabled } from "../../features"

export interface BaseAsset {
  name: string
  symbol: string
  decimals: number
}

export class CustomNetworksDatabase extends Dexie {
  private baseAssets!: Dexie.Table<BaseAsset, number>

  constructor() {
    super("tally/custom-networks")

    if (isEnabled(FeatureFlags.SUPPORT_CUSTOM_NETWORKS)) {
      this.version(1).stores({
        baseAssets: "&symbol",
      })
    }
  }

  async setBaseAssets(asset: BaseAsset): Promise<void> {
    this.baseAssets.put(asset)
  }
}

export async function getOrCreateDB(): Promise<CustomNetworksDatabase> {
  return new CustomNetworksDatabase()
}
