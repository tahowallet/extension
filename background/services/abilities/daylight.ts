import { fetchJson } from "@ethersproject/web"

const DAYLIGHT_BASE_URL = "https://api.daylight.xyz/v1/wallets"

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

// eslint-disable-next-line import/prefer-default-export
export const getDaylightAbilities = async (
  address: string
): Promise<DaylightAbility[]> => {
  const response: AbilitiesResponse = await fetchJson(
    // Abilities whose deadline has not yet passed
    // `${DAYLIGHT_BASE_URL}/${address}/abilities?deadline=set&type=mint&type=airdrop&type=access`
    `${DAYLIGHT_BASE_URL}/${address}/abilities?type=mint&type=airdrop&type=access`
  )

  return response.abilities
}
