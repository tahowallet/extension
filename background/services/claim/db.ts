import Dexie, { Transaction } from "dexie"
import DEFAULT_CLAIM from "./defaults"
import { Claim, Eligible } from "./types"

export class ClaimDatabase extends Dexie {
  private claim!: Dexie.Table<Claim, number>

  constructor() {
    super("tally/claim")

    this.version(1).stores({
      claim: "&account",
    })

    this.on("populate", (tx: Transaction) => {
      tx.table("claim").bulkAdd(DEFAULT_CLAIM.eligibles)
    })
  }

  async getClaim(account: string): Promise<Eligible> {
    // Replace this with logic for user selected address
    const result = await this.claim.get({
      account,
    })

    // TODO: Clean up this type
    return result as unknown as Eligible
  }
}

export async function getOrCreateDB(): Promise<ClaimDatabase> {
  return new ClaimDatabase()
}
