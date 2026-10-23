import Dexie from "dexie"
import type { CampaignIds, Campaigns, FilterCampaignsById } from "./types"

export class CampaignDatabase extends Dexie {
  private campaigns!: Dexie.Table<Campaigns, CampaignIds>

  constructor() {
    super("taho/campaigns")

    this.version(1).stores({
      campaigns: "&id",
    })
  }

  async getActiveCampaigns() {
    return this.campaigns
      .toCollection()
      .filter((campaign) => campaign.enabled)
      .toArray()
  }

  async getCampaignData<K extends CampaignIds>(
    id: K,
  ): Promise<FilterCampaignsById<Campaigns, K> | undefined> {
    return this.campaigns.get(id) as Promise<
      FilterCampaignsById<Campaigns, K> | undefined
    >
  }

  async upsertCampaign(campaign: Campaigns): Promise<void> {
    await this.campaigns.put(campaign)
  }

  async updateCampaignData<K extends CampaignIds>(
    id: K,
    data: Partial<FilterCampaignsById<Campaigns, K>["data"]>,
  ): Promise<void> {
    await this.campaigns.toCollection().modify((campaign) => {
      if (campaign.id === id) {
        Object.assign(campaign, { data })
      }
    })
  }
}

export async function getOrCreateDB(): Promise<CampaignDatabase> {
  return new CampaignDatabase()
}
