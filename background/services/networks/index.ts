import BaseService from "../base"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { NetworksDatabase, getOrCreateDB } from "./db"

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Events extends ServiceLifecycleEvents {}

export default class NetworksService extends BaseService<Events> {
  static create: ServiceCreatorFunction<Events, NetworksService, []> =
    async () => {
      return new this(await getOrCreateDB())
    }

  private constructor(private db: NetworksDatabase) {
    super()
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()
  }

  protected override async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }
}
