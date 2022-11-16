import Dexie from "dexie"

export interface AnalyticsUUID {
  uuid: string
}

export class AnalyticsDatabase extends Dexie {
  private analyticsUUID!: Dexie.Table<AnalyticsUUID, number>

  constructor() {
    super("tally/analytics")

    this.version(1).stores({
      // Let's use an incremental id. If we need to change the UUID
      // for any reason the migration will be trivial.
      // Note: we are using outbound primary index here, which means
      // that the id property won't be included in the stored object.
      // https://dexie.org/docs/inbound#example-of-outbound-primary-key
      analyticsUUID: "++,uuid",
    })
  }

  async getAnalyticsUUID(): Promise<string | undefined> {
    return (await this.analyticsUUID.reverse().first())?.uuid
  }

  async setAnalyticsUUID(uuid: string): Promise<void> {
    await this.analyticsUUID.add({ uuid })
  }
}
export async function getOrCreateDB(): Promise<AnalyticsDatabase> {
  return new AnalyticsDatabase()
}
