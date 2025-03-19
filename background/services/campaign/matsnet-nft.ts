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

const API_URL_OVERRIDE = process.env.USE_CUSTOM_MEZO_API_ORIGIN
const DAPP_URL_OVERRIDE = process.env.USE_CUSTOM_MEZO_DAPP_ORIGIN

export const DAPP_BASE_URL = DAPP_URL_OVERRIDE || "https://mezo.org"

const API_BASE_URL = API_URL_OVERRIDE || "https://portal.api.mezo.org"

/**
 * Changes the origin of one URL to the origin of another
 */
const adjustURLOrigin = (url: string, baseURL: string) => {
  const target = new URL(baseURL)
  const copy = new URL(url, baseURL)
  copy.host = target.host
  copy.protocol = target.protocol
  return copy.toString()
}

const MATSNET_NFT_CAMPAIGN = {
  id: CAMPAIGN_ID,
  get nftContract() {
    return getRuntimeFlagValue("USE_CAMPAIGN_NFT_CONTRACT")
  },
  apiUrls: {
    checkDrop: adjustURLOrigin(
      "https://portal.api.mezo.org/api/v2/external/campaigns/mezoification/check-drop",
      API_BASE_URL,
    ),
    status: adjustURLOrigin(
      "https://portal.api.mezo.org/api/v2/external/campaigns/mezoification",
      API_BASE_URL,
    ),
  },
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
  bannerUrls: {
    eligible: adjustURLOrigin(
      "https://mezo.org/matsnet/borrow?src=taho-claim-sats-banner",
      DAPP_BASE_URL,
    ),
    canBorrow: adjustURLOrigin(
      "https://mezo.org/matsnet/borrow?src=taho-borrow-banner",
      DAPP_BASE_URL,
    ),
    canClaimNFT: adjustURLOrigin(
      "https://mezo.org/matsnet/store?src=taho-claim-nft-banner",
      DAPP_BASE_URL,
    ),
  },
  isActive: isActiveCampaign,
} as const

export default MATSNET_NFT_CAMPAIGN
