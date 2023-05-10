import Dexie from "dexie"
import { Ability } from "../../abilities"
import { HexString, NormalizedEVMAddress } from "../../types"

export class AbilitiesDatabase extends Dexie {
  private abilities!: Dexie.Table<Ability, string>

  constructor() {
    super("tally/abilities")

    this.version(1).stores({
      /**
       * There is no need to use auto-incremented primary key if you want to use the bulkPut method.
       * Using this primary key causes an error when applying the method.
       * Boolean can't be indexed. Let's remove the unnecessary indexes.
       */
      abilities: "++id, &[abilityId+address], removedFromUi, completed",
    })

    this.version(2)
      .stores({
        abilities: null,
        abilitiesTemp: "&[abilityId+address]",
      })
      .upgrade(async (tx) => {
        const abilities = await tx.table("abilities").toArray()
        await tx.table("abilitiesTemp").bulkAdd(abilities)
      })

    this.version(3)
      .stores({
        abilitiesTemp: null,
        abilities: "&[abilityId+address]",
      })
      .upgrade(async (tx) => {
        const abilities = await tx.table("abilitiesTemp").toArray()
        await tx.table("abilities").bulkAdd(abilities)
      })
  }

  async updateAbilities(abilities: Ability[]): Promise<void> {
    await this.abilities.bulkPut(abilities)
  }

  async getAllAbilities(): Promise<Ability[]> {
    return this.abilities.toArray()
  }

  async getAbility(
    address: NormalizedEVMAddress,
    abilityId: string
  ): Promise<Ability | undefined> {
    return this.abilities.get({ address, abilityId })
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
