import { fetchJson } from "@ethersproject/web"
import { ABILITY_TYPES, AbilityType } from "../abilities"
import logger from "./logger"

const DAYLIGHT_BASE_URL = "https://api.daylight.xyz/v1"
const DEFAULT_RETRIES = 5 // # of times to retry fetching abilities with "pending" status

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
  type: AbilityType
  title: string
  description: string | null
  imageUrl: string | null
  openAt: string | null
  closeAt: string | null
  isClosed: boolean | null
  walletCompleted: boolean | null
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
  address: string,
  // Amount of times to retry fetching abilities for an address that is not fully synced yet.
  retries = DEFAULT_RETRIES,
): Promise<DaylightAbility[]> => {
  // Learn more at https://docs.daylight.xyz/reference/get_v1-wallets-address-abilities
  const requestURL = new URL(
    `${DAYLIGHT_BASE_URL}/wallets/${address}/abilities`,
  )
  // The most interesting abilities will be the first
  requestURL.searchParams.set("sort", "magic")
  requestURL.searchParams.set("sortDirection", "desc")
  // The limit needs to be set. It is set to the highest value.
  requestURL.searchParams.set("limit", "1000")
  requestURL.searchParams.append("showOnly", "open")
  requestURL.searchParams.append("showOnly", "completed")
  requestURL.searchParams.append("showOnly", "expired")
  ABILITY_TYPES.forEach((type) => requestURL.searchParams.append("type", type))
  requestURL.searchParams.set("markAsShown", "true")

  try {
    const response: AbilitiesResponse = await fetchJson({
      url: requestURL.toString(),
      ...(process.env.DAYLIGHT_API_KEY && {
        headers: {
          Authorization: `Bearer ${process.env.DAYLIGHT_API_KEY}`,
        },
      }),
    })

    if (retries > 0 && response.status === "pending") {
      return await getDaylightAbilities(address, retries - 1)
    }

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
  reason: string,
): Promise<boolean> => {
  try {
    const options = JSON.stringify({
      submitter: address,
      abilitySlug,
      reason,
    })

    const response: SpamReportResponse = await fetchJson(
      `${DAYLIGHT_BASE_URL}/spam-report`,
      options,
    )

    return response.success
  } catch (err) {
    logger.error("Error reporting spam", err)
  }

  return false
}
