import { browser } from "webextension-polyfill-ts"

import { UNIXTime } from "../../types"

type SerializedEncryptedVaults = {
  version: 1
  vaults: {
    timeSaved: UNIXTime
    vault: string
  }[]
}

export type EncryptedVault = {
  // a base-64 encoded salt, required for decryption
  salt: string
  // a base-64 encoded AES-GCM init vector, required for decryption
  initializationVector: string
  // base-64 encoded ciphertext holding the vault contents
  cipherText: string
}

async function generateSalt(): Promise<string> {
  const saltBuffer = crypto.getRandomValues(new Uint8Array(64))
  return btoa(new TextDecoder().decode(saltBuffer))
}

function requireCryptoGlobal(message?: string) {
  if (global.crypto === undefined) {
    throw new Error(
      `${
        message || "Tally"
      } requires WebCrypto API support — is this being run in a modern browser?`
    )
  }
}

async function deriveKeyFromPassword(password: string, existingSalt?: string) {
  const { crypto } = global

  const salt = existingSalt || (await generateSalt())

  const encoder = new TextEncoder()

  const derivationKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 10000,
      hash: "SHA-256",
    },
    derivationKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )

  return {
    key,
    salt,
  }
}

export async function encryptVault<V>(
  vault: V,
  password: string
): Promise<EncryptedVault> {
  requireCryptoGlobal("Encrypting a vault")
  const { crypto } = global

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const initializationVector = crypto.getRandomValues(new Uint8Array(16))

  const { key, salt } = await deriveKeyFromPassword(password)

  const encodedPlaintext = encoder.encode(JSON.stringify(vault))

  const cipherText = await crypto.subtle.encrypt(
    // note we use GCM mode to get authentication guarantees / tamper
    // resistance
    { name: "AES-GCM", iv: initializationVector },
    key,
    encodedPlaintext
  )

  return {
    salt,
    initializationVector: btoa(decoder.decode(initializationVector)),
    cipherText: btoa(decoder.decode(cipherText)),
  }
}

export async function decryptVault<V>(
  vault: EncryptedVault,
  password: string
): Promise<V> {
  requireCryptoGlobal("Decrypting a vault")
  const { crypto } = global

  const { initializationVector, salt, cipherText } = vault

  const { key } = await deriveKeyFromPassword(password, salt)

  const encoder = new TextEncoder()

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: encoder.encode(atob(initializationVector)) },
    key,
    encoder.encode(atob(cipherText))
  )

  return JSON.parse(new TextDecoder().decode(plaintext))
}

/**
 * Retrieve all serialized encrypted vaults from extension storage.
 *
 * @returns a schema version and array of serialized vaults
 */
export async function getEncryptedVaults(): Promise<SerializedEncryptedVaults> {
  const data = await browser.storage.local.get("tallyVaults")
  if (!("tallyVaults" in data)) {
    return {
      version: 1,
      vaults: [],
    }
  }
  const { tallyVaults } = data
  if (
    "version" in tallyVaults &&
    tallyVaults.version === 1 &&
    "vaults" in tallyVaults &&
    Array.isArray(tallyVaults.vaults)
  ) {
    return tallyVaults as SerializedEncryptedVaults
  }
  throw new Error("Encrypted vaults are using an unkown serialization format")
}

/**
 * Write an encryptedVault to extension storage if and only if it's different
 * than the most recently saved vault.
 *
 * @param encryptedVault - an encrypted keyring controller vault that's been
 *        serialized to a string
 */
export async function writeLatestEncryptedVault(
  encryptedVault: string
): Promise<void> {
  const serializedVaults = await getEncryptedVaults()
  const vaults = [...serializedVaults.vaults]
  vaults.sort()
  const currentLatest = vaults.pop()
  // if there's been no change, don't write
  if (!currentLatest || currentLatest.vault !== encryptedVault) {
    await browser.storage.local.set({
      tallyVaults: {
        ...serializedVaults,
        vaults: [
          ...serializedVaults.vaults,
          {
            timeSaved: new Date().getTime(),
            vault: encryptedVault,
          },
        ],
      },
    })
  }
}
