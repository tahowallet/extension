import Dexie, { IndexableTypeArrayReadonly } from "dexie"
import { ABILITY_TYPES, Ability } from "../../abilities"
import { HexString, NormalizedEVMAddress } from "../../types"

export class AbilitiesDatabase extends Dexie {
  private abilities!: Dexie.Table<Ability, [string, string]>

  constructor() {
    super("tally/abilities")

    this.version(1).stores({
      abilities: "++id, &[abilityId+address], removedFromUi, completed",
    })
    // There is no need to use auto-incremented primary key if you want to use the bulkPut method.
    // Using this primary key causes an error when applying the method,
    // Additionally, Boolean can't be indexed. Let's remove the unnecessary indexes.
    this.version(2)
      .stores({
        abilities: null,
        abilitiesTemp: "&[abilityId+address], interestRank",
      })
      .upgrade(async (tx) => {
        const abilities = await tx.table("abilities").toArray()
        // Remove abilities from the db whose types are not supported
        const filteredAbilities = abilities.filter(({ type }) =>
          ABILITY_TYPES.includes(type)
        )
        await tx.table("abilitiesTemp").bulkAdd(filteredAbilities)
      })

    this.version(3)
      .stores({
        abilitiesTemp: null,
        abilities: "&[abilityId+address], interestRank",
      })
      .upgrade(async (tx) => {
        const abilities = await tx.table("abilitiesTemp").toArray()
        await tx.table("abilities").bulkAdd(abilities)
      })
  }

  async updateAbilities(abilities: Ability[]): Promise<void> {
    await this.abilities.bulkPut(abilities)
  }

  async removeAbilities(abilities: Ability[]): Promise<void> {
    const keys = abilities.map(({ abilityId, address }) => [
      abilityId,
      address,
    ]) as unknown as IndexableTypeArrayReadonly
    await this.abilities.bulkDelete(keys)
  }

  async getAbilities(): Promise<Ability[]> {
    return this.abilities.toArray()
  }

  async getSortedAbilities(): Promise<Ability[]> {
    return this.abilities.orderBy("interestRank").toArray()
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
