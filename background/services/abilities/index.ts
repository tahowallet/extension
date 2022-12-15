import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import { HexString } from "../../types"
import {
  DaylightAbility,
  DaylightAbilityRequirement,
  getDaylightAbilities,
} from "./daylight"

export type AbilityType = "mint" | "airdrop" | "access"

type AbilityRequirement = HoldERC20 | OwnNFT | AllowList | Unknown

type HoldERC20 = {
  type: "hold"
  address: string
}

type OwnNFT = {
  type: "own"
  nftAddress: string
}

type AllowList = {
  type: "allowList"
}

type Unknown = {
  type: "unknown"
}

export type Ability = {
  type: AbilityType
  title: string
  description: string | null
  uuid: string
  linkUrl: string
  imageUrl?: string
  completed: boolean
  address: string
  requirement: AbilityRequirement
}

const normalizeDaylightRequirements = (
  requirement: DaylightAbilityRequirement
): AbilityRequirement => {
  if (requirement.type === "hasTokenBalance") {
    return {
      type: "hold",
      address: requirement.address,
    }
  }

  if (requirement.type === "hasNftWithSpecificId") {
    return {
      type: "own",
      nftAddress: requirement.address,
    }
  }

  if (requirement.type === "onAllowlist") {
    return {
      type: "allowList",
    }
  }

  return {
    type: "unknown",
  }
}

const normalizeDaylightAbilities = (
  daylightAbilities: DaylightAbility[],
  address: string
): Ability[] => {
  const normalizedAbilities: Ability[] = []

  daylightAbilities.forEach((daylightAbility) => {
    // Lets start with just mints
    if (
      daylightAbility.type === "mint" ||
      daylightAbility.type === "airdrop" ||
      daylightAbility.type === "access"
    ) {
      normalizedAbilities.push({
        type: daylightAbility.type,
        title: daylightAbility.title,
        description: daylightAbility.description,
        uuid: daylightAbility.uid,
        linkUrl: daylightAbility.action.linkUrl,
        imageUrl: daylightAbility.imageUrl || undefined,
        completed: false,
        address,
        requirement: normalizeDaylightRequirements(
          // Just take the 1st requirement for now
          daylightAbility.requirements[0]
        ),
      })
    }
  })

  return normalizedAbilities
}

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

  async getAbilities(address: HexString): Promise<Ability[]> {
    if (Math.random() > 100) {
      console.log(this)
    }
    const daylightAbilities = await getDaylightAbilities(address)
    return normalizeDaylightAbilities(daylightAbilities, address)
  }

  //   override async internalStartService(): Promise<void> {}
}
