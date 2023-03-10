import Dexie from "dexie"
import { Ability } from "../../abilities"
import { HexString, NormalizedEVMAddress } from "../../types"

export class AbilitiesDatabase extends Dexie {
  private abilities!: Dexie.Table<Ability, string>

  constructor() {
    super("tally/abilities")

    this.version(1).stores({
      abilities: "++id, &[abilityId+address], removedFromUi, completed",
    })
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
    const { id, ...correctAbility } = existingAbility as Ability & {
      id: number
    }
    if (JSON.stringify(correctAbility) !== JSON.stringify(ability)) {
      const updateCompleted =
        ability.completed === true && existingAbility.completed === false

      await this.abilities.update(existingAbility, {
        ...ability,
        completed: updateCompleted ? true : existingAbility.completed,
        removedFromUi: existingAbility.removedFromUi,
      })
      return true
    }
    return false
  }

  async getAbility(
    address: NormalizedEVMAddress,
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

  async markAsCompleted(
    address: NormalizedEVMAddress,
    abilityId: string
  ): Promise<Ability | undefined> {
    const ability = await this.getAbility(address, abilityId)
    if (ability) {
      const updatedAbility = {
        ...ability,
        completed: true,
      }
      this.abilities.put(updatedAbility)
      return updatedAbility
    }
    return undefined
  }

  async markAsRemoved(
    address: NormalizedEVMAddress,
    abilityId: string
  ): Promise<Ability | undefined> {
    const ability = await this.getAbility(address, abilityId)
    if (ability) {
      const updatedAbility = {
        ...ability,
        removedFromUi: true,
      }
      this.abilities.put(updatedAbility)
      return updatedAbility
    }
    return undefined
  }

  async deleteAbilitiesForAccount(address: HexString): Promise<number> {
    return this.abilities
      .filter((ability) => ability.address === address)
      .delete()
  }
}

export async function getOrCreateDB(): Promise<AbilitiesDatabase> {
  return new AbilitiesDatabase()
}
