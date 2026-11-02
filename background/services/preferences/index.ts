import browser from "webextension-polyfill"
import { FiatCurrency } from "../../assets"
import type { AddressOnNetwork, NameOnNetwork } from "../../accounts"
import type { ServiceLifecycleEvents, ServiceCreatorFunction } from "../types"

import {
  AnalyticsPreferences,
  Preferences as DbPreferences,
  TokenListPreferences,
  DismissableItem,
  getOrCreateDB,
  PreferenceDatabase,
} from "./db"
import BaseService from "../base"
import { normalizeEVMAddress } from "../../lib/utils"
import {
  ETHEREUM,
  OPTIMISM,
  ARBITRUM_ONE,
  POLYGON,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
} from "../../constants"
import { EVMNetwork, sameNetwork } from "../../networks"
import type { HexString, UNIXTime } from "../../types"
import { AccountSignerSettings } from "../../ui"
import { AccountSignerWithId } from "../../signing"

export type {
  AnalyticsPreferences,
  ManuallyDismissableItem,
  SingleShotItem,
  DismissableItem,
} from "./db"

export type Preferences = Omit<DbPreferences, "id" | "savedAt">

type KnownContract = {
  network: EVMNetwork
  address: HexString
  name: string
}

const BUILT_IN_CONTRACTS: KnownContract[] = [
  {
    network: ETHEREUM,
    // 0x v1 Exchange Proxy
    address: normalizeEVMAddress("0xDef1C0ded9bec7F1a1670819833240f027b25EfF"),
    name: "Swaps Router",
  },
  {
    network: OPTIMISM,
    // 0x v1 Exchange Proxy
    address: normalizeEVMAddress("0xdef1abe32c034e558cdd535791643c58a13acc10"),
    name: "Swaps Router",
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
  {
    network: ETHEREUM,
    // 0x Swap v2 Allowance Holder
    address: normalizeEVMAddress("0x0000000000001fF3684f28c67538d4D072C22734"),
    name: "Swaps Approval Router",
  },
  {
    network: OPTIMISM,
    // 0x Swap v2 Allowance Holder
    address: normalizeEVMAddress("0x0000000000001fF3684f28c67538d4D072C22734"),
    name: "Swaps Approval Router",
  },
  {
    network: ARBITRUM_ONE,
    // 0x Swap v2 Allowance Holder
    address: normalizeEVMAddress("0x0000000000001fF3684f28c67538d4D072C22734"),
    name: "Swaps Approval Router",
  },
  {
    network: POLYGON,
    // 0x Swap v2 Allowance Holder
    address: normalizeEVMAddress("0x0000000000001fF3684f28c67538d4D072C22734"),
    name: "Swaps Approval Router",
  },
  {
    network: AVALANCHE,
    // 0x Swap v2 Allowance Holder
    address: normalizeEVMAddress("0x0000000000001fF3684f28c67538d4D072C22734"),
    name: "Swaps Approval Router",
  },
  {
    network: BINANCE_SMART_CHAIN,
    // 0x Swap v2 Allowance Holder
    address: normalizeEVMAddress("0x0000000000001fF3684f28c67538d4D072C22734"),
    name: "Swaps Approval Router",
  },
]

interface Events extends ServiceLifecycleEvents {
  preferencesChanges: Preferences
  initializeDefaultWallet: boolean
  initializeSelectedAccount: AddressOnNetwork
  initializeShownDismissableItems: DismissableItem[]
  initializeNotificationsPreferences: boolean
  initializeShowTestNetworks: boolean
  updateAnalyticsPreferences: AnalyticsPreferences
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
  private knownContracts: KnownContract[] = BUILT_IN_CONTRACTS

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

    this.emitter.emit(
      "initializeShowTestNetworks",
      await this.getShowTestNetworks(),
    )
  }

  protected override async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }

  // The user's address book is held by the NameService; these cover the
  // built-in names for well-known contracts.

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

  /**
   * This guards against invalid state by checking if permissions have
   * been granted by the browser
   */
  async setShouldShowNotifications(shouldShowNotifications: boolean) {
    const hasBrowserPermissions = await browser.permissions.contains({
      permissions: ["notifications"],
    })

    const updatedValue = hasBrowserPermissions && shouldShowNotifications

    await this.db.setShouldShowNotifications(updatedValue)
    this.emitter.emit("setNotificationsPermission", updatedValue)

    return updatedValue
  }

  async getAccountSignerSettings(): Promise<AccountSignerSettings[]> {
    return this.db.getAccountSignerSettings()
  }

  async getCurrency(): Promise<FiatCurrency> {
    return (await this.db.getPreferences())?.currency
  }

  async setShowTestNetworks(value: boolean): Promise<void> {
    await this.db.setShowTestNetworks(value)
  }

  async getShowTestNetworks(): Promise<boolean> {
    return (await this.db.getPreferences()).showTestNetworks
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
    return (await this.db.getPreferences()).selectedAccount
  }

  async setSelectedAccount(addressNetwork: AddressOnNetwork): Promise<void> {
    return this.db.setSelectedAccount(addressNetwork)
  }
}
