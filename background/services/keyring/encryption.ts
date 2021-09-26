export type EncryptedVault = {
  // a base-64 encoded salt, required for decryption
  salt: string
  // a base-64 encoded AES-GCM init vector, required for decryption
  initializationVector: string
  // base-64 encoded ciphertext holding the vault contents
  cipherText: string
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
    initializationVector: bufferToBase64(initializationVector),
    cipherText: bufferToBase64(cipherText),
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

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(initializationVector) },
    key,
    base64ToBuffer(cipherText)
  )

  return JSON.parse(new TextDecoder().decode(plaintext))
}
