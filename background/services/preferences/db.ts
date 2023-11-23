import Dexie, { Transaction } from "dexie"

import { FiatCurrency } from "../../assets"
import { AddressOnNetwork } from "../../accounts"

import DEFAULT_PREFERENCES, { DEFAULT_AUTOLOCK_INTERVAL } from "./defaults"
import { AccountSignerSettings } from "../../ui"
import { AccountSignerWithId } from "../../signing"
import { NETWORK_BY_CHAIN_ID } from "../../constants"
import { UNIXTime } from "../../types"

type SignerRecordId = `${AccountSignerWithId["type"]}/${string}`

/**
 * Returns a unique id for an account signer
 * in the form of "signerType/someId" e.g. "ledger/deviceId"
 */
const getSignerRecordId = (signer: AccountSignerWithId): SignerRecordId => {
  switch (signer.type) {
    case "keyring":
      return `${signer.type}/${signer.keyringID}`
    case "private-key":
      return `${signer.type}/${signer.walletID}`
    default:
      return `${signer.type}/${signer.deviceID}`
  }
}

/**
 * Update Taho token list reference.
 * Returns an updated URLs for the token list.
 */
const getNewUrlsForTokenList = (
  storedPreferences: Preferences,
  oldPath: string,
  newPath: string,
): string[] => {
  // Get rid of old Taho URL
  const newURLs = storedPreferences.tokenLists.urls.filter(
    (url) => !url.includes(oldPath),
  )
  newURLs.push(`https://ipfs.io/ipfs/${newPath}`)

  return newURLs
}

export type TokenListPreferences = {
  autoUpdate: boolean
  urls: string[]
}

export type AnalyticsPreferences = {
  isEnabled: boolean
  hasDefaultOnBeenTurnedOn: boolean
}

export type Preferences = {
  id?: number
  savedAt: number
  tokenLists: TokenListPreferences
  currency: FiatCurrency
  defaultWallet: boolean
  selectedAccount: AddressOnNetwork
  accountSignersSettings: AccountSignerSettings[]
  analytics: AnalyticsPreferences
  autoLockInterval: UNIXTime
  shouldShowNotifications: boolean
}

/**
 * Items that the user will see and then will not reappear once they've been
 * manually dismissed. Manual dismissal can include closing a popover, or
 * selecting "Don't show again" on a popup before closing it.
 */
export type ManuallyDismissableItem =
  | "analytics-enabled-banner"
  | "copy-sensitive-material-warning"
  | "testnet-portal-is-open-banner"
/**
 * Items that the user will see once and will not be auto-displayed again. Can
 * be used for tours, or for popups that can be retriggered but will not
 * auto-display more than once.
 */
export type SingleShotItem = "default-connection-popover"

/**
 * Items that the user will view one time and either manually dismiss or that
 * will remain auto-collapsed after first view.
 */
export type DismissableItem = ManuallyDismissableItem | SingleShotItem

type DismissableItemEntry = {
  id: DismissableItem
  shown: boolean
}

export class PreferenceDatabase extends Dexie {
  private preferences!: Dexie.Table<Preferences, number>

  private signersSettings!: Dexie.Table<
    AccountSignerSettings & { id: SignerRecordId },
    string
  >

  private shownDismissableItems!: Dexie.Table<DismissableItemEntry, string>

  constructor() {
    super("tally/preferences")

    // TODO Would be good to move all of these migrations to their own file or
    // TODO files.
    this.version(1).stores({
      preferences: "++id,savedAt",
      migrations: "++id,appliedAt",
    })

    this.version(2)
      .stores({
        preferences: "++id,savedAt,currency,tokenLists,defaultWallet",
      })
      .upgrade((tx) =>
        tx
          .table("preferences")
          .toCollection()
          .modify((storedPreferences: Preferences) => {
            if (!storedPreferences.defaultWallet) {
              // Dexie API expects modification of the argument:
              // https://dexie.org/docs/Collection/Collection.modify()
              // eslint-disable-next-line no-param-reassign
              storedPreferences.defaultWallet =
                DEFAULT_PREFERENCES.defaultWallet
            }
          }),
      )

    this.version(3).stores({
      migrations: null, // If we use dexie built in migrations then we don't need to keep track of them manually
      preferences: "++id", // removed all the unused indexes
    })

    //
    this.version(4)
      .stores({
        preferences: "++id",
      })
      .upgrade((tx) =>
        tx
          .table("preferences")
          .toCollection()
          .modify(
            (storedPreferences: Preferences & { currentAddress?: string }) => {
              if (storedPreferences.currentAddress) {
                // eslint-disable-next-line no-param-reassign
                storedPreferences.selectedAccount = {
                  network: DEFAULT_PREFERENCES.selectedAccount.network,
                  address: storedPreferences.currentAddress,
                }
              } else {
                // eslint-disable-next-line no-param-reassign
                storedPreferences.selectedAccount =
                  DEFAULT_PREFERENCES.selectedAccount
              }
            },
          ),
      )

    // Add the new default token list
    this.version(5)
      .stores({
        preferences: "++id",
      })
      .upgrade((tx) =>
        tx
          .table("preferences")
          .toCollection()
          .modify((storedPreferences: Preferences) => {
            // eslint-disable-next-line no-param-reassign
            storedPreferences.tokenLists = {
              ...storedPreferences.tokenLists,
              urls: [
                "https://ipfs.io/ipfs/bafybeicovpqvb533alo5scf7vg34z6fjspdytbzsa2es2lz35sw3ksh2la",
                ...storedPreferences.tokenLists.urls,
              ],
            }
          }),
      )

    // Add the new default token list
    this.version(6)
      .stores({
        preferences: "++id",
      })
      .upgrade((tx) =>
        tx
          .table("preferences")
          .toCollection()
          .modify((storedPreferences: Preferences) => {
            const newURLs = getNewUrlsForTokenList(
              storedPreferences,
              // Old path
              "bafybeicovpqvb533alo5scf7vg34z6fjspdytbzsa2es2lz35sw3ksh2la",
              // New path
              "bafybeifeqadgtritd3p2qzf5ntzsgnph77hwt4tme2umiuxv2ez2jspife",
            )

            // eslint-disable-next-line no-param-reassign
            storedPreferences.tokenLists = {
              ...storedPreferences.tokenLists,
              urls: newURLs,
            }
          }),
      )

    // Add the Polygon, Optimism, and Arbitrum token lists
    this.version(7)
      .stores({
        preferences: "++id",
      })
      .upgrade((tx) =>
        tx
          .table("preferences")
          .toCollection()
          .modify((storedPreferences: Preferences) => {
            // eslint-disable-next-line no-param-reassign
            storedPreferences.tokenLists = {
              ...storedPreferences.tokenLists,
              urls: [
                "https://api-polygon-tokens.polygon.technology/tokenlists/default.tokenlist.json",
                "https://static.optimism.io/optimism.tokenlist.json",
                "https://bridge.arbitrum.io/token-list-42161.json",
                ...storedPreferences.tokenLists.urls,
              ],
            }
          }),
      )

    // Update .eth.link token lists urls to .eth.limo fallback
    this.version(8)
      .stores({
        preferences: "++id",
      })
      .upgrade((tx) =>
        tx
          .table("preferences")
          .toCollection()
          .modify((storedPreferences: Preferences) => {
            const updatedURLs = storedPreferences.tokenLists.urls.map((url) =>
              url.endsWith(".eth.link") ? `${url.slice(0, -9)}.eth.limo` : url,
            )
            // eslint-disable-next-line no-param-reassign
            storedPreferences.tokenLists = {
              ...storedPreferences.tokenLists,
              urls: updatedURLs,
            }
          }),
      )

    // Update Taho token list reference.
    this.version(9)
      .stores({
        preferences: "++id",
      })
      .upgrade((tx) =>
        tx
          .table("preferences")
          .toCollection()
          .modify((storedPreferences: Preferences) => {
            const newURLs = getNewUrlsForTokenList(
              storedPreferences,
              // Old path
              "bafybeifeqadgtritd3p2qzf5ntzsgnph77hwt4tme2umiuxv2ez2jspife",
              // New path
              "bafybeigtlpxobme7utbketsaofgxqalgqzowhx24wlwwrtbzolgygmqorm",
            )

            // eslint-disable-next-line no-param-reassign
            storedPreferences.tokenLists = {
              ...storedPreferences.tokenLists,
              urls: newURLs,
            }
          }),
      )

    this.version(10).stores({
      preferences: "++id",
      signersSettings: "&id",
    })

    this.version(11).upgrade((tx) =>
      tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          // eslint-disable-next-line no-param-reassign
          storedPreferences.analytics = DEFAULT_PREFERENCES.analytics
        }),
    )

    this.version(12).upgrade((tx) =>
      tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          storedPreferences.tokenLists.urls.push(
            "https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/main/src/joe.tokenlist-v2.json",
          )
        }),
    )

    this.version(13).upgrade((tx) =>
      tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          storedPreferences.tokenLists.urls.push(
            "https://tokens.pancakeswap.finance/pancakeswap-default.json",
          )
        }),
    )

    this.version(14).upgrade((tx) =>
      tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          const urls = storedPreferences.tokenLists.urls.filter(
            (url) =>
              url !==
              "https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/main/src/joe.tokenlist-v2.json",
          )

          urls.push(
            "https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/main/avalanche.tokenlist.json",
          )

          Object.assign(storedPreferences.tokenLists, { urls })
        }),
    )

    this.version(15).upgrade((tx) =>
      tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          const urls = storedPreferences.tokenLists.urls.filter(
            (url) =>
              url !==
              "https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/main/avalanche.tokenlist.json",
          )

          urls.push(
            "https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/1722d8c47a728a64c8dca8ac160b32cf39c5e671/mc.tokenlist.json",
          )

          Object.assign(storedPreferences.tokenLists, { urls })
        }),
    )

    // Updates saved accounts stored networks for old installs
    this.version(16).upgrade((tx) =>
      tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          const { selectedAccount } = storedPreferences
          selectedAccount.network =
            NETWORK_BY_CHAIN_ID[selectedAccount.network.chainID]
        }),
    )

    this.version(17).stores({
      preferences: "++id",
      signersSettings: "&id",
      shownDismissableItems: "&id,shown",
    })

    this.version(18).upgrade((tx) =>
      tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          const newURLs = getNewUrlsForTokenList(
            storedPreferences,
            // Old path
            "bafybeigtlpxobme7utbketsaofgxqalgqzowhx24wlwwrtbzolgygmqorm",
            // New path
            "bafybeihufwj43zej34itf66qyguq35k4f6s4ual4uk3iy643wn3xnff2ka",
          )

          // Param reassignment is the recommended way to use `modify` https://dexie.org/docs/Collection/Collection.modify()
          // eslint-disable-next-line no-param-reassign
          storedPreferences.tokenLists = {
            ...storedPreferences.tokenLists,
            urls: newURLs,
          }
        }),
    )

    // Updates preferences to allow custom auto lock timers
    this.version(19).upgrade((tx) =>
      tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          const update: Partial<Preferences> = {
            autoLockInterval: DEFAULT_AUTOLOCK_INTERVAL,
          }

          Object.assign(storedPreferences, update)
        }),
    )

    // Remove broken yearn's token list
    this.version(20).upgrade((tx) =>
      tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          const urls = storedPreferences.tokenLists.urls.filter(
            (url) => !url.includes("meta.yearn.finance"),
          )

          Object.assign(storedPreferences.tokenLists, { urls })
        }),
    )

    // Add default notifications and set as default off.
    this.version(21).upgrade((tx) =>
      tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Omit<Preferences, "showNotifications">) => {
          Object.assign(storedPreferences, { showNotifications: false })
        }),
    )

    // This is the old version for populate
    // https://dexie.org/docs/Dexie/Dexie.on.populate-(old-version)
    // The this does not behave according the new docs, but works
    this.on("populate", (tx: Transaction) => {
      // This could be tx.preferences but the typing for populate
      // is not generic so it does not know about the preferences table
      tx.table<Preferences, string>("preferences").add({
        savedAt: Date.now(),
        ...DEFAULT_PREFERENCES,
      })
    })
  }

  async getPreferences(): Promise<Preferences> {
    // TBD: This will surely return a value because `getOrCreateDB` is called first
    // when the service is created. It runs the migration which writes the `DEFAULT_PREFERENCES`
    return this.preferences.reverse().first() as Promise<Preferences>
  }

  async setAutoLockInterval(newValue: number): Promise<void> {
    await this.preferences
      .toCollection()
      .modify((storedPreferences: Preferences) => {
        const update: Partial<Preferences> = { autoLockInterval: newValue }

        Object.assign(storedPreferences, update)
      })
  }

  async setShouldShowNotifications(newValue: boolean): Promise<void> {
    await this.preferences
      .toCollection()
      .modify((storedPreferences: Preferences) => {
        const update: Partial<Preferences> = {
          shouldShowNotifications: newValue,
        }

        Object.assign(storedPreferences, update)
      })
  }

  async upsertAnalyticsPreferences(
    analyticsPreferences: Partial<AnalyticsPreferences>,
  ): Promise<void> {
    const preferences = await this.getPreferences()

    await this.preferences.toCollection().modify({
      analytics: {
        ...preferences.analytics,
        ...analyticsPreferences,
      },
    })
  }

  async setDefaultWalletValue(defaultWallet: boolean): Promise<void> {
    await this.preferences.toCollection().modify({ defaultWallet })
  }

  async setSelectedAccount(addressNetwork: AddressOnNetwork): Promise<void> {
    await this.preferences
      .toCollection()
      .modify({ selectedAccount: addressNetwork })
  }

  async getAccountSignerSettings(): Promise<AccountSignerSettings[]> {
    return this.signersSettings.toArray()
  }

  async updateSignerTitle(
    signer: AccountSignerWithId,
    title: string,
  ): Promise<AccountSignerSettings[]> {
    await this.signersSettings.put({
      id: getSignerRecordId(signer),
      signer,
      title,
    })
    return this.signersSettings.toArray()
  }

  async deleteAccountSignerSettings(
    signer: AccountSignerWithId,
  ): Promise<AccountSignerSettings[]> {
    await this.signersSettings.delete(getSignerRecordId(signer))
    return this.signersSettings.toArray()
  }

  async markDismissableItemAsShown(item: DismissableItem): Promise<void> {
    await this.shownDismissableItems.put({ id: item, shown: true })
  }

  async getShownDismissableItems(): Promise<DismissableItem[]> {
    return (await this.shownDismissableItems.toArray()).map(({ id }) => id)
  }

  async wasDismissableItemAlreadyShown(
    item: DismissableItem,
  ): Promise<boolean> {
    return (await this.shownDismissableItems.get(item))?.shown ?? false
  }
}

export async function getOrCreateDB(): Promise<PreferenceDatabase> {
  return new PreferenceDatabase()
}
