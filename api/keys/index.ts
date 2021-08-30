import KeyringController, { normalizeAddress } from "@tallyho/eth-keyring-controller"
import { getPersistedState, persistState } from "../lib/db"
import { Transaction } from "ethereumjs-tx"
import {
  PERSITIANCE_KEY,
  LOCKED_ERROR,
  NO_VAULT_ERROR,
  ADDRESS_NOT_FOUND_ERROR,
} from "./constants"

export enum KEY_TYPE {
  mnemonicBIP39S128 = "mnemonic#bip39:128",
  mnemonicBIP39S256 = "mnemonic#bip39:256",
  metamaskMnemonic = "mnemonic#metamask",
  singleSECP = "single#secp256k1",
}

export type KeyTypeStrings = keyof typeof KEY_TYPE

export type MsgParams = {
  data: string
  from: string
}

// TODO: type declarations in eth-hd-tree
export interface Seed {
  data: string // seed material
  type: KEY_TYPE
  index: number // the current account index
  reference: string // unique reference
  path: string // default path to derive new keys
}

interface Opts {
  [key: string]: string | number
}

export type ImportData = {
  type: KeyTypeStrings
  data: string
  password ?: string
}

/*


a mnemonic produces a seed
a seed is used to generate keys




This class is responsible for getting persisted state and decrypting
it when supplied the password

High level view:
we should have a master password to encrypt and decrypt local storage
keys is purely to expose keyring controller api

long term todo move this into the keyring controller directory?




treat this like almost a separate context
from the main background process



*/




export default class Keys {
  #vault: any
  #locked: boolean
  #seeds: Seed[]
  #keyrings: any
  #masterKeyring: any
  #password: string
  #ready: (value: any) => void
  #failed: (reason: any) => void
  #isready: Promise<boolean>
  constructor (password?: string) {
    this.#vault = getPersistedState(PERSITIANCE_KEY)
    this.#locked = password ? true : false
    this.#password = password
    this.#masterKeyring = new KeyringController()
    this.#seeds = []
    this.#keyrings = {}
    this.#isready = new Promise((resolve, reject) => {
      this.#ready = resolve
      this.#failed = reject
    })
    if (this.#vault) {
      try {
        this.#masterKeyring.encryptor.decrypt(this.#password, this.#vault).then((seeds) => {
          this.#seeds = seeds
          this.#seeds.forEach(async (seed) => {
            this.#keyrings[seed.reference] = await this.#masterKeyring.addNewKeyring("HD, Key Tree", {
              mnemonic: seed.data,
              hdPath: seed.path,
              numberOfAccounts: seed.index,
            })
          })
        }).then(() => {
          this.#ready(true)
        })
      } catch (reason) {
        this.#failed(reason)
      }
    } else {
        this.create()
        .then(() => { this.#ready(true) })
        .catch((reason) => { this.#failed(reason) })
    }
  }

  get isLocked (): boolean {
    return this.#locked
  }

  // locks keyring
  async lock (): Promise<boolean> {
    await this.#masterKeyring.setLocked()
    this.#keyrings = {}
    this.#seeds = []
    this.#locked = true
    return true
  }

  // unlock keyring takes a password
  async unlock (password: string): Promise<boolean>  {
      this.#seeds = await this.#masterKeyring.encryptor.decrypt(this.#password, this.#vault)
      this.#seeds.forEach(async (seed) => {
        this.#keyrings[seed.reference] = await this.#masterKeyring.addNewKeyring("HD, Key Tree", {
          mnemonic: seed.data,
          hdPath: seed.path,
          numberOfAccounts: seed.index,
        })
      })
    this.#locked = false
    return true
  }
/* *
  Creates and saves a new BIP-39 256-bit mnemonic key, and returns its accounts.
*/
  // TODO: figure out why enum dosent match ts docs :"}
  async create (): Promise<string[]> {
    const keyring = await this.#masterKeyring.addNewKeyring("HD Key Tree", {numberOfAccounts: 1, strength: 256})
    const firstAddress = await keyring.addAccounts(1)
    await this.#saveKeyring(keyring, KEY_TYPE.mnemonicBIP39S256)
    return keyring.getAccounts()
  }

  async import (importData: ImportData): Promise<string[]> {

    await this.#isready
    this.#checkLock()
    // TODO use the same types across all deps
    const keyring = this.#masterKeyring.addNewKeyring(importData.type, { mnemonic: importData.data, numberOfAccounts: 10 })
    await keyring.addAccounts(10)
    await this.#saveKeyring(importData.type, keyring)
    return keyring.getAccounts()
  }

  async export (reference: string, password: string): Promise<string> {
    await this.#isready
    this.#checkLock()
    if (password !== this.#password) {
      throw new Error("Invalid Password")
    }
    return this.#keyrings[reference].mnemonic
  }
  /**
   * getAddresses
   *
   * Returns the public addresses of all current accounts
   * managed by all currently unlocked keyrings.
   *
   * @returns {Promise<Array<string>>} The array of accounts.
   */
  async getAddresses (reference?: string): Promise<string[]> {
    await this.#isready
    if (reference === undefined) {
      const addresses: Promise<string[]>[] = Object.values(this.#keyrings).map((keyring: any): Promise<string[]> => {
        return keyring.getAccounts()
      })
      const finAddresses = await Promise.all(addresses)
      return finAddresses.reduce((agg: string[], addressList: string[]) => agg.concat(addressList), [])
    }
    return this.#keyrings[reference].getAccounts()
  }

  /**
   * getWalletReferences
   *
   * Returns the id's of all seeds to be used as a reference for each keyring
   *
   * @returns {Promise<string[]>} The array of accounts.
   */
  async getWalletReferences (): Promise<string[]> {
    await this.#isready
    return Object.keys(this.#keyrings)
  }

  async getNextAddress (reference: string, _count?: number): Promise<string[]> {
    const count = _count === undefined ? 1 : _count
    await this.#isready

    const accounts = await this.#keyrings[reference].addAccounts(count)
    const allAccounts = await this.#keyrings[reference].getAccounts()
    await this.#updateIndex(reference, allAccounts.length)
    return accounts
  }
  /**
   * Export Account
   *
   * Requests the private key from the keyring controlling
   * the specified address.
   *
   * Returns a Promise that may resolve with the private key string.
   *
   * @param {string} address - The address of the account to export.
   * @returns {Promise<string>} The private key of the account.
   */
  async exportAccount (address) {
    const keyring = await this.#getKeyringFromAddress(address)
    return keyring.exportAccount(normalizeAddress(address))
  }

  /**
   *
   * Remove Account
   *
   * Removes a specific account from a keyring
   * If the account is the last/only one then it also removes the keyring.
   *
   * @param {string} address - The address of the account to remove.
   * @returns {Promise<void>} A Promise that resolves if the operation was successful.
   */
  async removeAccount (address: string): Promise<void> {
    const keyring = await this.#getKeyringFromAddress(address)
    // Not all the keyrings support this, so we have to check
    if (typeof keyring.removeAccount === 'function') {
      keyring.removeAccount(address)
      const accounts = await keyring.getAccounts()
      // Check if this was the last/only account
      if (accounts.length === 0) {
        this.#masterKeyring.removeEmptyKeyrings()
      }
      await this.#persistState()
    } else {
      throw new Error(
        `Keyring ${keyring.type} doesn't support account removal operations`,
      )
    }
  }

  //
  // SIGNING METHODS
  //

  /**
   * Sign Ethereum Transaction
   *
   * Signs an Ethereum transaction object.
   *
   * @param {Object} ethTx - The transaction to sign.
   * @param {string} _fromAddress - The transaction 'from' address.
   * @param {Object} opts - Signing options.
   * @returns {Promise<Object>} The signed transaction object.
   */
  async signTransaction (ethTx: Transaction, _fromAddress: string, opts: Opts = {}): Promise<Transaction> {
    const fromAddress = normalizeAddress(_fromAddress)
    const keyring = await this.#getKeyringFromAddress(fromAddress)
    return keyring.signTransaction(fromAddress, ethTx, opts)
  }

  /**
   * Sign Message
   *
   * Attempts to sign the provided message parameters.
   *
   * @param {Object} msgParams - The message parameters to sign.
   * @returns {Promise<Buffer>} The raw signature.
   */
  async signMessage (msgParams: MsgParams, opts: Opts = {}): Promise<Buffer> {
    const address = normalizeAddress(msgParams.from)
    const keyring = await this.#getKeyringFromAddress(address)
    return keyring.signMessage(address, msgParams.data, opts)
  }

  /**
   * Sign Personal Message
   *
   * Attempts to sign the provided message paramaters.
   * Prefixes the hash before signing per the personal sign expectation.
   *
   * @param {Object} msgParams - The message parameters to sign.
   * @returns {Promise<Buffer>} The raw signature.
   */
  async signPersonalMessage (msgParams: MsgParams, opts: Opts = {}): Promise<Buffer> {
    const address = normalizeAddress(msgParams.from)
    const keyring = await this.#getKeyringFromAddress(address)
    return keyring.signPersonalMessage(address, msgParams.data, opts)
  }

  /**
   * Get encryption public key
   *
   * Get encryption public key for using in encrypt/decrypt process.
   *
   * @param {Object} address - The address to get the encryption public key for.
   * @returns {Promise<Buffer>} The public key.
   */
  async getEncryptionPublicKey (_address: string, opts: Opts = {}): Promise<Buffer> {
    const address = normalizeAddress(_address)
    const keyring = await this.#getKeyringFromAddress(address)
    return keyring.getEncryptionPublicKey(address, opts)
  }

  /**
   * Decrypt Message
   *
   * Attempts to decrypt the provided message parameters.
   *
   * @param {Object} msgParams - The decryption message parameters.
   * @returns {Promise<Buffer>} The raw decryption result.
   */
  async decryptMessage (msgParams, opts: Opts = {}): Promise<Buffer> {
    const address = normalizeAddress(msgParams.from)
    const keyring = await this.#getKeyringFromAddress(address)
    return keyring.decryptMessage(address, msgParams.data, opts)
  }

  /**
   * Sign Typed Data
   * (EIP712 https://github.com/ethereum/EIPs/pull/712#issuecomment-329988454)
   *
   * @param {Object} msgParams - The message parameters to sign.
   * @returns {Promise<Buffer>} The raw signature.
   */
  async signTypedMessage (msgParams, opts: Opts = { version: 'V1' }): Promise<Buffer> {
    const address = normalizeAddress(msgParams.from)
    const keyring = await this.#getKeyringFromAddress(address)
    return keyring.signTypedData(address, msgParams.data, opts)
  }

  /**
   * Gets the app key address for the given Ethereum address and origin.
   *
   * @param {string} _address - The Ethereum address for the app key.
   * @param {string} origin - The origin for the app key.
   * @returns {Promise<string>} The app key address.
   */
  async getAppKeyAddress (_address: string, origin: string): Promise<string> {
    const address = normalizeAddress(_address)
    const keyring = await this.#getKeyringFromAddress(address)
    return keyring.getAppKeyAddress(address, origin)
  }

  /**
   * Exports an app key private key for the given Ethereum address and origin.
   *
   * @param {string} _address - The Ethereum address for the app key.
   * @param {string} origin - The origin for the app key.
   * @returns {Promise<string>} The app key private key.
   */
  async exportAppKeyForAddress (_address: string, origin: string): Promise<string> {
    const address = normalizeAddress(_address)
    const keyring = await this.#getKeyringFromAddress(address)
    if (!('exportAccount' in keyring)) {
      throw new Error(`The keyring for address ${_address} does not support exporting.`)
    }
    return keyring.exportAccount(address, { withAppKeyOrigin: origin })
  }


  //
  // PRIVATE METHODS
  //

  async #getKeyringFromAddress (address: string): Promise<any> {
    const keyrings = Object.values(this.#keyrings)
    const addresses = await Promise.all(keyrings.map(async (keyring: any) => {
      return keyring.getAccounts()
    }))
    let index
    addresses.forEach((addressList: string[], i: number) => {
      if (addressList.includes(address)) {
        index = i
      }
    })
    if (index === undefined) {
      throw new Error(ADDRESS_NOT_FOUND_ERROR + address)
    }
    return keyrings[index]
  }

  async #persistState (): Promise<void> {
    const encryptedState = await this.#masterKeyring.encryptor.encrypt(
      this.#password,
      {
        seeds: this.#seeds
      }
    )
    persistState(PERSITIANCE_KEY, encryptedState)
  }


  /**
   * #createReference
   *
   * one way hash method for creating references to mnemonics
   *
   * @returns {Promise<string>} has string
   */

  async #createReference(data: string): Promise<string> {
    const dataUint8 = new TextEncoder().encode(data)
    const hashBufer = await crypto.subtle.digest("SHA-256", dataUint8)
    const hashArray = Array.from(new Uint8Array(hashBufer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
    return hashHex
  }

  async #saveKeyring(keyring: any, keyType: KEY_TYPE): Promise<void> {
    const { mnemonic, numberOfAccounts, hdPath } = await keyring.serialize()
    const reference = await this.#createReference(mnemonic)
    this.#seeds.push({
      data: mnemonic,
      path: hdPath,
      reference,
      index: numberOfAccounts,
      type: keyType,
    })
    this.#keyrings[reference] = keyring
    await this.#persistState()
  }

  #updateIndex (reference: string, newIndex: number): void {
    this.#seeds = this.#seeds.reduce((agg, seed) => {
      if (seed.reference === reference) {
        seed.index = newIndex
      }
      agg.push(seed)
      return agg
    }, [])
    this.#persistState()
  }

  #checkLock (): void {
    if (this.#locked === true) {
      throw new Error(LOCKED_ERROR)
    }
  }
}