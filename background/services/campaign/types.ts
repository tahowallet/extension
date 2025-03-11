import { MezoCampaign } from "./matsnet-nft"

type FilterValidCampaigns<T> = T extends {
  id: string
  data: unknown
  /**
   * The campaign is disabled if the user is e.g. not eligible
   */
  enabled: boolean
}
  ? T
  : never

/**
 * Campaigns must use the following format
 * ```ts
 *  {
 *    id: "some-campaign-id"
 *    data: {...}
 *    disabled: boolean
 *  }
 * ```
 */
export type Campaigns = FilterValidCampaigns<MezoCampaign>

export type CampaignIds = Campaigns["id"]

export type FilterCampaignsById<T, K> = T extends { id: K } ? T : never
