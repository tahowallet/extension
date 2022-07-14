import { FiatCurrency } from "../../assets"
import { AddressOnNetwork, NameOnNetwork } from "../../accounts"
import { ServiceLifecycleEvents, ServiceCreatorFunction } from "../types"

import { Preferences, TokenListPreferences } from "./types"
import { getOrCreateDB, PreferenceDatabase } from "./db"
import BaseService from "../base"
import { normalizeEVMAddress } from "../../lib/utils"
import { ETHEREUM } from "../../constants"
import { EVMNetwork, sameNetwork } from "../../networks"
import { HexString } from "../../types"

type AddressBookEntry = {
  network: EVMNetwork
  address: HexString
  name: string
}

type InMemoryAddressBook = AddressBookEntry[]

const sameAddressBookEntry = (a: AddressOnNetwork, b: AddressOnNetwork) =>
  normalizeEVMAddress(a.address) === normalizeEVMAddress(b.address) &&
  sameNetwork(a.network, b.network)

const BUILT_IN_CONTRACTS = [
  {
    network: ETHEREUM,
    address: normalizeEVMAddress("0xDef1C0ded9bec7F1a1670819833240f027b25EfF"),
    name: "0x Router",
  },
  {
    network: ETHEREUM,
    // Uniswap v3 Router
    address: normalizeEVMAddress("0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"),
    name: "🦄 Uniswap",
  },
]

interface Events extends ServiceLifecycleEvents {
  preferencesChanges: Preferences
  initializeDefaultWallet: boolean
  initializeSelectedAccount: AddressOnNetwork
  addressBookEntryModified: AddressBookEntry
}

/*
 * The preference service manages user preference persistence, emitting an
 * event when preferences change.
 */
export default class PreferenceService extends BaseService<Events> {
  private knownContracts: InMemoryAddressBook = BUILT_IN_CONTRACTS

  private addressBook: InMemoryAddressBook = []

  /*
   * Create a new PreferenceService. The service isn't initialized until
   * startService() is called and resolved.
   */
  static create: ServiceCreatorFunction<Events, PreferenceService, []> =
    async () => {
      const db = await getOrCreateDB()

      return new this(db)
    }

  private constructor(private db: PreferenceDatabase) {
    super()
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService()

    this.emitter.emit("initializeDefaultWallet", await this.getDefaultWallet())
    this.emitter.emit(
      "initializeSelectedAccount",
      await this.getSelectedAccount()
    )
  }

  protected async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }

  // TODO Implement the following 6 methods as something stored in the database and user-manageable.
  // TODO Track account names in the UI in the address book.

  addOrEditNameInAddressBook(newEntry: AddressBookEntry): void {
    const correspondingEntryIndex = this.addressBook.findIndex((entry) =>
      sameAddressBookEntry(newEntry, entry)
    )
    if (correspondingEntryIndex !== -1) {
      this.addressBook[correspondingEntryIndex] = newEntry
    } else {
      this.addressBook.push({
        network: newEntry.network,
        name: newEntry.name,
        address: normalizeEVMAddress(newEntry.address),
      })
    }
    this.emitter.emit("addressBookEntryModified", newEntry)
  }

  lookUpAddressForName({
    name,
    network,
  }: NameOnNetwork): AddressOnNetwork | undefined {
    return this.addressBook.find(
      ({ name: entryName, network: entryNetwork }) =>
        sameNetwork(network, entryNetwork) && name === entryName
    )
  }

  lookUpNameForAddress(
    addressOnNetwork: AddressOnNetwork
  ): NameOnNetwork | undefined {
    return this.addressBook.find((addressBookEntry) =>
      sameAddressBookEntry(addressBookEntry, addressOnNetwork)
    )
  }

  async lookUpAddressForContractName({
    name,
    network,
  }: NameOnNetwork): Promise<AddressOnNetwork | undefined> {
    return this.knownContracts.find(
      ({ name: entryName, network: entryNetwork }) =>
        sameNetwork(network, entryNetwork) && name === entryName
    )
  }

  async lookUpNameForContractAddress({
    address,
    network,
  }: AddressOnNetwork): Promise<NameOnNetwork | undefined> {
    return this.knownContracts.find(
      ({ address: entryAddress, network: entryNetwork }) =>
        sameNetwork(network, entryNetwork) &&
        normalizeEVMAddress(address) === normalizeEVMAddress(entryAddress)
    )
  }

  async getCurrency(): Promise<FiatCurrency> {
    return (await this.db.getPreferences())?.currency
  }

  async getTokenListPreferences(): Promise<TokenListPreferences> {
    return (await this.db.getPreferences())?.tokenLists
  }

  async getDefaultWallet(): Promise<boolean> {
    return (await this.db.getPreferences())?.defaultWallet
  }

  async setDefaultWalletValue(newDefaultWalletValue: boolean): Promise<void> {
    return this.db.setDefaultWalletValue(newDefaultWalletValue)
  }

  async getSelectedAccount(): Promise<AddressOnNetwork> {
    return (await this.db.getPreferences())?.selectedAccount
  }

  async setSelectedAccount(addressNetwork: AddressOnNetwork): Promise<void> {
    return this.db.setSelectedAccount(addressNetwork)
  }
}
