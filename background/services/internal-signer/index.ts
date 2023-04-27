import { parse as parseRawTransaction } from "@ethersproject/transactions"

import HDKeyring, { SerializedHDKeyring } from "@tallyho/hd-keyring"

import { arrayify } from "ethers/lib/utils"
import { Wallet } from "ethers"
import { normalizeEVMAddress, sameEVMAddress } from "../../lib/utils"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { getEncryptedVaults, writeLatestEncryptedVault } from "./storage"
import {
  decryptVault,
  deriveSymmetricKeyFromPassword,
  encryptVault,
  SaltedKey,
} from "./encryption"
import {
  HexString,
  InternalSignerTypes,
  EIP712TypedData,
  UNIXTime,
} from "../../types"
import { SignedTransaction, TransactionRequestWithNonce } from "../../networks"

import BaseService from "../base"
import { FORK, MINUTE } from "../../constants"
import { ethersTransactionFromTransactionRequest } from "../chain/utils"
import { FeatureFlags, isEnabled } from "../../features"
import { AddressOnNetwork } from "../../accounts"
import logger from "../../lib/logger"

export const MAX_INTERNAL_SIGNERS_IDLE_TIME = 60 * MINUTE
export const MAX_OUTSIDE_IDLE_TIME = 60 * MINUTE

export type Keyring = {
  type: InternalSignerTypes
  id: string | null
  path: string | null
  addresses: string[]
}
export type PrivateKey = Keyring & {
  type: InternalSignerTypes.singleSECP
  path: null
  addresses: [string]
}

export type KeyringAccountSigner = {
  type: "keyring"
  keyringID: string
}

export type PrivateKeyAccountSigner = {
  type: "privateKey"
  walletID: string
}

export type InternalSignerSource = {
  source: "import" | "internal"
}

export enum SignerSourceTypes {
  privateKey = "privateKey",
  jsonFile = "jsonFile",
  keyring = "keyring",
}

type SerializedPrivateKey = {
  version: number
  id: string
  privateKey: string
}

type InternalSignerMetadataHDKeyring = {
  type: SignerSourceTypes.keyring
  mnemonic: string
  source: "import" | "internal"
  path?: string
}
type InternalSignerMetadataPrivateKey = {
  type: SignerSourceTypes.privateKey
  privateKey: string
}
type InternalSignerMetadataJSONPrivateKey = {
  type: SignerSourceTypes.jsonFile
  jsonFile: string
  password: string
}
export type InternalSignerMetadataWithType =
  | InternalSignerMetadataPrivateKey
  | InternalSignerMetadataHDKeyring
  | InternalSignerMetadataJSONPrivateKey

type InternalSignerHDKeyring = {
  type: SignerSourceTypes.keyring
  signer: HDKeyring
}
type InternalSignerPrivateKey = {
  type: SignerSourceTypes.privateKey
  signer: Wallet
}
type InternalSignerWithType = InternalSignerPrivateKey | InternalSignerHDKeyring

interface SerializedKeyringData {
  privateKeys: SerializedPrivateKey[]
  keyrings: SerializedHDKeyring[]
  metadata: { [signerId: string]: InternalSignerSource }
  hiddenAccounts: { [address: HexString]: boolean }
}

interface Events extends ServiceLifecycleEvents {
  locked: boolean
  internalSigners: {
    privateKeys: PrivateKey[]
    keyrings: Keyring[]
    metadata: {
      [signerId: string]: InternalSignerSource
    }
  }
  address: string
  // TODO message was signed
  signedTx: SignedTransaction
  signedData: string
}

const isRawPrivateKey = (
  signer: InternalSignerMetadataWithType
): signer is InternalSignerMetadataPrivateKey =>
  signer.type === SignerSourceTypes.privateKey

const isRawJsonPrivateKey = (
  signer: InternalSignerMetadataWithType
): signer is InternalSignerMetadataJSONPrivateKey =>
  signer.type === SignerSourceTypes.jsonFile

const isPrivateKey = (
  signer: InternalSignerWithType
): signer is InternalSignerPrivateKey =>
  signer.type === SignerSourceTypes.privateKey

const isKeyring = (
  signer: InternalSignerWithType
): signer is InternalSignerHDKeyring =>
  signer.type === SignerSourceTypes.keyring

/*
 * InternalSignerService is responsible for all key material, as well as applying the
 * material to sign messages, sign transactions, and derive child keypairs.
 *
 * The service can be in two states, locked or unlocked, and starts up locked.
 * Keys are persisted in encrypted form when the service is locked.
 *
 * When unlocked, the service automatically locks itself after it has not seen
 * activity for a certain amount of time. The service can be notified of
 * outside activity that should be considered for the purposes of keeping the
 * service unlocked. No keyring or keys activity for 30 minutes causes the service to
 * lock, while no outside activity for 30 minutes has the same effect.
 */
export default class InternalSignerService extends BaseService<Events> {
  #cachedKey: SaltedKey | null = null

  #keyrings: HDKeyring[] = []

  #privateKeys: Wallet[] = []

  #signerMetadata: { [signerId: string]: InternalSignerSource } = {}

  #hiddenAccounts: { [address: HexString]: boolean } = {}

  /**
   * The last time a wallet took an action that required the service to be
   * unlocked (signing, adding a keyring, etc).
   */
  lastActivity: UNIXTime | undefined

  /**
   * The last time the service was notified of an outside activity.
   * {@see markOutsideActivity}
   */
  lastOutsideActivity: UNIXTime | undefined

  static create: ServiceCreatorFunction<Events, InternalSignerService, []> =
    async () => {
      return new this()
    }

  private constructor() {
    super({
      autolock: {
        schedule: {
          periodInMinutes: 1,
        },
        handler: () => {
          this.autolockIfNeeded()
        },
      },
    })
  }

  override async internalStartService(): Promise<void> {
    // Emit locked status on startup. Should always be locked, but the main
    // goal is to have external viewers synced to internal state no matter what
    // it is. Don't emit if there are no keys to unlock.
    await super.internalStartService()
    if ((await getEncryptedVaults()).vaults.length > 0) {
      this.emitter.emit("locked", this.locked())
    }
  }

  override async internalStopService(): Promise<void> {
    await this.lock()

    await super.internalStopService()
  }

  /**
   * @return True if the service is locked, false if it is unlocked.
   */
  locked(): boolean {
    return this.#cachedKey === null
  }

  /**
   * Update activity timestamps and emit unlocked event.
   */
  #unlock(): void {
    this.lastActivity = Date.now()
    this.lastOutsideActivity = Date.now()
    this.emitter.emit("locked", false)
  }

  /**
   * Unlock the service with a provided password, initializing from the most
   * recently persisted keys vault if one exists.
   *
   * @param password A user-chosen string used to encrypt keys vaults.
   *        Unlocking will fail if an existing vault is found, and this password
   *        can't decrypt it.
   *
   *        Note that losing this password means losing access to any key
   *        material stored in a vault.
   * @param ignoreExistingVaults If true, ignore any existing, previously
   *        persisted vaults on unlock, instead starting with a clean slate.
   *        This option makes sense if a user has lost their password, and needs
   *        to generate a new valut.
   *
   *        Note that old vaults aren't deleted, and can still be recovered
   *        later in an emergency.
   * @returns true if the service was successfully unlocked using the password,
   *          and false otherwise.
   */
  async unlock(
    password: string,
    ignoreExistingVaults = false
  ): Promise<boolean> {
    if (!this.locked()) {
      logger.warn("InternalSignerService is already unlocked!")
      this.#unlock()
      return true
    }

    if (!ignoreExistingVaults) {
      const { vaults } = await getEncryptedVaults()
      const currentEncryptedVault = vaults.slice(-1)[0]?.vault
      if (currentEncryptedVault) {
        // attempt to load the vault
        const saltedKey = await deriveSymmetricKeyFromPassword(
          password,
          currentEncryptedVault.salt
        )
        let plainTextVault: SerializedKeyringData
        try {
          plainTextVault = await decryptVault<SerializedKeyringData>(
            currentEncryptedVault,
            saltedKey
          )
          this.#cachedKey = saltedKey
        } catch (err) {
          // if we weren't able to load the vault, don't unlock
          return false
        }
        // hooray! vault is loaded, import any serialized keys
        this.#keyrings = []
        this.#signerMetadata = {}
        this.#privateKeys = []
        plainTextVault.keyrings.forEach((kr) => {
          this.#keyrings.push(HDKeyring.deserialize(kr))
        })

        plainTextVault.privateKeys?.forEach((pk) =>
          this.#privateKeys.push(new Wallet(pk.privateKey))
        )

        this.#signerMetadata = {
          ...plainTextVault.metadata,
        }

        this.#hiddenAccounts = {
          ...plainTextVault.hiddenAccounts,
        }

        this.emitInternalSigners()
      }
    }

    // if there's no vault or we want to force a new vault, generate a new key
    // and unlock
    if (!this.#cachedKey) {
      this.#cachedKey = await deriveSymmetricKeyFromPassword(password)
      await this.persistInternalSigners()
    }

    this.#unlock()
    return true
  }

  /**
   * Lock the service, deleting references to the cached vault
   * encryption keys and keyrings.
   */
  async lock(): Promise<void> {
    this.lastActivity = undefined
    this.lastOutsideActivity = undefined
    this.#cachedKey = null
    this.#keyrings = []
    this.#signerMetadata = {}
    this.#privateKeys = []
    this.emitter.emit("locked", true)
    this.emitInternalSigners()
  }

  /**
   * Notifies the service that an outside activity occurred. Outside activities
   * are used to delay autolocking.
   */
  markOutsideActivity(): void {
    if (typeof this.lastOutsideActivity !== "undefined") {
      this.lastOutsideActivity = Date.now()
    }
  }

  // Locks the service if the time since last service or outside activity
  // exceeds preset levels.
  private async autolockIfNeeded(): Promise<void> {
    if (
      typeof this.lastActivity === "undefined" ||
      typeof this.lastOutsideActivity === "undefined"
    ) {
      // Normally both activity counters should be undefined only if the service
      // is locked, otherwise they should both be set; regardless, fail safe if
      // either is undefined and the service is unlocked.
      if (!this.locked()) {
        await this.lock()
      }

      return
    }

    const now = Date.now()
    const timeSinceLastActivity = now - this.lastActivity
    const timeSinceLastOutsideActivity = now - this.lastOutsideActivity

    if (timeSinceLastActivity >= MAX_INTERNAL_SIGNERS_IDLE_TIME) {
      this.lock()
    } else if (timeSinceLastOutsideActivity >= MAX_OUTSIDE_IDLE_TIME) {
      this.lock()
    }
  }

  // Throw if the service is not unlocked; if it is, update the last service
  // activity timestamp.
  private requireUnlocked(): void {
    if (this.locked()) {
      throw new Error("InternalSignerService must be unlocked.")
    }

    this.lastActivity = Date.now()
    this.markOutsideActivity()
  }

  // ///////////////////////////////////////////
  // METHODS THAT REQUIRE AN UNLOCKED SERVICE //
  // ///////////////////////////////////////////

  /**
   * Generate a new keyring
   *
   * @param type - the type of keyring to generate. Currently only supports 256-
   *        bit HD keys.
   * @returns An object containing the string ID of the new keyring and the
   *          mnemonic for the new keyring. Note that the mnemonic can only be
   *          accessed at generation time through this return value.
   */
  async generateNewKeyring(
    type: InternalSignerTypes,
    path?: string
  ): Promise<{ id: string; mnemonic: string[] }> {
    this.requireUnlocked()

    if (type !== InternalSignerTypes.mnemonicBIP39S256) {
      throw new Error(
        "InternalSignerService only supports generating 256-bit HD key trees"
      )
    }

    const options: { strength: number; path?: string } = { strength: 256 }

    if (path) {
      options.path = path
    }

    const newKeyring = new HDKeyring(options)

    const { mnemonic } = newKeyring.serializeSync()

    return { id: newKeyring.id, mnemonic: mnemonic.split(" ") }
  }

  /**
   * Import new internal signer
   *
   * @param signerMetadata any signer with type and metadata
   * @returns null | string - if new account was added then returns an address
   */
  async importSigner(
    signerMetadata: InternalSignerMetadataWithType
  ): Promise<HexString | null> {
    this.requireUnlocked()
    let address: HexString | null

    if (isRawPrivateKey(signerMetadata)) {
      address = await this.#importPrivateKey(signerMetadata)
    } else if (isRawJsonPrivateKey(signerMetadata)) {
      address = await this.#importJSON(signerMetadata)
    } else {
      address = await this.#importKeyring(signerMetadata)
    }

    if (!address) return null

    this.#hiddenAccounts[address] = false
    await this.persistInternalSigners()
    this.emitter.emit("address", address)
    this.emitInternalSigners()

    return address
  }

  /**
   * Import keyring and pull the first address from that
   * keyring for system use.
   *
   * @param signerMetadata - keyring metadata - path, source, mnemonic
   * @returns address of the first account from the HD keyring
   */
  async #importKeyring(
    signerMetadata: InternalSignerMetadataHDKeyring
  ): Promise<string | null> {
    const { mnemonic, source, path } = signerMetadata

    const newKeyring = path
      ? new HDKeyring({ mnemonic, path })
      : new HDKeyring({ mnemonic })

    if (this.#keyrings.some((kr) => kr.id === newKeyring.id)) {
      return null
    }
    this.#keyrings.push(newKeyring)
    const [address] = newKeyring.addAddressesSync(1)
    this.#signerMetadata[newKeyring.id] = { source }

    return address
  }

  /**
   * Import private key with a string
   * @param signerMetadata - private key metadata - private key string
   * @returns address of imported account
   */
  async #importPrivateKey(
    signerMetadata: InternalSignerMetadataPrivateKey
  ): Promise<string | null> {
    const { privateKey } = signerMetadata
    const newWallet = new Wallet(privateKey)
    const normalizedAddress = normalizeEVMAddress(newWallet.address)
    // TODO: check if this wallet already exists
    this.#privateKeys.push(newWallet)
    this.#signerMetadata[normalizedAddress] = { source: "import" }
    return normalizedAddress
  }

  /**
   * Import private key with JSON file
   * @param signerMetadata - JSON keystore metadata - stringified contents of JSON file, password
   * @returns address of imported account
   */
  async #importJSON(
    signerMetadata: InternalSignerMetadataJSONPrivateKey
  ): Promise<string | null> {
    const { jsonFile, password } = signerMetadata
    const newWallet = await Wallet.fromEncryptedJson(jsonFile, password)
    const normalizedAddress = normalizeEVMAddress(newWallet.address)
    this.#privateKeys.push(newWallet)
    this.#signerMetadata[normalizedAddress] = { source: "import" }
    return normalizedAddress
  }

  /**
   * Return the source of a given address' signer if it exists. If an
   * address does not have a internal signer associated with it - returns null.
   */
  getSignerSourceForAddress(address: string): "import" | "internal" | null {
    try {
      const signerWithType = this.#findSigner(address)
      if (isKeyring(signerWithType)) {
        return this.#signerMetadata[signerWithType.signer.id].source
      }
      return this.#signerMetadata[
        normalizeEVMAddress(signerWithType.signer.address)
      ].source
    } catch (e) {
      // Address is not associated with an internal signer
      return null
    }
  }

  /**
   * Return an array of keyring representations that can safely be stored and
   * used outside the extension.
   */
  getKeyrings(): Keyring[] {
    this.requireUnlocked()

    return this.#keyrings.map((kr) => ({
      // TODO this type is meanlingless from the library's perspective.
      // Reconsider, or explicitly track which keyrings have been generated vs
      // imported as well as their strength
      type: InternalSignerTypes.mnemonicBIP39S256,
      addresses: [
        ...kr
          .getAddressesSync()
          .filter((address) => this.#hiddenAccounts[address] !== true),
      ],
      id: kr.id,
      path: kr.path,
    }))
  }

  /**
   * Returns and array of private keys representations that can safely be stored
   * and used outside the extension
   */
  getPrivateKeys(): PrivateKey[] {
    this.requireUnlocked()

    return this.#privateKeys.map((wallet) => ({
      type: InternalSignerTypes.singleSECP,
      addresses: [normalizeEVMAddress(wallet.address)],
      id: wallet.publicKey,
      path: null,
    }))
  }

  /**
   * Derive and return the next address for a KeyringAccountSigner representing
   * an HDKeyring.
   *
   * @param keyringAccountSigner - A KeyringAccountSigner representing the
   *        given keyring.
   */
  async deriveAddress({ keyringID }: KeyringAccountSigner): Promise<HexString> {
    this.requireUnlocked()

    // find the keyring using a linear search
    const keyring = this.#keyrings.find((kr) => kr.id === keyringID)
    if (!keyring) {
      throw new Error("Keyring not found.")
    }

    const keyringAddresses = keyring.getAddressesSync()

    // If There are any hidden addresses, show those first before adding new ones.
    const newAddress =
      keyringAddresses.find(
        (address) => this.#hiddenAccounts[address] === true
      ) ?? keyring.addAddressesSync(1)[0]

    this.#hiddenAccounts[newAddress] = false

    await this.persistInternalSigners()

    this.emitter.emit("address", newAddress)
    this.emitInternalSigners()

    return newAddress
  }

  async hideAccount(address: HexString): Promise<void> {
    this.#hiddenAccounts[address] = true
    const signerWithType = this.#findSigner(address)

    if (isKeyring(signerWithType)) {
      const { signer } = signerWithType
      const keyringAddresses = await signer.getAddresses()

      if (
        keyringAddresses.every(
          (keyringAddress) => this.#hiddenAccounts[keyringAddress] === true
        )
      ) {
        keyringAddresses.forEach((keyringAddress) => {
          delete this.#hiddenAccounts[keyringAddress]
        })
        this.#removeKeyring(signer.id)
      }
    } else {
      this.#removePrivateKey(address)
    }
    await this.persistInternalSigners()
    this.emitInternalSigners()
  }

  async exportPrivateKey(address: HexString): Promise<string | null> {
    this.requireUnlocked()

    try {
      const signerWithType = this.#findSigner(address)

      if (isPrivateKey(signerWithType)) {
        return signerWithType.signer.privateKey
      }

      return signerWithType.signer.exportPrivateKey(
        address,
        "I solemnly swear that I am treating this private key material with great care."
      )
    } catch (e) {
      logger.error(`Export private key for address ${address} failed:`, e)
      return null
    }
  }

  async exportMnemonic(address: HexString): Promise<string | null> {
    this.requireUnlocked()

    const keyring = this.#findKeyring(address)

    if (!keyring) {
      logger.error(`Export mnemonic for address ${address} failed.`)
      return null
    }

    const { mnemonic } = await keyring.serialize()
    return mnemonic
  }

  #removeKeyring(keyringId: string): HDKeyring[] {
    const filteredKeyrings = this.#keyrings.filter(
      (keyring) => keyring.id !== keyringId
    )

    if (filteredKeyrings.length === this.#keyrings.length) {
      throw new Error(
        `Attempting to remove keyring that does not exist. id: (${keyringId})`
      )
    }
    this.#keyrings = filteredKeyrings
    return filteredKeyrings
  }

  #removePrivateKey(address: HexString): Wallet[] {
    const filteredPrivateKeys = this.#privateKeys.filter(
      (wallet) => !sameEVMAddress(wallet.address, address)
    )

    if (filteredPrivateKeys.length === this.#privateKeys.length) {
      throw new Error(
        `Attempting to remove wallet that does not exist. Address: (${address})`
      )
    }

    this.#privateKeys = filteredPrivateKeys
    return filteredPrivateKeys
  }

  /**
   * Find keyring associated with an account.
   *
   * @param account - the account address desired to search the keyring for.
   * @returns HD keyring object
   */
  #findKeyring(account: HexString): HDKeyring | null {
    const keyring = this.#keyrings.find((kr) =>
      kr.getAddressesSync().includes(normalizeEVMAddress(account))
    )

    return keyring ?? null
  }

  /**
   * Find a wallet imported with a private key
   *
   * @param account - the account address desired to search the wallet for.
   * @returns Ether's Wallet object
   */
  #findPrivateKey(account: HexString): Wallet | null {
    const privateKey = this.#privateKeys.find((item) =>
      sameEVMAddress(item.address, account)
    )

    return privateKey ?? null
  }

  /**
   * Find a signer object associated with a given account address
   */
  #findSigner(account: HexString): InternalSignerWithType {
    const keyring = this.#findKeyring(account)

    if (keyring) {
      return {
        signer: keyring,
        type: SignerSourceTypes.keyring,
      }
    }

    const privateKey = this.#findPrivateKey(account)

    if (privateKey) {
      return {
        signer: privateKey,
        type: SignerSourceTypes.privateKey,
      }
    }

    throw new Error(`Signer not found for address ${account}`)
  }

  /**
   * Sign a transaction.
   *
   * @param account - the account desired to sign the transaction
   * @param txRequest
   */
  async signTransaction(
    addressOnNetwork: AddressOnNetwork,
    txRequest: TransactionRequestWithNonce
  ): Promise<SignedTransaction> {
    this.requireUnlocked()

    const { address: account, network } = addressOnNetwork

    // find the signer using a linear search
    const signerWithType = this.#findSigner(account)

    // ethers has a looser / slightly different request type
    const ethersTxRequest = ethersTransactionFromTransactionRequest(txRequest)

    let signedRawTx: string

    // unfortunately, ethers gives us a serialized signed tx here
    if (isPrivateKey(signerWithType)) {
      signedRawTx = await signerWithType.signer.signTransaction(ethersTxRequest)
    } else {
      signedRawTx = await signerWithType.signer.signTransaction(
        account,
        ethersTxRequest
      )
    }

    // parse the tx, then unpack it as best we can
    const tx = parseRawTransaction(signedRawTx)

    if (!tx.hash || !tx.from || !tx.r || !tx.s || typeof tx.v === "undefined") {
      throw new Error("Transaction doesn't appear to have been signed.")
    }

    const {
      to,
      gasPrice,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      hash,
      from,
      nonce,
      data,
      value,
      type,
      r,
      s,
      v,
    } = tx

    if (
      typeof maxPriorityFeePerGas === "undefined" ||
      typeof maxFeePerGas === "undefined" ||
      type !== 2
    ) {
      const signedTx = {
        hash,
        from,
        to,
        nonce,
        input: data,
        value: value.toBigInt(),
        type: type as 0,
        gasPrice: gasPrice?.toBigInt() ?? null,
        gasLimit: gasLimit.toBigInt(),
        maxFeePerGas: null,
        maxPriorityFeePerGas: null,
        r,
        s,
        v,
        blockHash: null,
        blockHeight: null,
        asset: network.baseAsset,
        network: isEnabled(FeatureFlags.USE_MAINNET_FORK) ? FORK : network,
      }
      return signedTx
    }

    // TODO move this to a helper function
    const signedTx: SignedTransaction = {
      hash,
      from,
      to,
      nonce,
      input: data,
      value: value.toBigInt(),
      type,
      gasPrice: null,
      maxFeePerGas: maxFeePerGas.toBigInt(),
      maxPriorityFeePerGas: maxPriorityFeePerGas.toBigInt(),
      gasLimit: gasLimit.toBigInt(),
      r,
      s,
      v,
      blockHash: null,
      blockHeight: null,
      asset: network.baseAsset,
      network: isEnabled(FeatureFlags.USE_MAINNET_FORK) ? FORK : network,
    }

    return signedTx
  }
  /**
   * Sign typed data based on EIP-712 with the usage of eth_signTypedData_v4 method,
   * more information about the EIP can be found at https://eips.ethereum.org/EIPS/eip-712
   *
   * @param typedData - the data to be signed
   * @param account - signers account address
   */

  async signTypedData({
    typedData,
    account,
  }: {
    typedData: EIP712TypedData
    account: HexString
  }): Promise<string> {
    this.requireUnlocked()
    const { domain, types, message } = typedData
    const signerWithType = this.#findSigner(account)
    // When signing we should not include EIP712Domain type
    const { EIP712Domain, ...typesForSigning } = types
    try {
      let signature: string
      if (isPrivateKey(signerWithType)) {
        // eslint-disable-next-line no-underscore-dangle
        signature = await signerWithType.signer._signTypedData(
          domain,
          typesForSigning,
          message
        )
      } else {
        signature = await signerWithType.signer.signTypedData(
          account,
          domain,
          typesForSigning,
          message
        )
      }

      return signature
    } catch (error) {
      throw new Error(`Signing data failed`)
    }
  }

  /**
   * Sign data based on EIP-191 with the usage of personal_sign method,
   * more information about the EIP can be found at https://eips.ethereum.org/EIPS/eip-191
   *
   * @param signingData - the data to be signed
   * @param account - signers account address
   */

  async personalSign({
    signingData,
    account,
  }: {
    signingData: HexString
    account: HexString
  }): Promise<string> {
    this.requireUnlocked()
    const signerWithType = this.#findSigner(account)
    const messageBytes = arrayify(signingData)
    try {
      let signature: string
      if (isPrivateKey(signerWithType)) {
        signature = await signerWithType.signer.signMessage(messageBytes)
      } else {
        signature = await signerWithType.signer.signMessageBytes(
          account,
          messageBytes
        )
      }

      return signature
    } catch (error) {
      throw new Error("Signing data failed")
    }
  }

  // //////////////////
  // PRIVATE METHODS //
  // //////////////////

  private emitInternalSigners() {
    if (this.locked()) {
      this.emitter.emit("internalSigners", {
        privateKeys: [],
        keyrings: [],
        metadata: {},
      })
    } else {
      const keyrings = this.getKeyrings()
      const privateKeys = this.getPrivateKeys()
      this.emitter.emit("internalSigners", {
        privateKeys,
        keyrings,
        metadata: { ...this.#signerMetadata },
      })
    }
  }

  /**
   * Serialize, encrypt, and persist all HDKeyrings and private keys.
   */
  private async persistInternalSigners() {
    this.requireUnlocked()

    // This if guard will always pass due to requireUnlocked, but statically
    // prove it to TypeScript.
    if (this.#cachedKey !== null) {
      const serializedKeyrings: SerializedHDKeyring[] = this.#keyrings.map(
        (kr) => kr.serializeSync()
      )
      const serializedPrivateKeys: SerializedPrivateKey[] =
        this.#privateKeys.map((wallet) => ({
          version: 1,
          id: wallet.publicKey,
          privateKey: wallet.privateKey,
        }))
      const hiddenAccounts = { ...this.#hiddenAccounts }
      const metadata = { ...this.#signerMetadata }
      serializedKeyrings.sort((a, b) => (a.id > b.id ? 1 : -1))
      const vault = await encryptVault(
        {
          keyrings: serializedKeyrings,
          privateKeys: serializedPrivateKeys,
          metadata,
          hiddenAccounts,
        },
        this.#cachedKey
      )
      await writeLatestEncryptedVault(vault)
    }
  }
}
