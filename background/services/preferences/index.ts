import browser from "webextension-polyfill"
import { FiatCurrency } from "../../assets"
import { AddressOnNetwork, NameOnNetwork } from "../../accounts"
import { ServiceLifecycleEvents, ServiceCreatorFunction } from "../types"

import {
  AnalyticsPreferences,
  Preferences as DbPreferences,
  TokenListPreferences,
  DismissableItem,
  getOrCreateDB,
  PreferenceDatabase,
} from "./db"
import BaseService from "../base"
import { normalizeEVMAddress, sameEVMAddress } from "../../lib/utils"
import { ETHEREUM, OPTIMISM, ARBITRUM_ONE } from "../../constants"
import {
  areNetworksAddressCompatible,
  EVMNetwork,
  sameNetwork,
} from "../../networks"
import { HexString, UNIXTime } from "../../types"
import { AccountSignerSettings } from "../../ui"
import { AccountSignerWithId } from "../../signing"
import SigningService from "../signing"

export {
  AnalyticsPreferences,
  ManuallyDismissableItem,
  SingleShotItem,
  DismissableItem,
} from "./db"

export type Preferences = Omit<DbPreferences, "id" | "savedAt">

type AddressBookEntry = {
  network: EVMNetwork
  address: HexString
  name: string
}

type InMemoryAddressBook = AddressBookEntry[]

const BUILT_IN_CONTRACTS = [
  {
    network: ETHEREUM,
    address: normalizeEVMAddress("0xDef1C0ded9bec7F1a1670819833240f027b25EfF"),
    name: "0x Router",
  },
  {
    network: OPTIMISM,
    address: normalizeEVMAddress("0xdef1abe32c034e558cdd535791643c58a13acc10"),
    name: "0x Router",
  },
  {
    network: ETHEREUM,
    // Uniswap v3 Router
    address: normalizeEVMAddress("0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"),
    name: "🦄 Uniswap",
  },
  {
    network: OPTIMISM,
    // Uniswap v3 Router
    address: normalizeEVMAddress("0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"),
    name: "🦄 Uniswap",
  },
  {
    network: ARBITRUM_ONE,
    // Uniswap v3 Router
    address: normalizeEVMAddress("0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"),
    name: "🦄 Uniswap",
  },
  {
    network: ETHEREUM,
    // Optimism's custodial Teleportr bridge
    // https://etherscan.io/address/0x52ec2f3d7c5977a8e558c8d9c6000b615098e8fc
    address: normalizeEVMAddress("0x52ec2f3d7c5977a8e558c8d9c6000b615098e8fc"),
    name: "🔴 Optimism Teleportr",
  },
  {
    network: OPTIMISM,
    // https://optimistic.etherscan.io/address/0x4200000000000000000000000000000000000010
    address: normalizeEVMAddress("0x4200000000000000000000000000000000000010"),
    name: "🔴 Optimism Teleportr",
  },
  {
    network: ETHEREUM,
    // Optimism's non-custodial Gateway bridge
    address: normalizeEVMAddress("0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1"),
    name: "🔴 Optimism Gateway",
  },
  {
    network: ETHEREUM,
    // Arbitrum's Delayed Inbox
    // https://etherscan.io/address/0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f
    address: normalizeEVMAddress("0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f"),
    name: "🔵 Arbitrum bridge",
  },
  {
    network: ETHEREUM,
    // Arbitrum's old bridge contract
    // https://etherscan.io/address/0x011b6e24ffb0b5f5fcc564cf4183c5bbbc96d515
    address: normalizeEVMAddress("0x011B6E24FfB0B5f5fCc564cf4183C5BBBc96D515"),
    name: "🔵 Arbitrum Old Bridge",
  },
]

interface Events extends ServiceLifecycleEvents {
  preferencesChanges: Preferences
  initializeDefaultWallet: boolean
  initializeSelectedAccount: AddressOnNetwork
  initializeShownDismissableItems: DismissableItem[]
  initializeNotificationsPreferences: boolean
  updateAnalyticsPreferences: AnalyticsPreferences
  addressBookEntryModified: AddressBookEntry
  updatedSignerSettings: AccountSignerSettings[]
  updateAutoLockInterval: UNIXTime
  dismissableItemMarkedAsShown: DismissableItem
  setNotificationsPermission: boolean
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
  static create: ServiceCreatorFunction<
    Events,
    PreferenceService,
    [Promise<SigningService>]
  > = async (signingService) => {
    const db = await getOrCreateDB()

    return new this(db, await signingService)
  }

  private constructor(
    private db: PreferenceDatabase,
    private signingService: SigningService
  ) {
    super()
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()

    this.emitter.emit("initializeDefaultWallet", await this.getDefaultWallet())
    this.emitter.emit(
      "initializeSelectedAccount",
      await this.getSelectedAccount(),
    )
    this.emitter.emit(
      "updateAnalyticsPreferences",
      await this.getAnalyticsPreferences(),
    )
    this.emitter.emit(
      "initializeShownDismissableItems",
      await this.getShownDismissableItems(),
    )

    this.emitter.emit(
      "initializeNotificationsPreferences",
      await this.getShouldShowNotificationsPreferences(),
    )
  }

  protected override async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }

  // FIXME Move to a separate service, as sameAddressBookEntry will require
  // FIXME signing service isControlCompatible checks and the preference
  // FIXME service needs to remain independent of other services.
  // TODO Implement the following 6 methods as something stored in the database
  // TODO and user-manageable.
  private sameAddressBookEntry(a: AddressOnNetwork, b: AddressOnNetwork) {
    return (
      normalizeEVMAddress(a.address) === normalizeEVMAddress(b.address) &&
      this.signingService.isControlCompatible(a, b.network)
    )
  }

  addOrEditNameInAddressBook(newEntry: AddressBookEntry): void {
    // FIXME Edits need to take place with some sort of identifier for the
    // FIXME entry, since names can come from a different network.
    const correspondingEntryIndex = this.addressBook.findIndex((entry) =>
      this.sameAddressBookEntry(newEntry, entry)
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
    return (
      this.addressBook.find(
        ({ name: entryName, network: entryNetwork }) =>
          sameNetwork(network, entryNetwork) && name === entryName
      ) ??
      // If no direct match is found, fall back on the first matching name on
      // an address-compatible network.
      this.addressBook.find(
        ({ name: entryName, network: entryNetwork }) =>
          name === entryName &&
          areNetworksAddressCompatible(network, entryNetwork)
      )
    )
  }

  lookUpNameForAddress(
    addressOnNetwork: AddressOnNetwork,
  ): NameOnNetwork | undefined {
    const { address, network } = addressOnNetwork
    return (
      this.addressBook.find((addressBookEntry) =>
        sameAddressBookEntry(addressBookEntry, addressOnNetwork)
      ) ??
      // If no direct match is found, fall back on the first matching address on
      // an address-compatible network.
      this.addressBook.find(
        ({ address: entryAddress, network: entryNetwork }) =>
          sameEVMAddress(address, entryAddress) &&
          areNetworksAddressCompatible(network, entryNetwork)
      )
    )
  }

  async lookUpAddressForContractName({
    name,
    network,
  }: NameOnNetwork): Promise<AddressOnNetwork | undefined> {
    return this.knownContracts.find(
      ({ name: entryName, network: entryNetwork }) =>
        sameNetwork(network, entryNetwork) && name === entryName,
    )
  }

  async lookUpNameForContractAddress({
    address,
    network,
  }: AddressOnNetwork): Promise<NameOnNetwork | undefined> {
    return this.knownContracts.find(
      ({ address: entryAddress, network: entryNetwork }) =>
        sameNetwork(network, entryNetwork) &&
        normalizeEVMAddress(address) === normalizeEVMAddress(entryAddress),
    )
  }

  // FIXME This should not be publicly accessible, but triggered by observing
  // FIXME an event on the signer service.
  async deleteAccountSignerSettings(
    signer: AccountSignerWithId,
  ): Promise<void> {
    const updatedSignerSettings =
      await this.db.deleteAccountSignerSettings(signer)

    this.emitter.emit("updatedSignerSettings", updatedSignerSettings)
  }

  async updateAccountSignerTitle(
    signer: AccountSignerWithId,
    title: string,
  ): Promise<void> {
    const updatedSignerSettings = this.db.updateSignerTitle(signer, title)

    this.emitter.emit("updatedSignerSettings", await updatedSignerSettings)
  }

  async markDismissableItemAsShown(item: DismissableItem): Promise<void> {
    await this.db.markDismissableItemAsShown(item)

    this.emitter.emit("dismissableItemMarkedAsShown", item)
  }

  async getShownDismissableItems(): Promise<DismissableItem[]> {
    return this.db.getShownDismissableItems()
  }

  async getAnalyticsPreferences(): Promise<Preferences["analytics"]> {
    return (await this.db.getPreferences())?.analytics
  }

  async updateAnalyticsPreferences(
    analyticsPreferences: Partial<AnalyticsPreferences>,
  ): Promise<void> {
    await this.db.upsertAnalyticsPreferences(analyticsPreferences)
    const { analytics } = await this.db.getPreferences()

    this.emitter.emit("updateAnalyticsPreferences", analytics)
  }

  async getShouldShowNotificationsPreferences(): Promise<boolean> {
    return (await this.db.getPreferences()).shouldShowNotifications
  }

  async setShouldShowNotifications(shouldShowNotifications: boolean) {
    if (shouldShowNotifications) {
      const granted = await browser.permissions.request({
        permissions: ["notifications"],
      })

      await this.db.setShouldShowNotifications(granted)
      this.emitter.emit("setNotificationsPermission", granted)

      return granted
    }

    return false
  }

  async getAccountSignerSettings(): Promise<AccountSignerSettings[]> {
    return this.db.getAccountSignerSettings()
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

  async getAutoLockInterval(): Promise<number> {
    return (await this.db.getPreferences()).autoLockInterval
  }

  async updateAutoLockInterval(newValue: number): Promise<void> {
    await this.db.setAutoLockInterval(newValue)
    this.emitter.emit("updateAutoLockInterval", newValue)
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
