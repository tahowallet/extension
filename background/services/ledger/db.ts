import Dexie from "dexie"
import { normalizeEVMAddress } from "../../lib/utils"
import { HexString } from "../../types"

export interface LedgerAccount {
  ledgerId: string
  address: HexString
  path: string
}

export class LedgerDatabase extends Dexie {
  private ledger!: Dexie.Table<LedgerAccount, number>

  constructor() {
    super("tally/ledger")

    this.version(1).stores({
      ledger: "&address,ledgerId",
    })
  }

  async addAccount(account: LedgerAccount): Promise<void> {
    await this.ledger.add(account)
  }

  async getAccountByAddress(address: HexString): Promise<LedgerAccount | null> {
    return (
      (await this.ledger
        .where("address")
        .equals(normalizeEVMAddress(address))
        .first()) ?? null
    )
  }

  async getAllAccountsByLedgerId(ledgerId: string): Promise<LedgerAccount[]> {
    return this.ledger.where("ledgerId").equals(ledgerId).toArray()
  }
}

export async function getOrCreateDB(): Promise<LedgerDatabase> {
  return new LedgerDatabase()
}
