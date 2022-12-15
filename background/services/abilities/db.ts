import Dexie from "dexie"
import { FeatureFlags, isEnabled } from "../../features"
import type { Ability } from "."

export class AbilitiesDatabase extends Dexie {
  private abilities!: Dexie.Table<Ability, string>

  constructor() {
    super("tally/nfts")

    // No tables are created when feature flag is off
    if (isEnabled(FeatureFlags.SUPPORT_ABILITIES)) {
      this.version(1).stores({
        abilities: "++id, [abilityId+address], completed, spam",
      })
    }
  }

  async addNewAbility(ability: Ability): Promise<boolean> {
    // @TODO Use a cache here
    const existingAbility = await this.getAbility(
      ability.address,
      ability.abilityId
    )
    if (!existingAbility) {
      await this.abilities.add(ability)
      return true
    }
    return false
  }

  async getAbility(
    address: string,
    abilityId: string
  ): Promise<Ability | undefined> {
    return this.abilities.get({ address, abilityId })
  }

  async getActiveAbilities(): Promise<Ability[]> {
    return this.abilities
      .where({
        completed: false,
        spam: false,
      })
      .toArray()
  }

  async markAsCompleted(address: string, abilityId: string): Promise<void> {
    const ability = await this.getAbility(address, abilityId)
    if (!ability) {
      throw new Error("Ability does not exist")
    }
    this.abilities.put({
      ...ability,
      completed: true,
    })
  }

  async markAsSpam(address: string, abilityId: string): Promise<void> {
    const ability = await this.getAbility(address, abilityId)
    if (!ability) {
      throw new Error("Ability does not exist")
    }
    this.abilities.put({
      ...ability,
      spam: true,
    })
  }
}

export async function getOrCreateDB(): Promise<AbilitiesDatabase> {
  return new AbilitiesDatabase()
}
