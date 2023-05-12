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

export const normalizeDaylightAbilities = (
  daylightAbilities: DaylightAbility[],
  address: NormalizedEVMAddress
): Ability[] => {
  const normalizedAbilities: Ability[] = []

  daylightAbilities.forEach((daylightAbility, idx) => {
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
      completed: daylightAbility.walletCompleted || false,
      removedFromUi: false,
      address,
      requirement: normalizeDaylightRequirements(
        // Just take the 1st requirement for now
        daylightAbility.requirements[0]
      ),
      magicOrderIndex: idx,
    })
  })

  return normalizedAbilities
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sortObjectByKeys = (object: any) =>
  Object.keys(object)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      const value = object[key]
      if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        value !== null
      ) {
        acc[key] = sortObjectByKeys(value)
      } else {
        acc[key] = value
      }
      return acc
    }, {})

interface Events extends ServiceLifecycleEvents {
  updatedAbilities: { address: NormalizedEVMAddress; abilities: Ability[] }
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
    this.pollForAbilities(normalizeEVMAddress(address))
    this.emitter.emit("newAccount", address)
  }

  async syncRemovedAbilities(abilities: Ability[]): Promise<void> {
    const cachedAbilities = await this.db.getAbilities()
    const abilitiesById = new Set(abilities.map(({ abilityId }) => abilityId))
    const diffAbilities = cachedAbilities.filter(
      (cachedAbility) => !abilitiesById.has(cachedAbility.abilityId)
    )
    const removedAbilities = diffAbilities.map((ability) => ({
      ...ability,
      removedFromUi: true,
    }))
    await this.db.updateAbilities(removedAbilities)
  }

  async updateAbilities(abilities: Ability[]): Promise<void> {
    const cachedAbilities = await this.db.getAbilities()
    const updatedAbilitiesByUser = cachedAbilities.reduce<Map<string, Ability>>(
      (acc, ability) => {
        if (ability.removedFromUi || ability.completed) {
          acc.set(ability.abilityId, ability)
        }
        return acc
      },
      new Map()
    )
    const updatedAbilities = abilities.reduce<Ability[]>((acc, ability) => {
      if (updatedAbilitiesByUser.has(ability.abilityId)) {
        const existingAbility = updatedAbilitiesByUser.get(ability.abilityId)
        if (
          JSON.stringify(sortObjectByKeys(ability)) !==
          JSON.stringify(sortObjectByKeys(existingAbility))
        ) {
          const { removedFromUi, completed } = existingAbility ?? {
            removedFromUi: false,
            completed: false,
          }
          // Update when the ability is marked as completed by Daylight but the cache status is not updated
          const updateCompleted = ability.completed && !completed

          acc.push({
            ...ability,
            removedFromUi,
            completed: updateCompleted ? true : completed,
          })
        }
      } else {
        acc.push(ability)
      }
      return acc
    }, [])

    await this.db.updateAbilities(updatedAbilities)
  }

  async pollForAbilities(address: NormalizedEVMAddress): Promise<void> {
    const daylightAbilities = await getDaylightAbilities(address)
    const normalizedAbilities = normalizeDaylightAbilities(
      daylightAbilities,
      address
    )
    /**
     * 1. Remove abilities from the cache
     * We are not able to get information about the removed abilities from the Daylight API.
     * To update the cache we have to compare the data with the received abilities.
     * The ability can be open completed or expired. Therefore, we need to get the abilities for these 3 types.
     */
    await this.syncRemovedAbilities(normalizedAbilities)
    /**
     * 2. Update existing abilities in the cache
     * We allow users to mark abilities as completed or removed, we do not want to overwrite this state.
     * There is an exception when the ability is marked as completed by Daylight we want to update this property as well.
     */
    await this.updateAbilities(normalizedAbilities)
    /**
     * 3. Redux state update
     */
    const abilities: Ability[] = await this.db.getSortedAbilities()

    this.emitter.emit("updatedAbilities", {
      address,
      abilities,
    })
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

    if (lastFetchTime && Number(lastFetchTime) + HOUR > Date.now()) {
      return
    }
    localStorage.setItem(this.ABILITY_TIME_KEY, Date.now().toString())
    const accountsToTrack = await this.chainService.getAccountsToTrack()
    const addresses = new Set(
      accountsToTrack.map((account) => normalizeEVMAddress(account.address))
    )

    // 1-by-1 decreases likelihood of hitting rate limit
    // eslint-disable-next-line no-restricted-syntax
    for (const address of addresses) {
      this.emitter.emit("initAbilities", address)
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
