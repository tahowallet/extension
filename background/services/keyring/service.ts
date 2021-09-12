import { browser, Alarms } from "webextension-polyfill-ts"
import Emittery from "emittery"
import logger from "../../lib/logger"

import { Service } from ".."

interface Events {
  // TODO keyring has been added
  // TODO keyring has been unlocked
  // TODO keyring has been locked
  // TODO keyrings have been loaded
  // TODO message was signed
  // TODO tx was signed
}

/*
 * KeyringService is responsible for all key material, as well as its immediate
 * application signing messages and transactions and deriving child keypairs.
 */
export default class KeyringService implements Service<Events> {
  readonly emitter: Emittery<Events>

  constructor() {
    this.emitter = new Emittery<Events>()
  }

  async startService(): Promise<void> {}

  async stopService(): Promise<void> {}
}
