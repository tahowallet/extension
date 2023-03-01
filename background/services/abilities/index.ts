import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import { HexString, NormalizedEVMAddress } from "../../types"
import {
  createSpamReport,
  DaylightAbility,
  DaylightAbilityRequirement,
  getDaylightAbilities,
} from "../../lib/daylight"
import { AbilitiesDatabase, getOrCreateDB } from "./db"
import ChainService from "../chain"
import { normalizeEVMAddress } from "../../lib/utils"
import { Ability, AbilityRequirement } from "../../abilities"
import LedgerService from "../ledger"
import { HOUR } from "../../constants"

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
    normalizedAbilities.push({
      type: daylightAbility.type,
      title: daylightAbility.title,
      description: daylightAbility.description,
      abilityId: daylightAbility.uid,
      slug: daylightAbility.slug,
      linkUrl: daylightAbility.action.linkUrl,
      imageUrl: daylightAbility.imageUrl || undefined,
      openAt: daylightAbility.openAt || undefined,
      closeAt: daylightAbility.closeAt || undefined,
      completed: false,
      removedFromUi: false,
      address: normalizeEVMAddress(address),
      requirement: normalizeDaylightRequirements(
        // Just take the 1st requirement for now
        daylightAbility.requirements[0]
      ),
    })
  })

  return normalizedAbilities
}

interface Events extends ServiceLifecycleEvents {
  newAbilities: Ability[]
  updatedAbility: Ability
  newAccount: string
  deleteAccount: string
  initAbilities: NormalizedEVMAddress
  deleteAbilities: string
}
export default class AbilitiesService extends BaseService<Events> {
  constructor(
    private db: AbilitiesDatabase,
    private chainService: ChainService,
    private ledgerService: LedgerService
  ) {
    super()
  }

  private ABILITY_TIME_KEY = "LAST_ABILITY_FETCH_TIME"

  static create: ServiceCreatorFunction<
    ServiceLifecycleEvents,
    AbilitiesService,
    [Promise<ChainService>, Promise<LedgerService>]
  > = async (chainService, ledgerService) => {
    return new this(
      await getOrCreateDB(),
      await chainService,
      await ledgerService
    )
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()
  }

  // Should only be called with ledger or imported accounts
  async getNewAccountAbilities(address: string): Promise<void> {
    this.pollForAbilities(address)
    this.emitter.emit("newAccount", address)
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
        const isNewAbility = await this.db.addNewAbility(ability)
        if (isNewAbility) {
          newAbilities.push(ability)
        }
      })
    )

    if (newAbilities.length) {
      this.emitter.emit("newAbilities", newAbilities)
    }
  }

  async markAbilityAsCompleted(
    address: NormalizedEVMAddress,
    abilityId: string
  ): Promise<void> {
    const ability = await this.db.markAsCompleted(address, abilityId)

    if (ability) {
      this.emitter.emit("updatedAbility", ability)
    }
  }

  async markAbilityAsRemoved(
    address: NormalizedEVMAddress,
    abilityId: string
  ): Promise<void> {
    const ability = await this.db.markAsRemoved(address, abilityId)

    if (ability) {
      this.emitter.emit("updatedAbility", ability)
    }
  }

  async refreshAbilities(): Promise<void> {
    const lastFetchTime = localStorage.getItem(this.ABILITY_TIME_KEY)

    if (lastFetchTime && Number(lastFetchTime) + HOUR < Date.now()) {
      return
    }
    localStorage.setItem(this.ABILITY_TIME_KEY, Date.now().toString())
    const accountsToTrack = await this.chainService.getAccountsToTrack()
    const addresses = new Set(accountsToTrack.map((account) => account.address))

    // 1-by-1 decreases likelihood of hitting rate limit
    // eslint-disable-next-line no-restricted-syntax
    for (const address of addresses) {
      this.emitter.emit("initAbilities", address as NormalizedEVMAddress)
    }
  }

  async reportAndRemoveAbility(
    address: NormalizedEVMAddress,
    abilitySlug: string,
    abilityId: string,
    reason: string
  ): Promise<void> {
    await createSpamReport(address, abilitySlug, reason)
    this.markAbilityAsRemoved(address, abilityId)
  }

  async deleteAbilitiesForAccount(address: HexString): Promise<void> {
    const deletedRecords = await this.db.deleteAbilitiesForAccount(address)

    if (deletedRecords > 0) {
      this.emitter.emit("deleteAbilities", address)
    }
    this.emitter.emit("deleteAccount", address)
  }
}
