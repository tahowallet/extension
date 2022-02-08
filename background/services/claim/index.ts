import { ServiceLifecycleEvents, ServiceCreatorFunction } from "../types"
import { Eligible } from "./types"
import { getOrCreateDB, ClaimDatabase } from "./db"
import BaseService from "../base"

interface Events extends ServiceLifecycleEvents {
  initializeEligibles: Eligible[]
}

/*
 * The claim service saves the eligibility data for
 * efficient storage and retrieval.
 */
export default class ClaimService extends BaseService<Events> {
  static create: ServiceCreatorFunction<Events, ClaimService, []> =
    async () => {
      const db = await getOrCreateDB()

      return new this(db)
    }

  private constructor(private db: ClaimDatabase) {
    super()
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService()

    this.emitter.emit("initializeEligibles", await this.getEligibles())
  }

  protected async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }

  async getEligibles(): Promise<Eligible[]> {
    const claim = await this.db.getClaim()
    return claim
  }
}
