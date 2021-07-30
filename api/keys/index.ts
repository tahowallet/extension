import KeyringController from '@tallyho/eth-keyring-controller'

import { getPersistedState, persistState } from '../lib/db'

import { MATERIAL_TYPES, PERSITIANCE_KEY } from './constants'

/*

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

*/

export default function createKeyContext () {
  const KEYRING = Symbol('keyring')
  // create private var keys
  const STORE = Symbol('store')
  const PASSWORD = Symbol('password')
  // dissallow access to symbol keys for functions that use ownKeys on objects
  const traps = {
    get: (t, k) => t[k],
    set: (t, k, v) => t[k] = v,
    ownKeys: (t) => {
      return Object.keys(t).reduce((a, i) => {
        if (typeof i !== 'symbol') a.push(i)
        return a
      }, [])
    }
  }

  class Keys {``
    constructor () {
      this[STORE] = getPersistedState(PERSITIANCE_KEY)

      this[KEYRING] = new KeyringController()
      this.isLocked = true
      return new Proxy(this, traps)
    }

    async lock () {
    }

    async unlock (password) {

    }

    import ({ type, data, name, password }) {

    }

    create ({ type, name, password, path = '' })
  }

  return new Keys()
}
