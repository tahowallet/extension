import Dexie, { Transaction } from "dexie"

import { FiatCurrency } from "../../assets"
import { AddressOnNetwork } from "../../accounts"

import DEFAULT_PREFERENCES from "./defaults"
import { AccountSignerSettings } from "../../ui"
import { AccountSignerWithId } from "../../signing"
import { AnalyticsPreferences } from "./types"
import { NETWORK_BY_CHAIN_ID } from "../../constants"

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

// The idea is to use this interface to describe the data structure stored in indexedDb
// In the future this might also have a runtime type check capability, but it's good enough for now.
export interface Preferences {
  id?: number
  savedAt: number
  tokenLists: { autoUpdate: boolean; urls: string[] }
  currency: FiatCurrency
  defaultWallet: boolean
  currentAddress?: string
  selectedAccount: AddressOnNetwork
  analytics: {
    isEnabled: boolean
    hasDefaultOnBeenTurnedOn: boolean
  }
}

export class PreferenceDatabase extends Dexie {
  private preferences!: Dexie.Table<Preferences, number>

  private signersSettings!: Dexie.Table<
    AccountSignerSettings & { id: SignerRecordId },
    string
  >

  constructor() {
    super("tally/preferences")

    // DELETE ME: No need to keep this, but because this service was using a different method
    // I thought it's easier to follow the history if it's here at least until we discuss this approach
    this.version(1).stores({
      preferences: "++id,savedAt",
      migrations: "++id,appliedAt",
    })

    // DELETE ME: This is not necessary either, but because there was a different approach
    // implementing the migration I kept it here for now just to make sure
    // the db is in working condition.
    this.version(2)
      .stores({
        preferences: "++id,savedAt,currency,tokenLists,defaultWallet",
      })
      .upgrade((tx) => {
        return tx
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
          })
      })

    // TBD @Antonio: Implemented database versioning and population according to the Dexie docs
    // https://dexie.org/docs/Tutorial/Design#database-versioning
    // I fully expect that I might need to revert all of this, but as per my current knowledge this seems to be a good idea
    this.version(3).stores({
      migrations: null, // If we use dexie built in migrations then we don't need to keep track of them manually
      preferences: "++id", // removed all the unused indexes
    })

    //
    this.version(4)
      .stores({
        preferences: "++id",
      })
      .upgrade((tx) => {
        return tx
          .table("preferences")
          .toCollection()
          .modify((storedPreferences: Preferences) => {
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
          })
      })

    // Add the new default token list
    this.version(5)
      .stores({
        preferences: "++id",
      })
      .upgrade((tx) => {
        return tx
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
          })
      })

    // Add the new default token list
    this.version(6)
      .stores({
        preferences: "++id",
      })
      .upgrade((tx) => {
        return tx
          .table("preferences")
          .toCollection()
          .modify((storedPreferences: Preferences) => {
            // Get rid of old tally URL
            const newURLs = storedPreferences.tokenLists.urls.filter(
              (url) =>
                !url.includes(
                  "bafybeicovpqvb533alo5scf7vg34z6fjspdytbzsa2es2lz35sw3ksh2la"
                )
            )

            newURLs.push(
              "https://ipfs.io/ipfs/bafybeifeqadgtritd3p2qzf5ntzsgnph77hwt4tme2umiuxv2ez2jspife"
            )

            // eslint-disable-next-line no-param-reassign
            storedPreferences.tokenLists = {
              ...storedPreferences.tokenLists,
              urls: newURLs,
            }
          })
      })

    // Add the Polygon, Optimism, and Arbitrum token lists
    this.version(7)
      .stores({
        preferences: "++id",
      })
      .upgrade((tx) => {
        return tx
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
          })
      })

    // Update .eth.link token lists urls to .eth.limo fallback
    this.version(8)
      .stores({
        preferences: "++id",
      })
      .upgrade((tx) => {
        return tx
          .table("preferences")
          .toCollection()
          .modify((storedPreferences: Preferences) => {
            const updatedURLs = storedPreferences.tokenLists.urls.map((url) =>
              url.endsWith(".eth.link") ? `${url.slice(0, -9)}.eth.limo` : url
            )
            // eslint-disable-next-line no-param-reassign
            storedPreferences.tokenLists = {
              ...storedPreferences.tokenLists,
              urls: updatedURLs,
            }
          })
      })

    this.version(9)
      .stores({
        preferences: "++id",
      })
      .upgrade((tx) => {
        return tx
          .table("preferences")
          .toCollection()
          .modify((storedPreferences: Preferences) => {
            // Get rid of old tally URL
            const newURLs = storedPreferences.tokenLists.urls.filter(
              (url) =>
                !url.includes(
                  "bafybeifeqadgtritd3p2qzf5ntzsgnph77hwt4tme2umiuxv2ez2jspife"
                )
            )

            newURLs.push(
              "https://ipfs.io/ipfs/bafybeigtlpxobme7utbketsaofgxqalgqzowhx24wlwwrtbzolgygmqorm"
            )

            // eslint-disable-next-line no-param-reassign
            storedPreferences.tokenLists = {
              ...storedPreferences.tokenLists,
              urls: newURLs,
            }
          })
      })

    this.version(10).stores({
      preferences: "++id",
      signersSettings: "&id",
    })

    this.version(11).upgrade((tx) => {
      return tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          // eslint-disable-next-line no-param-reassign
          storedPreferences.analytics = DEFAULT_PREFERENCES.analytics
        })
    })

    this.version(12).upgrade((tx) => {
      return tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          storedPreferences.tokenLists.urls.push(
            "https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/main/src/joe.tokenlist-v2.json"
          )
        })
    })

    this.version(13).upgrade((tx) => {
      return tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          storedPreferences.tokenLists.urls.push(
            "https://tokens.pancakeswap.finance/pancakeswap-default.json"
          )
        })
    })

    this.version(14).upgrade((tx) => {
      return tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          const urls = storedPreferences.tokenLists.urls.filter(
            (url) =>
              url !==
              "https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/main/src/joe.tokenlist-v2.json"
          )

          urls.push(
            "https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/main/avalanche.tokenlist.json"
          )

          Object.assign(storedPreferences.tokenLists, { urls })
        })
    })

    this.version(15).upgrade((tx) => {
      return tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          const urls = storedPreferences.tokenLists.urls.filter(
            (url) =>
              url !==
              "https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/main/avalanche.tokenlist.json"
          )

          urls.push(
            "https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/1722d8c47a728a64c8dca8ac160b32cf39c5e671/mc.tokenlist.json"
          )

          Object.assign(storedPreferences.tokenLists, { urls })
        })
    })

    // Updates saved accounts stored networks for old installs
    this.version(16).upgrade((tx) => {
      return tx
        .table("preferences")
        .toCollection()
        .modify((storedPreferences: Preferences) => {
          const { selectedAccount } = storedPreferences
          selectedAccount.network =
            NETWORK_BY_CHAIN_ID[selectedAccount.network.chainID]
        })
    })

    // This is the old version for populate
    // https://dexie.org/docs/Dexie/Dexie.on.populate-(old-version)
    // The this does not behave according the new docs, but works
    this.on("populate", (tx: Transaction) => {
      // This could be tx.preferences but the typing for populate
      // is not generic so it does not know about the preferences table
      tx.table("preferences").add(DEFAULT_PREFERENCES)
    })
  }

  async getPreferences(): Promise<Preferences> {
    // TBD: This will surely return a value because `getOrCreateDB` is called first
    // when the service is created. It runs the migration which writes the `DEFAULT_PREFERENCES`
    return this.preferences.reverse().first() as Promise<Preferences>
  }

  async upsertAnalyticsPreferences(
    analyticsPreferences: Partial<AnalyticsPreferences>
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
    title: string
  ): Promise<AccountSignerSettings[]> {
    await this.signersSettings.put({
      id: getSignerRecordId(signer),
      signer,
      title,
    })
    return this.signersSettings.toArray()
  }

  async deleteAccountSignerSettings(
    signer: AccountSignerWithId
  ): Promise<AccountSignerSettings[]> {
    await this.signersSettings.delete(getSignerRecordId(signer))
    return this.signersSettings.toArray()
  }
}

export async function getOrCreateDB(): Promise<PreferenceDatabase> {
  return new PreferenceDatabase()
}
