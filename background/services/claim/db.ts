import Dexie, { Transaction } from "dexie"
import DEFAULT_CLAIM from "./defaults"
import { Claim, Eligible } from "./types"

export class ClaimDatabase extends Dexie {
  private claim!: Dexie.Table<Claim, number>

  constructor() {
    super("tally/claim")

    this.version(1).stores({
      claim: "&address",
    })

    this.on("populate", (tx: Transaction) => {
      tx.table("claim").bulkAdd(DEFAULT_CLAIM.eligibles)
    })
  }

  async getClaim(address: string): Promise<Eligible> {
    // Replace this with logic for user selected address
    const result = await this.claim.get({
      address,
    })

    // TODO: Clean up this type
    return result as unknown as Eligible
  }
}

export async function getOrCreateDB(): Promise<ClaimDatabase> {
  return new ClaimDatabase()
}
