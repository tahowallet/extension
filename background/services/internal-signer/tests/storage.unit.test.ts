import {
  EncryptedVault,
  VaultVersion,
  decryptVault,
  encryptVault,
} from "../encryption"
import {
  getEncryptedVaults,
  migrateVaultsToLatestVersion,
  writeLatestEncryptedVault,
} from "../storage"

const mockedPassword = "password"
const mockedVault = { text: "secret" }

describe("Storage utils", () => {
  let vaultEncryptedWithPBKDF2: EncryptedVault
  let vaultEncryptedWithArgon2: EncryptedVault

  beforeAll(async () => {
    vaultEncryptedWithPBKDF2 = await encryptVault({
      vault: mockedVault,
      passwordOrSaltedKey: mockedPassword,
      version: VaultVersion.PBKDF2,
    })

    vaultEncryptedWithArgon2 = await encryptVault({
      vault: mockedVault,
      passwordOrSaltedKey: mockedPassword,
      version: VaultVersion.Argon2,
    })
  })

  it("should be able to store and retrieve data encrypted with PBKDF2", async () => {
    await browser.storage.local.set({
      tallyVaults: {
        version: VaultVersion.PBKDF2,
        vaults: [],
      },
    })
    await writeLatestEncryptedVault(vaultEncryptedWithPBKDF2)

    const { vaults, version } = await getEncryptedVaults()

    expect(version).toEqual(VaultVersion.PBKDF2)
    expect(vaults.length).toEqual(1)
    expect(vaults[0].vault).toEqual(vaultEncryptedWithPBKDF2)
  })

  it("should be able to store and retrieve data encrypted with Argon2", async () => {
    await browser.storage.local.set({
      tallyVaults: {
        version: VaultVersion.Argon2,
        vaults: [],
      },
    })
    await writeLatestEncryptedVault(vaultEncryptedWithArgon2)

    const { vaults, version } = await getEncryptedVaults()

    expect(version).toEqual(VaultVersion.Argon2)
    expect(vaults.length).toEqual(1)
    expect(vaults[0].vault).toEqual(vaultEncryptedWithArgon2)
  })

  it("should migrate existing vaults to Argon2", async () => {
    await browser.storage.local.set({
      tallyVaults: {
        version: VaultVersion.PBKDF2,
        vaults: [],
      },
    })
    await writeLatestEncryptedVault(vaultEncryptedWithPBKDF2)

    const {
      encryptedData: { vaults, version },
      migrated,
    } = await migrateVaultsToLatestVersion(mockedPassword)

    expect(migrated).toEqual(true)
    expect(version).toEqual(VaultVersion.Argon2)
    expect(vaults.length).toEqual(1)

    const decryptedVault = await decryptVault({
      version: VaultVersion.Argon2,
      vault: vaults[0].vault,
      passwordOrSaltedKey: mockedPassword,
    })
    expect(decryptedVault).toEqual(mockedVault)
  })

  it("should not migrate vaults if they are already encrypted with Argon2", async () => {
    await browser.storage.local.set({
      tallyVaults: {
        version: VaultVersion.Argon2,
        vaults: [],
      },
    })
    await writeLatestEncryptedVault(vaultEncryptedWithArgon2)

    const {
      encryptedData: { vaults, version },
      ...migrationData
    } = await migrateVaultsToLatestVersion(mockedPassword)

    expect(migrationData.migrated).toEqual(false)
    expect(
      !migrationData.migrated && migrationData.errorMessage,
    ).toBeUndefined()
    expect(version).toEqual(VaultVersion.Argon2)
    expect(vaults[0].vault).toEqual(vaultEncryptedWithArgon2)
  })

  it("should report migration errors in the return value", async () => {
    await browser.storage.local.set({
      tallyVaults: {
        version: VaultVersion.PBKDF2,
        vaults: [],
      },
    })
    await writeLatestEncryptedVault(vaultEncryptedWithPBKDF2)

    const migrationData = await migrateVaultsToLatestVersion("wrong password")

    expect(migrationData.migrated).toEqual(false)
    expect(
      !migrationData.migrated && migrationData.errorMessage,
    ).not.toBeUndefined()
    expect(
      !migrationData.migrated &&
        migrationData.errorMessage !== undefined &&
        migrationData.errorMessage.length,
    ).toBeGreaterThan(1)
  })
})
