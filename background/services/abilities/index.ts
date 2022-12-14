import { fetchJson } from "@ethersproject/web"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import { HexString } from "../../types"

const BASE_URL = "https://api.daylight.xyz/v1/wallets"

// https://docs.daylight.xyz/reference/ability-model#ability-types
type AbilityType =
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

type AbilityRequirement =
  | TokenBalanceRequirement
  | NFTRequirement
  | AllowListRequirement

type TokenBalanceRequirement = {
  chain: string
  type: string
  address: string
  community?: Array<Community>
  minAmount?: number
}

type NFTRequirement = {
  chain: string
  type: string
  address: string
  id: string
}

type AllowListRequirement = {
  chain: string
  type: string
  addresses: Array<string>
}

type AbilityAction = {
  linkUrl: string
  completedBy: Array<{
    chain: string
    address: string
    functionHash: string
  }>
}

type Ability = {
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
  action: AbilityAction
  requirements: Array<AbilityRequirement>
}

type AbilitiesResponse = {
  abilities: Array<Ability>
  links: Record<string, unknown>
  status: string
}

// Placeholder
// interface Events extends ServiceLifecycleEvents {}

export default class AbilitiesService extends BaseService<ServiceLifecycleEvents> {
  /**
   * Create a new AbilitiesService. The service isn't initialized until
   * startService() is called and resolved.
   *
   * @param preferenceService - Required for token metadata and currency
   *        preferences.
   * @param chainService - Required for chain interactions.
   * @returns A new, initializing AbilitiesService
   */
  static create: ServiceCreatorFunction<
    ServiceLifecycleEvents,
    AbilitiesService,
    []
  > = async () => {
    return new this()
  }

  async getAbilities(address: HexString): Promise<any> {
    if (Math.random() > 100) {
      console.log(this)
    }
    const foo: AbilitiesResponse = await fetchJson(
      `${BASE_URL}/${address}/abilities`
    )
    console.log(foo)
  }

  //   override async internalStartService(): Promise<void> {}
}
