import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import { HexString } from "../../types"
import { DaylightAbility, getDaylightAbilities } from "./daylight"

// Placeholder
// interface Events extends ServiceLifecycleEvents {}

type Ability = {
  type: "mint"
  title: string
  description: string | null
  uuid: string
  linkUrl: string
}

const normalizeDaylightAbilities = (
  daylightAbilities: DaylightAbility[]
): Ability[] => {
  const toReturn: Ability[] = []

  daylightAbilities.forEach((daylightAbility) => {
    if (daylightAbility.type !== "mint") {
      return
    }
    toReturn.push({
      type: daylightAbility.type,
      title: daylightAbility.title,
      description: daylightAbility.description,
      uuid: daylightAbility.uid,
      linkUrl: daylightAbility.action.linkUrl,
    })
  })

  return toReturn
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
    return normalizeDaylightAbilities(daylightAbilities)
  }

  //   override async internalStartService(): Promise<void> {}
}
