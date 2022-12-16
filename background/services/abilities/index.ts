import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import { HexString } from "../../types"
import {
  DaylightAbility,
  DaylightAbilityRequirement,
  getDaylightAbilities,
} from "./daylight"
import { AbilitiesDatabase, getOrCreateDB } from "./db"
import ChainService from "../chain"

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
  abilityId: string
  linkUrl: string
  imageUrl?: string
  completed: boolean
  removedFromUi: boolean
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
        abilityId: daylightAbility.uid,
        linkUrl: daylightAbility.action.linkUrl,
        imageUrl: daylightAbility.imageUrl || undefined,
        completed: false,
        removedFromUi: false,
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

interface Events extends ServiceLifecycleEvents {
  newAbilities: Ability[]
}
export default class AbilitiesService extends BaseService<Events> {
  constructor(
    private db: AbilitiesDatabase,
    private chainService: ChainService
  ) {
    super({
      abilitiesAlarm: {
        schedule: {
          periodInMinutes: 60,
        },
        runAtStart: true,
        handler: () => {
          this.abilitiesAlarm()
        },
      },
    })
  }

  static create: ServiceCreatorFunction<
    ServiceLifecycleEvents,
    AbilitiesService,
    [Promise<ChainService>]
  > = async (chainService) => {
    return new this(await getOrCreateDB(), await chainService)
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()
    // const savedActiveAbilities = await this.db.getActiveAbilities()
    // this.emitter.emit("initializeSavedAbilities", savedActiveAbilities)
    this.chainService.emitter.on("newAccountToTrack", (addressOnNetwork) => {
      this.pollForAbilities(addressOnNetwork.address)
    })
  }

  async pollForAbilities(address: HexString): Promise<void> {
    const daylightAbilities = await getDaylightAbilities(address)
    const normalizedAbilities = normalizeDaylightAbilities(
      daylightAbilities,
      address
    )

    const newAbilities: Ability[] = []

    await Promise.all(
      normalizedAbilities.map(async (ability) => {
        const newAbility = await this.db.addNewAbility(ability)
        if (newAbility) {
          newAbilities.push(ability)
        }
      })
    )

    if (newAbilities.length) {
      this.emitter.emit("newAbilities", newAbilities)
    }
  }

  async markAbilityAsCompleted(
    address: string,
    abilityId: string
  ): Promise<void> {
    return this.db.markAsCompleted(address, abilityId)
  }

  async markAbilityAsRemoved(
    address: string,
    abilityId: string
  ): Promise<void> {
    return this.db.markAsRemoved(address, abilityId)
  }

  async abilitiesAlarm(): Promise<void> {
    const accountsToTrack = await this.chainService.getAccountsToTrack()
    // 1-by-1 decreases likelihood of hitting rate limit
    // eslint-disable-next-line no-restricted-syntax
    for (const address of accountsToTrack.map((account) => account.address)) {
      // eslint-disable-next-line no-await-in-loop
      await this.pollForAbilities(address)
    }
  }
}
