import { ServiceLifecycleEvents, ServiceCreatorFunction } from "../types"
import { Eligible } from "./types"
import { getOrCreateDB, ClaimDatabase } from "./db"
import BaseService from "../base"

interface Events extends ServiceLifecycleEvents {
  newEligibility: Eligible
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
  }

  protected async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }

  async getEligibility(address: string): Promise<Eligible> {
    const claim = await this.db.getClaim(address)
    this.emitter.emit("newEligibility", claim)
    return claim
  }
}
