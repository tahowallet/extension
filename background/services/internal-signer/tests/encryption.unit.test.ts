import {
  encryptVault,
  decryptVault,
  deriveSymmetricKeyFromPassword,
  VaultVersion,
} from "../encryption"

describe.each([VaultVersion.PBKDF2, VaultVersion.Argon2])(
  "Encryption utils",
  (vaultVersion) => {
    it("derives symmetric keys", async () => {
      /* oxlint-disable no-await-in-loop */
      for (let i = 0; i < 5; i += 1) {
        const password = Buffer.from(
          global.crypto.getRandomValues(new Uint8Array(16)),
        ).toString("base64")
        const newSalt = Buffer.from(
          global.crypto.getRandomValues(new Uint8Array(16)),
        ).toString("base64")

        const { key, salt } = await deriveSymmetricKeyFromPassword(
          vaultVersion,
          password,
          newSalt,
        )
        expect(salt).toEqual(newSalt)

        expect(new Set(key.usages)).toEqual(new Set(["encrypt", "decrypt"]))
      }
      /* eslint-enable no-await-in-loop */
    })

    it("doesn't throw when encrypting a vault with a password", async () => {
      const vault = { a: 1 }
      const password = "this-is-a-poor-password"
      await encryptVault({
        version: vaultVersion,
        vault,
        passwordOrSaltedKey: password,
      })
    })

    it("avoids couple common footguns when encrypting a vault with a password", async () => {
      const vault = { thisIsAnInterestingKey: "sentinel" }
      const password = "this-is-a-poor-password"
      const newVault = await encryptVault({
        version: vaultVersion,
        vault,
        passwordOrSaltedKey: password,
      })
      // ensure sensitive plaintext isn't in the output, with a couple simple
      // transformations. Note this *doesn't* show correctness of encryption — a
      // simple substitution cipher would still pass this — it's just a smoke test.
      const importantPlaintext = [
        "thisIsAnInterestingKey",
        "sentinel",
        password,
      ]
      const serializedVault = JSON.stringify(newVault)
      importantPlaintext.forEach((t) => {
        expect(serializedVault).not.toContain(t)
        expect(serializedVault).not.toContain(t.toLowerCase())
        expect(serializedVault).not.toContain(Buffer.from(t).toString("base64"))
      })
    })

    it("can decrypt a vault encrypted with a password", async () => {
      const vault = { a: 1 }
      const password = "this-is-a-poor-password"
      const encryptedVault = await encryptVault({
        version: vaultVersion,
        vault,
        passwordOrSaltedKey: password,
      })

      const newVault = await decryptVault({
        version: vaultVersion,
        vault: encryptedVault,
        passwordOrSaltedKey: password,
      })

      expect(newVault).toEqual(vault)
    })

    it("can decrypt a complex vault encrypted with a password", async () => {
      const vault = {
        a: { b: [1, 2, 3] },
        c: null,
        d: 123,
      }
      const password = "this-is-a-poor-password"
      const encryptedVault = await encryptVault({
        version: vaultVersion,
        vault,
        passwordOrSaltedKey: password,
      })

      const newVault = await decryptVault({
        version: vaultVersion,
        vault: encryptedVault,
        passwordOrSaltedKey: password,
      })

      expect(newVault).toEqual(vault)
    })

    it("can decrypt a complex vault encrypted with a password", async () => {
      const vault = {
        a: { b: [1, 2, 3] },
        c: null,
        d: 123,
      }
      const password = Buffer.from(
        global.crypto.getRandomValues(new Uint8Array(16)),
      ).toString("base64")

      const saltedKey = await deriveSymmetricKeyFromPassword(
        vaultVersion,
        password,
      )

      const encryptedVault = await encryptVault({
        version: vaultVersion,
        vault,
        passwordOrSaltedKey: saltedKey,
      })

      const newVault = await decryptVault({
        version: vaultVersion,
        vault: encryptedVault,
        passwordOrSaltedKey: saltedKey,
      })

      expect(newVault).toEqual(vault)
    })
  },
)
