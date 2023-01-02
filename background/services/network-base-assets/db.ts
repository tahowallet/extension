import Dexie from "dexie"
import { FeatureFlags, isEnabled } from "../../features"

export interface BaseAsset {
  name: string
  symbol: string
  decimals: number
}

export class BaseAssetsDatabase extends Dexie {
  private assets!: Dexie.Table<BaseAsset, number>

  constructor() {
    super("tally/base-assets")

    if (isEnabled(FeatureFlags.SUPPORT_CUSTOM_NETWORK)) {
      this.version(1).stores({
        assets: "++id,&name",
      })
    }
  }
}

export async function getOrCreateDB(): Promise<BaseAssetsDatabase> {
  return new BaseAssetsDatabase()
}
