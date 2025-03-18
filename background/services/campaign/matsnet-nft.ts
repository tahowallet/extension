import { getRuntimeFlagValue } from "../../features"

export type MezoClaimStatus =
  | "not-eligible"
  | "eligible"
  | "can-borrow"
  | "can-claim-nft"
  | "campaign-complete"

export type MezoCampaignState = {
  dateFrom: string
  dateTo: string
  state: MezoClaimStatus
}

export const NFT_CONTRACT_ADDRESS = getRuntimeFlagValue(
  "USE_CAMPAIGN_NFT_CONTRACT",
)

export const CAMPAIGN_ID = "mezo-nft-claim"

export type MezoCampaign = {
  id: typeof CAMPAIGN_ID
  data: MezoCampaignState | undefined
  enabled: boolean
}

const prefixWithCampaignId = (str: string): `campaign::${string}` =>
  `campaign::${CAMPAIGN_ID}-${str}`

export const NFT_COLLECTION_ID = prefixWithCampaignId("nft-collection")

export const IS_ELIGIBLE_NOTIFICATION_ID = prefixWithCampaignId(
  "eligible-notification",
)
export const BORROW_AD_NOTIFICATION_ID = prefixWithCampaignId(
  "borrow-notification",
)
export const CLAIM_NFT_NOTIFICATION_ID = prefixWithCampaignId(
  "claim-nft-notification",
)

export const isActiveCampaign = (state: MezoClaimStatus) => {
  const activeStates: MezoClaimStatus[] = [
    "eligible",
    "can-borrow",
    "can-claim-nft",
  ]

  return activeStates.some((value) => value === state)
}

const MATSNET_NFT_CAMPAIGN = {
  id: CAMPAIGN_ID,
  notificationIds: {
    eligible: IS_ELIGIBLE_NOTIFICATION_ID,
    canBorrow: BORROW_AD_NOTIFICATION_ID,
    canClaimNFT: CLAIM_NFT_NOTIFICATION_ID,
  },
  bannerIds: {
    eligible: prefixWithCampaignId("eligible-banner"),
    canBorrow: prefixWithCampaignId("borrow-banner"),
    canClaimNFT: prefixWithCampaignId("claim-nft-banner"),
  },
  isActive: isActiveCampaign,
} as const

export default MATSNET_NFT_CAMPAIGN
