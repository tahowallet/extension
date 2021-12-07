/**
 * An encrypted vault which can be safely serialized and stored.
 */
export type EncryptedVault = {
  // a base-64 encoded salt, required for decryption
  salt: string
  // a base-64 encoded AES-GCM init vector, required for decryption
  initializationVector: string
  // base-64 encoded ciphertext holding the vault contents
  cipherText: string
}

/*
 * A key with a salt that can be combined with a password to re-derive the key.
 *
 * Useful for caching non-extractable `CryptoKey`s rather than requiring keeping
 * a plaintext password lying around.
 */
export type SaltedKey = {
  salt: string
  key: CryptoKey
}

function bufferToBase64(array: Uint8Array): string {
  return Buffer.from(array).toString("base64")
}

function base64ToBuffer(s: string): Uint8Array {
  return Buffer.from(s, "base64")
}

async function generateSalt(): Promise<string> {
  const saltBuffer = crypto.getRandomValues(new Uint8Array(64))
  return bufferToBase64(saltBuffer)
}

/**
 * Throw an error if global.crypto isn't available. We don't want to fall back
 * to polyfills.
 */
function requireCryptoGlobal(message?: string) {
  if (global.crypto === undefined) {
    throw new Error(
      `${
        message || "Tally"
      } requires WebCrypto API support — is this being run in a modern browser?`
    )
  }
}

/**
 * Derive a WebCrypto symmetric key from a password and optional salt.
 *
 * @param password A user-supplied password. Without this value
 * @param salt A random salt used in the initial key derivation, if there has
 *        been one before. If no salt is provided, a random salt will be
 *        generated.
 *
 *        Note that the the symmetric, alone, or the salt *and* the password,
 *        together, must be retained to decrypt anything encrypted by the
 *        returned key. While the salt isn't secret key material, losing it
 *        could jeopardize access to user data (and therefor, funds).
 * @returns a salted symmetric key suitable for encrypting and decrypting
 *          material using AES GCM mode, as well as the salt required to derive
 *          the key again later.
 */
export async function deriveSymmetricKeyFromPassword(
  password: string,
  existingSalt?: string
): Promise<SaltedKey> {
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
      iterations: 1000000,
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

/**
 * Encrypt a JSON-serializable object with a supplied password using AES GCM
 * mode.
 *
 * @param vault Any JSON-serializable object that should be encrypted.
 * @param password A user-supplied password to encrypt the object, or a cached
 *        salted key
 * @returns the ciphertext and all non-password material required for later
 *          decryption, including the salt and AES initialization vector.
 */
export async function encryptVault<V>(
  vault: V,
  passwordOrSaltedKey: string | SaltedKey
): Promise<EncryptedVault> {
  requireCryptoGlobal("Encrypting a vault")
  const { crypto } = global

  const { key, salt } =
    typeof passwordOrSaltedKey === "string"
      ? await deriveSymmetricKeyFromPassword(passwordOrSaltedKey)
      : passwordOrSaltedKey

  const encoder = new TextEncoder()

  const initializationVector = crypto.getRandomValues(new Uint8Array(16))

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
    initializationVector: bufferToBase64(initializationVector),
    cipherText: bufferToBase64(cipherText),
  }
}

/**
 * Given an encrypted vault, including ciphertext, salt, and AES initialization
 * vector, and the correct password, decrypt the vault.
 *
 * Vaults that were tampered with won't be decrypted, as enforced by the
 * authentication scheme included with AES GCM mode, and will instead throw.
 *
 * @param vault an encrypted vault, including salt, initialization vector, and
 *        ciphertext, as produced by `encryptVault`.
 * @param password A user-supplied password to decrypt the vault, or a cached
 *        salted key
 * @returns the decrypted object, serialized and deserialized via JSON. For
 *          most objects `decryptVault(encryptVault(o, password), password)`
 *          should deeply equal `o`.
 */
export async function decryptVault<V>(
  vault: EncryptedVault,
  passwordOrSaltedKey: string | SaltedKey
): Promise<V> {
  requireCryptoGlobal("Decrypting a vault")
  const { crypto } = global

  const { initializationVector, salt, cipherText } = vault

  const { key } =
    typeof passwordOrSaltedKey === "string"
      ? await deriveSymmetricKeyFromPassword(passwordOrSaltedKey, salt)
      : passwordOrSaltedKey

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(initializationVector) },
    key,
    base64ToBuffer(cipherText)
  )

  return JSON.parse(new TextDecoder().decode(plaintext))
}
