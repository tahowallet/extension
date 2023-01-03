import BaseService from "../base"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { CustomNetworksDatabase, getOrCreateDB, BaseAsset } from "./db"

interface Events extends ServiceLifecycleEvents {
  updateBaseAssets: BaseAsset[]
}

export default class CustomNetworksService extends BaseService<Events> {
  static create: ServiceCreatorFunction<Events, CustomNetworksService, []> =
    async () => {
      return new this(await getOrCreateDB())
    }

  private constructor(private db: CustomNetworksDatabase) {
    super()
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()
  }

  protected override async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }

  /**
   * Add the base asset for the network.
   *
   * @param asset The base asset.
   */
  async addBaseAsset(asset: BaseAsset): Promise<void> {
    const updatedBaseAssets = await this.db.addsBaseAssets(asset)
    this.emitter.emit("updateBaseAssets", updatedBaseAssets)
  }
}
