import Dexie from "dexie"
import { FeatureFlags, isEnabled } from "../../features"
import type { Ability } from "."

export class AbilitiesDatabase extends Dexie {
  private abilities!: Dexie.Table<Ability, string>

  constructor() {
    super("tally/abilities")

    // No tables are created when feature flag is off
    if (isEnabled(FeatureFlags.SUPPORT_ABILITIES)) {
      this.version(1).stores({
        abilities: "++id, &[abilityId+address], removedFromUi, completed",
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
    return (
      await this.abilities.where({
        removedFromUi: false,
      })
    ).toArray()
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

  async markAsRemoved(address: string, abilityId: string): Promise<void> {
    const ability = await this.getAbility(address, abilityId)
    if (!ability) {
      throw new Error("Ability does not exist")
    }
    this.abilities.put({
      ...ability,
      removedFromUi: true,
    })
  }
}

export async function getOrCreateDB(): Promise<AbilitiesDatabase> {
  return new AbilitiesDatabase()
}
