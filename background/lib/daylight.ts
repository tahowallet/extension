import { fetchJson } from "@ethersproject/web"
import { AbilityType } from "../abilities"
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

// More query params
// https://docs.daylight.xyz/reference/get_v1-wallets-address-abilities
const QUERY_PARAMS = {
  // The most interesting abilities will be the first
  sort: "magic",
  sortDirection: "desc",
  // The limit needs to be set. It is set to the highest value.
  limit: "1000",
  deadline: "all",
}

export const getDaylightAbilities = async (
  address: string,
  // Amount of times to retry fetching abilities for an address that is not fully synced yet.
  // https://docs.daylight.xyz/reference/retrieve-wallets-abilities
  retries = DEFAULT_RETRIES
): Promise<DaylightAbility[]> => {
  try {
    const params = Object.entries(QUERY_PARAMS)
      .reduce((result, [key, value]) => {
        return result.concat("&", `${key}=${value}`)
      }, "")
      .substring(1)
    const response: AbilitiesResponse = await fetchJson({
      url: `${DAYLIGHT_BASE_URL}/wallets/${address}/abilities?${params}`,
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
