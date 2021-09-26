import { webcrypto } from "crypto"
import { encryptVault, decryptVault } from "../services/keyring/encryption"

beforeEach(() => {
  // polyfill the WebCrypto API
  global.crypto = webcrypto as unknown as Crypto
})

afterEach(() => {
  delete global.crypto
})

test("can encrypt a vault", async () => {
  const vault = { a: 1 }
  const password = "this-is-a-poor-password"
  await encryptVault(vault, password)
})

test("can decrypt an encrypted vault", async () => {
  const vault = { a: 1 }
  const password = "this-is-a-poor-password"
  const encryptedVault = await encryptVault(vault, password)

  const newVault = await decryptVault(encryptedVault, password)

  expect(newVault).toEqual(vault)
})

test("can decrypt a complex encrypted vault", async () => {
  const vault = { a: { b: [1, 2, 3] }, c: null, d: 123 }
  const password = "this-is-a-poor-password"
  const encryptedVault = await encryptVault(vault, password)

  const newVault = await decryptVault(encryptedVault, password)

  expect(newVault).toEqual(vault)
})
