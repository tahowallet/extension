import KeyringController from '@tallyho/eth-keyring-controller'

import { getPersistedState, persistState } from '../lib/db'

import {
  MATERIAL_TYPES,
  PERSITIANCE_KEY,
  LOCKED_ERROR,
  NO_VAULT_ERROR,
} from './constants'

import * as types from './types.ts'

/*


a mnemonic produces a seed
a seed is used to generate keys




This class is responsible for getting persisted state and unencrypting
it when supplied the password

High level view:
we should have a master password to encrypt and decrypt local storage
keys is purely to expose keyring controller api

long term todo move this into the keyring controller directory?


methods:
lock ():
  this will disallow all key operations

  while locked all calls will should throw?

unlock (password): returns true or throws error


treat this like almost a separate context
from the main background process

keys from storage:
{
  seeds: [
    {
      data: string
      type: string
      index?: number
      reference: string
    }
  ]
}


create a nemenoic if no pre esiting state
encrypt with password
encrypt state
set flag for user has not seen
have


*/




export default class Keys {
  #vault: any
  #locked: boolean
  #seeds: types.Seed[]
  #keyrings: any
  #password: string
  ready: Promise<any>
  isLocked: boolean

  constructor (password?: string) {
    this.#vault = getPersistedState(PERSITIANCE_KEY)
    this.#locked = password ? true : false
    this.#password = password
    this.#masterKeyring = new KeyringController()
    this.#seed = []
    this.#keyrings = {}
    this.ready = new Promise((resolve, reject) => {
      this.#ready = resolve
      this.#failed = reject
    })
    if (this.hasData) {
        this.#init()
        .then(() => { this.#ready() })
        .catch((reason) => { this.#failed(reason) })
    } else {
        this.create()
        .then(() => { this.#ready() })
        .catch((reason) => { this.#failed(reason) })
    }
  }

  get isLocked (): boolean {
    return this.#locked
  }

  set isLocked () {
    throw new TypeError('isLocked is read only')
  }

  // locks keyring
  async lock (): Promise<boolean> {
    await this.#masterKeyring.setLocked()
    this.#locked = true
  }

  // unlock keyring takes a password
  async unlock (password: string): Promise<boolean>  {
    const keyring = await this.#masterKeyring.submitPassword(password)
    this.#locked = false
    return true
  }
  // creates a new mnemonic returns an address
  async create (password): Promise<string[]> {
    const keyring = await this.#masterKeyring.addNewKeyring('HD Key Tree', {numberOfAccounts: 1, strength: 256})
    const firstAddress = await keyring.addAccounts(1)
    await this.#saveKeyring(keyring)
    return keyring.getAccounts()
  }

  async import (type: string, data: string, password?: string ): Promise<string[]> {
    await this.ready
    this.checkLock()
    // TODO use the same types across all deps
    const keyring = this.#masterKeyring.addNewKeyring(type, { mnemonic: data, numberOfAccounts: 10 })
    await keyring.addAccounts(10)
    await this.#saveKeyring(keyring)
    return keyring.getAccounts()
  }

  async export (reference: string, password: string): Promise<string> {
    await this.ready
    this.#checkLock()
    if (password !== this.#password) {
      throw new Error('Invalid Password')
    }
    return this.#keyring[reference].mnemonic
  }
  // returns address list for specific keyring if no reference is
  // supplied returns all address for all keyrings
  async getAddresses (reference?: string): Promise<string[]> {
    await this.ready
    if (reference === undefined) {
      return Object.values(this.#keyrings).reduce((agg, keyring) => {
        return agg.concat(keyring.getAccounts())
      }, [])
    }
    return this.#keyrings[reference].getAccounts()
  }

  async getWalletReferences (reference: string): Promise<string[]> {
    await this.ready
    return Object.keys(this.#keyrings)
  }

  async getNextAddress (reference: string, _count?: number): Promise<address> {
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
        seeds: this.seeds
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

  async #createReference(data): Promise<string> {
    const dataUint8 = new TextEncoder().encode(data)
    const hashBufer = await crypto.subtle.digest('SHA-256', dataUint8)
    const hashArray = Array.from(new Uint8Array(hashBufer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  async #saveKeyring(keyring: any) {
    const { mnemonic, numberOfAccounts, hdPath } = await keyring.serialize()
    const reference = this.#createReference(mnemonic)
    this.#seeds.push({
      data: mnemonic,
      path: hdPath,
      reference,
      index: numberOfAccounts,
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


