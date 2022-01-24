import Dexie, { Transaction } from "dexie"
import { AddressNetwork } from "../../accounts"
import { HexString } from "../../types"

export interface LedgerAccount {
  address: HexString
  path: string
}

export class LedgerDatabase extends Dexie {
  private accounts!: Dexie.Table<LedgerAccount, number>

  constructor() {
    super("tally/ledgers")

    this.version(1).stores({
      ledgers: "&address",
    })
  }

  async addAccount(account: LedgerAccount): Promise<void> {
    await this.accounts.add(account)
  }

  async getAccountByAddress(address: HexString): Promise<LedgerAccount | null> {
    return (
      (await this.accounts.where("address").equals(address).first()) ?? null
    )
  }
}

export async function getOrCreateDB(): Promise<LedgerDatabase> {
  return new LedgerDatabase()
}
