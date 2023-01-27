import { fetchJson } from "@ethersproject/web"
import logger from "./logger"

const DAYLIGHT_BASE_URL = "https://api.daylight.xyz/v1"

// https://docs.daylight.xyz/reference/ability-model#ability-types
type DaylightAbilityType =
  | "vote"
  | "claim"
  | "airdrop"
  | "mint"
  | "access"
  | "product"
  | "event"
  | "article"
  | "result"
  | "misc"

type Community = {
  chain: string
  contractAddress: string
  // ERC-20, ERC-721, ERC-1155
  type: string
  title: string
  slug: string
  currencyCode: string
  description: string
  imageUrl: string
}

export type DaylightAbilityRequirement =
  | TokenBalanceRequirement
  | NFTRequirement
  | AllowListRequirement

type TokenBalanceRequirement = {
  chain: string
  type: "hasTokenBalance"
  address: string
  community?: Array<Community>
  minAmount?: number
}

type NFTRequirement = {
  chain: string
  type: "hasNftWithSpecificId"
  address: string
  id: string
}

type AllowListRequirement = {
  chain: string
  type: "onAllowlist"
  addresses: Array<string>
}

type DaylightAbilityAction = {
  linkUrl: string
  completedBy: Array<{
    chain: string
    address: string
    functionHash: string
  }>
}

export type DaylightAbility = {
  type: DaylightAbilityType
  title: string
  description: string | null
  imageUrl: string | null
  openAt: string | null
  closeAt: string | null
  isClosed: boolean | null
  createdAt: string
  chain: string
  sourceId: string
  uid: string
  slug: string
  action: DaylightAbilityAction
  requirements: Array<DaylightAbilityRequirement>
}

type AbilitiesResponse = {
  abilities: Array<DaylightAbility>
  links: Record<string, unknown>
  status: string
}

type SpamReportResponse = {
  success: boolean
}

export const getDaylightAbilities = async (
  address: string
): Promise<DaylightAbility[]> => {
  try {
    const response: AbilitiesResponse = await fetchJson(
      // Abilities whose deadline has not yet passed - we will probably
      // want to turn this on once the feature is ready to go live
      // `${DAYLIGHT_BASE_URL}/${address}/abilities?deadline=set&type=mint&type=airdrop&type=access`
      `${DAYLIGHT_BASE_URL}/wallets/${address}/abilities?type=mint&type=airdrop&type=access`
    )

    return response.abilities
  } catch (err) {
    logger.error("Error getting abilities", err)
  }

  return []
}

/**
 * Report ability as spam.
 *
 * Learn more at https://docs.daylight.xyz/reference/create-spam-report
 *
 * @param address the address that reports the ability
 * @param abilitySlug the slug of the ability being reported
 * @param reason the reason why ability is reported
 */
export const createSpamReport = async (
  address: string,
  abilitySlug: string,
  reason: string
): Promise<boolean> => {
  try {
    const options = JSON.stringify({
      submitter: address,
      abilitySlug,
      reason,
    })

    const response: SpamReportResponse = await fetchJson(
      `${DAYLIGHT_BASE_URL}/spam-report`,
      options
    )

    return response.success
  } catch (err) {
    logger.error("Error reporting spam", err)
  }

  return false
}
