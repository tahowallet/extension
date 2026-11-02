import Dexie from "dexie"
import { normalizeEVMAddress } from "../../lib/utils"
import type { HexString, NormalizedEVMAddress } from "../../types"
import type {
  KeyringAccountSigner,
  PrivateKeyAccountSigner,
} from "../internal-signer"

/**
 * A persisted record of which internal signer (keyring or private key) can
 * sign for an address. Persisting it lets the signing service answer signer
 * questions while the internal signer is locked, e.g. right after startup.
 */
export type InternalSignerAddressRow = {
  address: NormalizedEVMAddress
  signer: KeyringAccountSigner | PrivateKeyAccountSigner
}

export class SigningDatabase extends Dexie {
  private internalSignerAddresses!: Dexie.Table<
    InternalSignerAddressRow,
    NormalizedEVMAddress
  >

  constructor() {
    super("tally/signing")

    this.version(1).stores({
      internalSignerAddresses: "address",
    })
  }

  /**
   * Replace every internal signer address row in one transaction.
   */
  async replaceAll(rows: InternalSignerAddressRow[]): Promise<void> {
    await this.transaction("rw", this.internalSignerAddresses, async () => {
      await this.internalSignerAddresses.clear()
      await this.internalSignerAddresses.bulkPut(rows)
    })
  }

  async getByAddress(
    address: HexString,
  ): Promise<InternalSignerAddressRow | null> {
    return (
      (await this.internalSignerAddresses.get(normalizeEVMAddress(address))) ??
      null
    )
  }
}

export async function getOrCreateDB(): Promise<SigningDatabase> {
  return new SigningDatabase()
}
