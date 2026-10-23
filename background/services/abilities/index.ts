import type { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import type { HexString, NormalizedEVMAddress } from "../../types"
import {
  createSpamReport,
  DaylightAbility,
  DaylightAbilityRequirement,
  // getDaylightAbilities,
} from "../../lib/daylight"
import { AbilitiesDatabase, getOrCreateDB } from "./db"
import ChainService from "../chain"
import { normalizeEVMAddress } from "../../lib/utils"
import { Ability, AbilityRequirement } from "../../abilities"
import LedgerService from "../ledger"
import { HOUR } from "../../constants"

const normalizeDaylightRequirements = (
  requirement: DaylightAbilityRequirement,
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
  address: NormalizedEVMAddress,
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
        daylightAbility.requirements[0],
      ),
      interestRank: idx,
    })
  })

  return normalizedAbilities
}

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
    private ledgerService: LedgerService,
  ) {
    super()
  }

  private ABILITY_TIME_KEY = "LAST_ABILITY_FETCH_TIME"

  static create: ServiceCreatorFunction<
    ServiceLifecycleEvents,
    AbilitiesService,
    [Promise<ChainService>, Promise<LedgerService>]
  > = async (chainService, ledgerService) =>
    new this(await getOrCreateDB(), await chainService, await ledgerService)

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()
    await this.fetchAbilities()
  }

  // Should only be called with ledger or imported accounts
  async getNewAccountAbilities(address: string): Promise<void> {
    this.pollForAbilities(normalizeEVMAddress(address))
    this.emitter.emit("newAccount", address)
  }

  /**
   * Syncs a set of new abilities against the ones being tracked in the cache.
   * Adds new abilities, marks existing ones as completed if the new entry
   * indicates they've been completed, and marks any abilities that are not in
   * the new set as removed from the UI.
   *
   * @return The latest sorted abilities list.
   */
  private async syncAbilities(latestAbilities: Ability[]): Promise<Ability[]> {
    const cachedAbilities = await this.db.getAbilities()
    const cachedAbilitiesById = Object.fromEntries(
      cachedAbilities.map((ability) => [ability.abilityId, ability]),
    )

    const syncedAbilities = latestAbilities.map((latestAbility) => {
      const cachedAbility = cachedAbilitiesById[latestAbility.abilityId]
      // Delete the cached entry so we can use the final set of ids in
      // cachedAbilitiesById as a proxy for ids that were not seen in the
      // latest abilities.
      delete cachedAbilitiesById[latestAbility.abilityId]

      const cachedCompleted = cachedAbility?.completed ?? false

      return {
        ...latestAbility,
        removedFromUi: cachedAbility?.removedFromUi ?? false,
        completed: cachedCompleted || latestAbility.completed,
      }
    })

    const removedAbilities = Object.values(cachedAbilitiesById)
    if (removedAbilities.length > 0) {
      await this.db.removeAbilities(removedAbilities)
    }
    await this.db.updateAbilities(syncedAbilities)

    return this.db.getSortedAbilities()
  }

  // Re-enable once polling is re-enabled.
  // oxlint-disable-next-line class-methods-use-this, no-unused-vars
  async pollForAbilities(address: NormalizedEVMAddress): Promise<void> {
    // FIXME Disabled due to high usage on the Daylight side. UI should also be
    // FIXME disconnected. Re-enabling should involve reconsidering our
    // FIXME fetch/sync strategy to be based on user access/usage or other
    // FIXME triggers, or be aggressively throttled when there is no direct
    // FIXME user interaction.
    /*
    const latestDaylightAbilities = await getDaylightAbilities(address)
    const latestAbilities = normalizeDaylightAbilities(
      latestDaylightAbilities,
      address,
    )

    const updatedAbilities = await this.syncAbilities(latestAbilities)

    this.emitter.emit("updatedAbilities", {
      address,
      abilities: updatedAbilities,
    })
    */
  }

  async markAbilityAsCompleted(
    address: NormalizedEVMAddress,
    abilityId: string,
  ): Promise<void> {
    const ability = await this.db.markAsCompleted(address, abilityId)

    if (ability) {
      this.emitter.emit("updatedAbility", ability)
    }
  }

  async markAbilityAsRemoved(
    address: NormalizedEVMAddress,
    abilityId: string,
  ): Promise<void> {
    const ability = await this.db.markAsRemoved(address, abilityId)

    if (ability) {
      this.emitter.emit("updatedAbility", ability)
    }
  }

  async fetchAbilities(): Promise<void> {
    // localStorage.setItem(this.ABILITY_TIME_KEY, Date.now().toString())
    const accountsToTrack = await this.chainService.getAccountsToTrack()
    const addresses = new Set(
      accountsToTrack.map((account) => normalizeEVMAddress(account.address)),
    )

    // 1-by-1 decreases likelihood of hitting rate limit
    for (const address of addresses) {
      this.emitter.emit("initAbilities", address)
    }
  }

  async refreshAbilities(): Promise<void> {
    const lastFetchTime = Date.now() // localStorage.getItem(this.ABILITY_TIME_KEY)

    if (lastFetchTime && Number(lastFetchTime) + HOUR > Date.now()) {
      return
    }
    await this.fetchAbilities()
  }

  async reportAndRemoveAbility(
    address: NormalizedEVMAddress,
    abilitySlug: string,
    abilityId: string,
    reason: string,
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
