import Dexie from "dexie"
import { normalizeEVMAddress } from "../../lib/utils"
import { HexString } from "../../types"

export interface QRHardwareAccount {
  address: HexString
  type: string
  cbor: string
}

export class QRHardwareDatabase extends Dexie {
  private qrHardware!: Dexie.Table<QRHardwareAccount, number>

  constructor() {
    super("tally/qr-hardware")

    this.version(1).stores({
      qrHardware: "&address,type,cbor",
    })
  }

  async addAccount(account: QRHardwareAccount): Promise<void> {
    await this.qrHardware.add(account)
  }

  async removeAccount(address: HexString): Promise<void> {
    await this.qrHardware
      .where("address")
      .equals(normalizeEVMAddress(address))
      .delete()
  }

  async getAccountByAddress(
    address: HexString
  ): Promise<QRHardwareAccount | null> {
    return (
      (await this.qrHardware
        .where("address")
        .equals(normalizeEVMAddress(address))
        .first()) ?? null
    )
  }
}

export async function getOrCreateDB(): Promise<QRHardwareDatabase> {
  return new QRHardwareDatabase()
}
