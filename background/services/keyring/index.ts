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
    await this.requireUnlocked()
    // TODO find the keyring
    // TODO actually attempt to sign the transaction
    const signedTx: SignedEVMTransaction = {
      hash: "0xfe57c35ebafee8296a1605a1ddfa4ef5aca88d1fc724102ce3b4ac00adad7085",
      type: 2,
      maxFeePerGas: BigInt("144664539722"),
      maxPriorityFeePerGas: BigInt(1000000000),
      nonce: BigInt(68),
      value: BigInt(0),
      from: "0x5f55cd7a509fda9f0beb9309a49a689eb8c122ee",
      to: "0x6dfcb04b7d2ab2069d9ba81ac643556429eb2d55",
      gas: BigInt(154944),
      gasPrice: BigInt("120428961153"),
      r: "0x12",
      s: "0x12",
      v: 1,
      input: "",
      blockHash: null,
      blockHeight: null,
      asset: ETH,
      network: ETHEREUM,
    }
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
