import Dexie from "dexie"
import type { EVMNetwork } from "../../networks"
import type { NormalizedEVMAddress, UNIXTime } from "../../types"

/**
 * A name the user gave an address on a particular network. The entry is saved
 * on that network only; whether it also applies on other networks is decided
 * at lookup time using control compatibility (see RFB 5), so that it never
 * outlives the conditions that made it apply.
 */
export type AddressBookEntry = {
  address: NormalizedEVMAddress
  network: EVMNetwork
  name: string
  createdAt: UNIXTime
  updatedAt: UNIXTime
}

type AddressBookRow = AddressBookEntry & {
  // Denormalized from `network`, for the primary key.
  chainID: string
}

export class NameDatabase extends Dexie {
  private addressBook!: Dexie.Table<AddressBookRow, [string, string]>

  constructor() {
    super("tally/names")

    this.version(1).stores({
      addressBook: "&[address+chainID], address, chainID",
    })
  }

  async getAddressBook(): Promise<AddressBookEntry[]> {
    return (await this.addressBook.toArray()).map(
      ({ chainID: _, ...entry }) => entry,
    )
  }

  async putAddressBookEntry(entry: AddressBookEntry): Promise<void> {
    await this.addressBook.put({ ...entry, chainID: entry.network.chainID })
  }

  async deleteAddressBookEntry(
    address: NormalizedEVMAddress,
    chainID: string,
  ): Promise<void> {
    await this.addressBook.delete([address, chainID])
  }
}

export async function getOrCreateDB(): Promise<NameDatabase> {
  return new NameDatabase()
}
