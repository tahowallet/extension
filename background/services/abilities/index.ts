import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import { HexString } from "../../types"
import { DaylightAbility, getDaylightAbilities } from "./daylight"

export type AbilityType = "mint"

export type Ability = {
  type: AbilityType
  title: string
  description: string | null
  uuid: string
  linkUrl: string
  imageUrl?: string
  completed: boolean
  address: string
}

const normalizeDaylightAbilities = (
  daylightAbilities: DaylightAbility[],
  address: string
): Ability[] => {
  const normalizedAbilities: Ability[] = []

  daylightAbilities.forEach((daylightAbility) => {
    // Lets start with just mints
    if (daylightAbility.type !== "mint") {
      return
    }
    normalizedAbilities.push({
      type: daylightAbility.type,
      title: daylightAbility.title,
      description: daylightAbility.description,
      uuid: daylightAbility.uid,
      linkUrl: daylightAbility.action.linkUrl,
      imageUrl: daylightAbility.imageUrl || undefined,
      completed: false,
      address,
    })
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

    console.log(daylightAbilities)
    return normalizeDaylightAbilities(daylightAbilities, address)
  }

  //   override async internalStartService(): Promise<void> {}
}
