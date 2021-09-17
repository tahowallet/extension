import Emittery from "emittery"
import KeyringController from "@tallyho/keyring-controller"
import logger from "../../lib/logger"

import { Service } from ".."
import { getEncryptedVaults, writeLatestEncryptedVault } from "./storage"
import {
  EIP1559TransactionRequest,
  HexString,
  KeyringTypes,
  SignedEVMTransaction,
} from "../../types"
import { ETH, ETHEREUM } from "../../constants"

type Keyring = {
  type: KeyringTypes
  addresses: string[]
}

interface Events {
  locked: boolean
  unlocked: boolean
  keyrings: Keyring[]
  // TODO message was signed
  signedTx: SignedEVMTransaction
}

/*
 * KeyringService is responsible for all key material, as well as applying the
 * material to sign messages, sign transactions, and derive child keypairs.
 */
export default class KeyringService implements Service<Events> {
  readonly emitter: Emittery<Events>

  #hashedPassword: string | null

  #keyringController: Promise<KeyringController>

  constructor() {
    this.emitter = new Emittery<Events>()
    const currentEncryptedVault = (async () => {
      const { vaults } = await getEncryptedVaults()
      return vaults.pop()?.vault
    })()
    this.#keyringController = (async () => {
      const keyringOptions = {
        persistVault: writeLatestEncryptedVault,
        encryptedVault: await currentEncryptedVault,
      }
      const controller = new KeyringController(keyringOptions)

      controller.on("lock", () => this.emitter.emit("locked", true))
      controller.on("unlock", () => this.emitter.emit("unlocked", true))

      controller.memStore.subscribe((state) => {
        const keyrings = state.keyrings
          .filter((kr) => kr.type === "HD Key Tree")
          .map((kr) => ({
            type: KeyringTypes.mnemonicBIP39S256,
            addresses: [...kr.accounts],
          }))
        this.emitter.emit("keyrings", keyrings)
      })

      return controller
    })()
  }

  async startService(): Promise<void> {
    await this.#keyringController
  }

  async stopService(): Promise<void> {
    await this.lock()
  }

  async unlock(password: string): Promise<boolean> {
    const controller = await this.#keyringController
    const state = controller.memStore.getState()
    if (!controller.hasVault()) {
      // TODO this doesn't make much sense as a flow of operations. The entire
      // lock / unlock paradigm with the keyring controller is a bad fit for the
      // problem tbh, but leaving it for now.
      throw new Error(
        "Generate a keyring before unlocking the keyring service."
      )
    }
    return true
  }

  async lock(): Promise<void> {
    await (await this.#keyringController).setLocked()
  }

  private async requireUnlocked(): Promise<void> {
    if (!(await this.#keyringController).memStore.getState().isUnlocked) {
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
   */
  async generateNewKeyring(
    type: KeyringTypes,
    password?: string
  ): Promise<void> {
    if (type !== KeyringTypes.mnemonicBIP39S256) {
      throw new Error(
        "KeyringService only supports generating 256-bit HD key trees"
      )
    }
    const controller = await this.#keyringController
    const state = await controller.memStore.getState()
    if (state.keyrings.length < 1) {
      if (password === undefined) {
        throw new Error("Can't generate initial keyring without a password!")
      }
      await controller.createNewVaultAndKeychain(password, { strength: 256 })
    } else {
      if (password === undefined) {
        await this.requireUnlocked()
      }

      await controller.addNewKeyring("HD Key Tree", { strength: 256 })
    }
  }

  /**
   * Import a legacy 128 bit keyring.
   *
   * @param mnemonic - a 12-word seed phrase compatible with MetaMask.
   * @param password? - a password used to encrypt the keyring vault. Necessary
   *        if the service is locked or this is the first keyring created.
   */
  async importLegacyKeyring(
    mnemonic: string,
    password?: string
  ): Promise<void> {
    const controller = await this.#keyringController
    const state = await controller.memStore.getState()
    if (state.keyrings.length < 1) {
      if (password === undefined) {
        throw new Error("Can't import initial keyring without a password!")
      }
      await controller.createNewVaultAndRestore(password, mnemonic)
    } else {
      if (password === undefined) {
        await this.requireUnlocked()
      } else {
        await this.unlock(password)
      }
      await controller.addNewKeyring("HD Key Tree", { mnemonic, strength: 128 })
    }
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
      network: {
        ...ETHEREUM,
        family: "EVM",
        chainID: "1",
      },
    }
    this.emitter.emit("signedTx", signedTx)
  }
}
