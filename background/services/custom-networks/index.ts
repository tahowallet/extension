import BaseService from "../base"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { CustomNetworksDatabase, getOrCreateDB, BaseAsset } from "./db"

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Events extends ServiceLifecycleEvents {}

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
    await this.db.setBaseAssets(asset)
  }
}
