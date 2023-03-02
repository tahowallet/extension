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
import { HexString, KeyringTypes, EIP712TypedData, UNIXTime } from "../../types"
import { SignedTransaction, TransactionRequestWithNonce } from "../../networks"

import BaseService from "../base"
import { FORK, MINUTE } from "../../constants"
import { ethersTransactionFromTransactionRequest } from "../chain/utils"
import { FeatureFlags, isEnabled } from "../../features"
import { AddressOnNetwork } from "../../accounts"
import logger from "../../lib/logger"

export const MAX_KEYRING_IDLE_TIME = 60 * MINUTE
export const MAX_OUTSIDE_IDLE_TIME = 60 * MINUTE

export type WalletData = {
  type: KeyringTypes.singleSECP
  id: string | null
  path: null
  addresses: [string]
}

export type SerializedWallet = {
  version: number
  id: string
  privateKey: string
}

export type Keyring = {
  type: KeyringTypes
  id: string | null
  path: string | null
  addresses: string[]
}

export type KeyringAccountSigner = {
  type: "keyring"
  keyringID: string
}

export interface SignerMetadata {
  source: "import" | "internal"
}

type SignerWallet = { type: "wallet"; signer: Wallet }
type SignerHDKeyring = { type: "keyring"; signer: HDKeyring }
type SignerWithType = SignerWallet | SignerHDKeyring

interface SerializedKeyringData {
  wallets: SerializedWallet[]
  keyrings: SerializedHDKeyring[]
  metadata: { [signerId: string]: SignerMetadata }
  hiddenAccounts: { [address: HexString]: boolean }
}

interface Events extends ServiceLifecycleEvents {
  locked: boolean
  keyrings: {
    wallets: WalletData[]
    keyrings: Keyring[]
    metadata: {
      [signerId: string]: SignerMetadata
    }
  }
  address: string
  // TODO message was signed
  signedTx: SignedTransaction
  signedData: string
}

const isWallet = (signer: SignerWithType): signer is SignerWallet =>
  signer.type === "wallet"
const isKeyring = (signer: SignerWithType): signer is SignerHDKeyring =>
  signer.type === "keyring"

/*
 * KeyringService is responsible for all key material, as well as applying the
 * material to sign messages, sign transactions, and derive child keypairs.
 *
 * The service can be in two states, locked or unlocked, and starts up locked.
 * Keyrings are persisted in encrypted form when the service is locked.
 *
 * When unlocked, the service automatically locks itself after it has not seen
 * activity for a certain amount of time. The service can be notified of
 * outside activity that should be considered for the purposes of keeping the
 * service unlocked. No keyring activity for 30 minutes causes the service to
 * lock, while no outside activity for 30 minutes has the same effect.
 */
export default class KeyringService extends BaseService<Events> {
  #cachedKey: SaltedKey | null = null

  #keyrings: HDKeyring[] = []

  #signerMetadata: { [keyringId: string]: SignerMetadata } = {}

  #wallets: Wallet[] = []

  #hiddenAccounts: { [address: HexString]: boolean } = {}

  /**
   * The last time a keyring took an action that required the service to be
   * unlocked (signing, adding a keyring, etc).
   */
  lastKeyringActivity: UNIXTime | undefined

  /**
   * The last time the keyring was notified of an activity outside of the
   * keyring. {@see markOutsideActivity}
   */
  lastOutsideActivity: UNIXTime | undefined

  static create: ServiceCreatorFunction<Events, KeyringService, []> =
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
    // it is. Don't emit if there are no keyrings to unlock.
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
   * @return True if the keyring is locked, false if it is unlocked.
   */
  locked(): boolean {
    return this.#cachedKey === null
  }

  /**
   * Update activity timestamps and emit unlocked event.
   */
  #unlock(): void {
    this.lastKeyringActivity = Date.now()
    this.lastOutsideActivity = Date.now()
    this.emitter.emit("locked", false)
  }

  /**
   * Unlock the keyring with a provided password, initializing from the most
   * recently persisted keyring vault if one exists.
   *
   * @param password A user-chosen string used to encrypt keyring vaults.
   *        Unlocking will fail if an existing vault is found, and this password
   *        can't decrypt it.
   *
   *        Note that losing this password means losing access to any key
   *        material stored in a vault.
   * @param ignoreExistingVaults If true, ignore any existing, previously
   *        persisted vaults on unlock, instead starting with a clean slate.
   *        This option makes sense if a user has lost their password, and needs
   *        to generate a new keyring.
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
      logger.warn("KeyringService is already unlocked!")
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
        // hooray! vault is loaded, import any serialized keyrings
        this.#keyrings = []
        this.#signerMetadata = {}
        this.#wallets = []
        plainTextVault.keyrings.forEach((kr) => {
          this.#keyrings.push(HDKeyring.deserialize(kr))
        })

        plainTextVault.wallets?.forEach((wallet) =>
          this.#wallets.push(new Wallet(wallet.privateKey))
        )

        this.#signerMetadata = {
          ...plainTextVault.metadata,
        }

        this.#hiddenAccounts = {
          ...plainTextVault.hiddenAccounts,
        }

        this.emitKeyrings()
      }
    }

    // if there's no vault or we want to force a new vault, generate a new key
    // and unlock
    if (!this.#cachedKey) {
      this.#cachedKey = await deriveSymmetricKeyFromPassword(password)
      await this.persistKeyrings()
    }

    this.#unlock()
    return true
  }

  /**
   * Lock the keyring service, deleting references to the cached vault
   * encryption key and keyrings.
   */
  async lock(): Promise<void> {
    this.lastKeyringActivity = undefined
    this.lastOutsideActivity = undefined
    this.#cachedKey = null
    this.#keyrings = []
    this.#signerMetadata = {}
    this.#wallets = []
    this.emitter.emit("locked", true)
    this.emitKeyrings()
  }

  /**
   * Notifies the keyring that an outside activity occurred. Outside activities
   * are used to delay autolocking.
   */
  markOutsideActivity(): void {
    if (typeof this.lastOutsideActivity !== "undefined") {
      this.lastOutsideActivity = Date.now()
    }
  }

  // Locks the keyring if the time since last keyring or outside activity
  // exceeds preset levels.
  private async autolockIfNeeded(): Promise<void> {
    if (
      typeof this.lastKeyringActivity === "undefined" ||
      typeof this.lastOutsideActivity === "undefined"
    ) {
      // Normally both activity counters should be undefined only if the keyring
      // is locked, otherwise they should both be set; regardless, fail safe if
      // either is undefined and the keyring is unlocked.
      if (!this.locked()) {
        await this.lock()
      }

      return
    }

    const now = Date.now()
    const timeSinceLastKeyringActivity = now - this.lastKeyringActivity
    const timeSinceLastOutsideActivity = now - this.lastOutsideActivity

    if (timeSinceLastKeyringActivity >= MAX_KEYRING_IDLE_TIME) {
      this.lock()
    } else if (timeSinceLastOutsideActivity >= MAX_OUTSIDE_IDLE_TIME) {
      this.lock()
    }
  }

  // Throw if the keyring is not unlocked; if it is, update the last keyring
  // activity timestamp.
  private requireUnlocked(): void {
    if (this.locked()) {
      throw new Error("KeyringService must be unlocked.")
    }

    this.lastKeyringActivity = Date.now()
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
    type: KeyringTypes,
    path?: string
  ): Promise<{ id: string; mnemonic: string[] }> {
    this.requireUnlocked()

    if (type !== KeyringTypes.mnemonicBIP39S256) {
      throw new Error(
        "KeyringService only supports generating 256-bit HD key trees"
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
   * Import keyring and pull the first address from that
   * keyring for system use.
   *
   * @param mnemonic - a seed phrase
   * @returns The string ID of the new keyring.
   */
  async importKeyring(
    mnemonic: string,
    source: "import" | "internal",
    path?: string
  ): Promise<string> {
    this.requireUnlocked()

    const newKeyring = path
      ? new HDKeyring({ mnemonic, path })
      : new HDKeyring({ mnemonic })

    if (this.#keyrings.some((kr) => kr.id === newKeyring.id)) {
      return newKeyring.id
    }
    this.#keyrings.push(newKeyring)
    const [address] = newKeyring.addAddressesSync(1)
    this.#signerMetadata[newKeyring.id] = { source }
    await this.persistKeyrings()
    this.emitter.emit("address", address)
    this.emitKeyrings()
    return newKeyring.id
  }

  async importWallet(privateKey: string): Promise<void> {
    this.requireUnlocked()

    const newWallet = new Wallet(privateKey)
    const normalizedAddress = normalizeEVMAddress(newWallet.address)
    this.#wallets.push(newWallet)
    this.#signerMetadata[normalizedAddress] = { source: "import" }
    await this.persistKeyrings()
    this.emitter.emit("address", normalizedAddress)
    this.emitKeyrings()
  }

  /**
   * Return the source of a given address' keyring if it exists.  If an
   * address does not have a keyring associated with it - returns null.
   */
  async getSignerSourceForAddress(
    address: string
  ): Promise<"import" | "internal" | null> {
    try {
      const signerWithType = await this.#findSigner(address)
      if (isKeyring(signerWithType)) {
        return this.#signerMetadata[signerWithType.signer.id].source
      }
      return this.#signerMetadata[
        normalizeEVMAddress(signerWithType.signer.address)
      ].source
    } catch (e) {
      // Address is not associated with a keyring
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
      type: KeyringTypes.mnemonicBIP39S256,
      addresses: [
        ...kr
          .getAddressesSync()
          .filter((address) => this.#hiddenAccounts[address] !== true),
      ],
      id: kr.id,
      path: kr.path,
    }))
  }

  getWallets(): WalletData[] {
    this.requireUnlocked()

    return this.#wallets.map((wallet) => ({
      type: KeyringTypes.singleSECP,
      addresses: [wallet.address],
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

    await this.persistKeyrings()

    this.emitter.emit("address", newAddress)
    this.emitKeyrings()

    return newAddress
  }

  async hideAccount(address: HexString): Promise<void> {
    this.#hiddenAccounts[address] = true
    const signerWithType = await this.#findSigner(address)

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
      this.#removeWallet(address)
    }
    await this.persistKeyrings()
    this.emitKeyrings()
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

  #removeWallet(address: HexString): Wallet[] {
    const filteredWallets = this.#wallets.filter(
      (wallet) => !sameEVMAddress(wallet.address, address)
    )

    if (filteredWallets.length === this.#wallets.length) {
      throw new Error(
        `Attempting to remove wallet that does not exist. Address: (${address})`
      )
    }

    this.#wallets = filteredWallets
    return filteredWallets
  }

  /**
   * Find keyring associated with an account.
   *
   * @param account - the account desired to search the keyring for.
   */
  async #findKeyring(account: HexString): Promise<HDKeyring> {
    const keyring = this.#keyrings.find((kr) =>
      kr.getAddressesSync().includes(normalizeEVMAddress(account))
    )
    if (!keyring) {
      throw new Error(`Keyring not found for address ${account}.`)
    }
    return keyring
  }

  async #findWallet(account: HexString): Promise<Wallet> {
    const wallet = this.#wallets.find((item) =>
      sameEVMAddress(item.address, account)
    )
    if (!wallet) {
      throw new Error(`Wallet not found for address ${account}`)
    }
    return wallet
  }

  async #findSigner(account: HexString): Promise<SignerWithType> {
    try {
      return {
        signer: await this.#findKeyring(account),
        type: "keyring",
      }
    } catch (e1) {
      try {
        return {
          signer: await this.#findWallet(account),
          type: "wallet",
        }
      } catch (e2) {
        throw new Error(`Signer not found for address ${account}`)
      }
    }
  }

  /**
   * Sign a transaction.
   *
   * @param account - the account desired to sign the transaction
   * @param txRequest -
   */
  async signTransaction(
    addressOnNetwork: AddressOnNetwork,
    txRequest: TransactionRequestWithNonce
  ): Promise<SignedTransaction> {
    this.requireUnlocked()

    const { address: account, network } = addressOnNetwork

    // find the keyring using a linear search
    const { signer } = await this.#findSigner(account)

    // ethers has a looser / slightly different request type
    const ethersTxRequest = ethersTransactionFromTransactionRequest(txRequest)

    // unfortunately, ethers gives us a serialized signed tx here
    const signed = await signer.signTransaction(account, ethersTxRequest)

    // parse the tx, then unpack it as best we can
    const tx = parseRawTransaction(signed)

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
    const signerWithType = await this.#findSigner(account)
    // When signing we should not include EIP712Domain type
    const { EIP712Domain, ...typesForSigning } = types
    try {
      let signature: string
      if (isWallet(signerWithType)) {
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
      throw new Error("Signing data failed")
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
    const signerWithType = await this.#findSigner(account)
    const messageBytes = arrayify(signingData)
    try {
      let signature: string
      if (isWallet(signerWithType)) {
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

  private emitKeyrings() {
    if (this.locked()) {
      this.emitter.emit("keyrings", {
        wallets: [],
        keyrings: [],
        metadata: {},
      })
    } else {
      const keyrings = this.getKeyrings()
      const wallets = this.getWallets()
      this.emitter.emit("keyrings", {
        wallets,
        keyrings,
        metadata: { ...this.#signerMetadata },
      })
    }
  }

  /**
   * Serialize, encrypt, and persist all HDKeyrings.
   */
  private async persistKeyrings() {
    this.requireUnlocked()

    // This if guard will always pass due to requireUnlocked, but statically
    // prove it to TypeScript.
    if (this.#cachedKey !== null) {
      const serializedKeyrings: SerializedHDKeyring[] = this.#keyrings.map(
        (kr) => kr.serializeSync()
      )
      const serializedWallets: SerializedWallet[] = this.#wallets.map(
        (wallet) => ({
          version: 1,
          id: wallet.publicKey,
          privateKey: wallet.privateKey,
        })
      )
      const hiddenAccounts = { ...this.#hiddenAccounts }
      const metadata = { ...this.#signerMetadata }
      serializedKeyrings.sort((a, b) => (a.id > b.id ? 1 : -1))
      const vault = await encryptVault(
        {
          keyrings: serializedKeyrings,
          wallets: serializedWallets,
          metadata,
          hiddenAccounts,
        },
        this.#cachedKey
      )
      await writeLatestEncryptedVault(vault)
    }
  }
}
