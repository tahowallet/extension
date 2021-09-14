import { browser } from "webextension-polyfill-ts"

import { UNIXTime } from "../../types"

type SerializedEncryptedVaults = {
  version: 1
  vaults: [UNIXTime, string][]
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
  if (!currentLatest || currentLatest[1] !== encryptedVault) {
    await browser.storage.local.set({
      tallyVaults: {
        ...serializedVaults,
        vaults: [
          ...serializedVaults.vaults,
          [new Date().getTime(), encryptedVault],
        ],
      },
    })
  }
}
