import { parse as parseRawTransaction } from "@ethersproject/transactions"

import HDKeyring from "@tallyho/hd-keyring"

import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { getEncryptedVaults, writeLatestEncryptedVault } from "./storage"
import {
  EIP1559TransactionRequest,
  HexString,
  KeyringTypes,
  SignedEVMTransaction,
} from "../../types"
import BaseService from "../base"
import { ETH, ETHEREUM } from "../../constants"

type Keyring = {
  type: KeyringTypes
  id: string | null
  addresses: string[]
}

interface Events extends ServiceLifecycleEvents {
  locked: boolean
  unlocked: boolean
  keyrings: Keyring[]
  address: string
  // TODO message was signed
  signedTx: SignedEVMTransaction
}

/*
 * KeyringService is responsible for all key material, as well as applying the
 * material to sign messages, sign transactions, and derive child keypairs.
 */
export default class KeyringService extends BaseService<Events> {
  #hashedPassword: string | null

  #locked = false

  #keyrings: HDKeyring[] = []

  static create: ServiceCreatorFunction<Events, KeyringService, []> =
    async () => {
      const { vaults } = await getEncryptedVaults()
      const currentEncryptedVault = vaults.slice(-1)[0]?.vault

      const keyringOptions = {
        persistVault: writeLatestEncryptedVault,
        encryptedVault: currentEncryptedVault,
      }

      // TODO re-introduce persistence and vault encryption
      return new this()
    }

  private constructor() {
    super()
  }

  async internalStartService(): Promise<void> {
    await super.internalStartService()
  }

  async internalStopService(): Promise<void> {
    await this.lock()

    await super.internalStopService()
  }

  /* eslint-disable class-methods-use-this */
  async unlock(password: string): Promise<boolean> {
    // TODO re-introduce locking
    return true
  }
  /* eslint-enable class-methods-use-this */

  /* eslint-disable class-methods-use-this */
  async lock(): Promise<void> {
    // TODO re-introduce locking
  }
  /* eslint-disable class-methods-use-this */

  private async requireUnlocked(): Promise<void> {
    if (!this.#locked) {
      throw new Error("KeyringService must be unlocked.")
    }
  }

  // ///////////////////////////////////////////
  // METHODS THAT REQUIRE AN UNLOCKED SERVICE //
  // ///////////////////////////////////////////

  /**
   * Generate a new keyring, saving it to extension storage.
   *
   * @param type - the type of keyring to generate. Currently only supports 256-
   *        bit HD keys.
   * @param password? - a password used to encrypt the keyring vault. Necessary
   *        if the service is locked or this is the first keyring created.
   * @returns The string ID of the new keyring.
   */
  async generateNewKeyring(
    type: KeyringTypes,
    password?: string
  ): Promise<string> {
    if (type !== KeyringTypes.mnemonicBIP39S256) {
      throw new Error(
        "KeyringService only supports generating 256-bit HD key trees"
      )
    }

    const newKeyring = new HDKeyring({ strength: 256 })
    this.#keyrings.push(newKeyring)

    const [address] = newKeyring.addAccountsSync(1)

    this.emitter.emit("address", address)
    this.emitKeyringState()

    return newKeyring.id
  }

  /**
   * Import a legacy 128 bit keyring and pull the first address from that
   * keyring for system use.
   *
   * @param mnemonic - a 12-word seed phrase compatible with MetaMask.
   * @param password - a password used to encrypt the keyring vault.
   * @returns The string ID of the new keyring.
   */
  async importLegacyKeyring(
    mnemonic: string,
    password: string
  ): Promise<string> {
    // confirm the mnemonic is 12-word for a 128-bit seed + checksum. Leave
    // further validate to HDKeyring
    if (mnemonic.split(/\s+/).length !== 12) {
      throw new Error("Invalid legacy mnemonic.")
    }

    const newKeyring = new HDKeyring({ mnemonic })
    this.#keyrings.push(newKeyring)

    newKeyring.addAccountsSync(1)

    this.emitter.emit("address", newKeyring.getAccountsSync()[0])
    this.emitKeyringState()

    return newKeyring.id
  }

  /**
   * Sign a transaction.
   *
   * @param account - the account desired to sign the transaction
   * @param txRequest -
   */
  async signTransaction(
    account: HexString,
    txRequest: EIP1559TransactionRequest
  ): Promise<void> {

    console.log('SignedEVMTransaction starting')
    debugger

    await this.unlock('password')
    await this.requireUnlocked()

    // find the keyring using a linear search
    const keyring = this.#keyrings.find((kr) =>
      kr.getAccountsSync().includes(account)
    )
    if (!keyring) {
      throw new Error("Account keyring not found.")
    }

    console.log('SignedEVMTransaction  here 1132452')


    // unfortunately, ethers gives us a serialized signed tx here
    const signed = await keyring.signTransaction(account, {
      ...txRequest,
      from: undefined,
    })

    // parse the tx, then unpack it as best we can
    const tx = parseRawTransaction(signed)

    if (
      !tx.hash ||
      !tx.from ||
      !tx.to ||
      !tx.r ||
      !tx.s ||
      tx.v === undefined
    ) {
      throw new Error("Transaction doesn't appear to have been signed.")
    }

    if (!tx.maxPriorityFeePerGas || !tx.maxFeePerGas || tx.type !== 2) {
      throw new Error("Can only sign EIP-1559 conforming transactions")
    }

    // TODO move this to a helper function
    const signedTx: SignedEVMTransaction = {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      nonce: tx.nonce,
      input: tx.data,
      value: tx.value.toBigInt(),
      type: tx.type,
      gasPrice: null,
      maxFeePerGas: tx.maxFeePerGas.toBigInt(),
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas.toBigInt(),
      gasLimit: tx.gasLimit.toBigInt(),
      r: tx.r,
      s: tx.s,
      v: tx.v,
      blockHash: null,
      blockHeight: null,
      asset: ETH,
      network: ETHEREUM,
    }
    console.log('SignedEVMTransaction 11')

    this.emitter.emit("signedTx", signedTx)
  }

  // //////////////////
  // PRIVATE METHODS //
  // //////////////////

  private emitKeyringState() {
    const keyrings = this.#keyrings.map((kr) => ({
      type: KeyringTypes.mnemonicBIP39S256,
      addresses: [...kr.getAccountsSync()],
      id: kr.id,
    }))
    this.emitter.emit("keyrings", keyrings)
  }
}
