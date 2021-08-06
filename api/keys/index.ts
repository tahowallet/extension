import KeyringController from '@tallyho/eth-keyring-controller'

import { getPersistedState, persistState } from '../lib/db'

import {
  MATERIAL_TYPES,
  PERSITIANCE_KEY,
  LOCKED_ERROR,
  NO_VAULT_ERROR,
} from './constants'

export enum KEY_TYPE {
  mnemonicBIP39S128 = "mnemonic#bip39:128",
  mnemonicBIP39S256 = "mnemonic#bip39:256",
  metamaskMnemonic = "mnemonic#metamask",
  singleSECP = "single#secp256k1",
}

export type keyTypeStrings = keyof typeof KEY_TYPE


// TODO: type declarations in eth-hd-tree
export interface Seed {
  data: any //string // seed material
  type: KEY_TYPE
  index: any //number // the current account index
  reference: string // unique reference
  path: any //string // fallback path to derive new keys
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
  ready: Promise<any>

  constructor (password?: string) {
    this.#vault = getPersistedState(PERSITIANCE_KEY)
    this.#locked = password ? true : false
    this.#password = password
    this.#masterKeyring = new KeyringController()
    this.#seeds = []
    this.#keyrings = {}
    this.ready = new Promise((resolve, reject) => {
      this.#ready = resolve
      this.#failed = reject
    })
    if (this.#vault) {
        this.#init()
        .then(() => { this.#ready(true) })
        .catch((reason) => { this.#failed(reason) })
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
    await this.#init()
    this.#locked = false
    return true
  }
  // creates a new mnemonic returns an address
  // TODO: figure out why enum dosent match ts docs :'}
  async create (): Promise<string[]> {
    const keyring = await this.#masterKeyring.addNewKeyring('HD Key Tree', {numberOfAccounts: 1, strength: 256})
    const firstAddress = await keyring.addAccounts(1)
    // await this.#saveKeyring(keyring, KEY_TYPE.mnemonicBIP39S256)
    await this.#saveKeyring(keyring, KEY_TYPE.mnemonicBIP39S256)
    return keyring.getAccounts()
  }

  async import ({type: keyTypeStrings, data: string, password?: string}): Promise<string[]> {
    await this.ready
    this.#checkLock()
    // TODO use the same types across all deps
    const keyring = this.#masterKeyring.addNewKeyring(type, { mnemonic: data, numberOfAccounts: 10 })
    await keyring.addAccounts(10)
    await this.#saveKeyring(type, keyring)
    return keyring.getAccounts()
  }

  async export (reference: string, password: string): Promise<string> {
    await this.ready
    this.#checkLock()
    if (password !== this.#password) {
      throw new Error('Invalid Password')
    }
    return this.#keyrings[reference].mnemonic
  }
  // returns address list for specific keyring if no reference is
  // supplied returns all address for all keyrings
  // TODO: figure out why ts dosent like the reduce method
  async getAddresses (reference?: string): Promise<any[]> {
    await this.ready
    if (reference === undefined) {
      const addresses = Object.values(this.#keyrings).reduce((agg: string[], keyring: any): string[] => {
        return agg.concat(keyring.getAccounts())
      }, [])
      return addresses
    }
    return this.#keyrings[reference].getAccounts()
  }

  async getWalletReferences (): Promise<string[]> {
    await this.ready
    return Object.keys(this.#keyrings)
  }

  async getNextAddress (reference: string, _count?: number): Promise<string[]> {
    const count = _count === undefined ? 1 : _count
    await this.ready

    const accounts = await this.#keyrings[reference].addAccounts(count)
    const allAccounts = await this.#keyrings[reference].getAccounts()
    await this.#updateIndex(reference, allAccounts.length)
    return accounts
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

  async #init (): Promise<void> {
    this.#seeds = await this.#masterKeyring.encryptor.decrypt(this.#password, this.#vault)
    this.#seeds.forEach(async (seed) => {
      this.#keyrings[seed.reference] = await this.#masterKeyring.addNewKeyring('HD, Key Tree', {
        mnemonic: seed.data,
        hdPath: seed.path,
        numberOfAccounts: seed.index,
      })
    })
  }

  // todo look into freezing or use-strict not sure if possible or applicable here?
  // one way hash method for creating references to mnemonics
  // also makes it easy to know if it already exists
  async #createReference(data): Promise<string> {
    const dataUint8 = new TextEncoder().encode(data)
    const hashBufer = await crypto.subtle.digest('SHA-256', dataUint8)
    const hashArray = Array.from(new Uint8Array(hashBufer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  async #saveKeyring(keyring: any, type: KEY_TYPE) {
    const { mnemonic, numberOfAccounts, hdPath } = await keyring.serialize()
    const reference = await this.#createReference(mnemonic)
    this.#seeds.push({
      data: mnemonic,
      path: hdPath,
      reference,
      index: numberOfAccounts,
      type,
    })
    this.#keyrings[reference] = keyring
    await this.#persistState()
  }

  #updateIndex (reference: string, newIndex: number) {
    this.#seeds = this.#seeds.reduce((agg, seed) => {
      if (seed.reference === reference) {
        seed.index = newIndex
      }
      agg.push(seed)
      return agg
    }, [])
    this.#persistState
  }

  #checkLock () {
    if (this.#locked) {
      throw new Error(LOCKED_ERROR)
    }
  }
}


