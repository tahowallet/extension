import "mockzilla-webextension"

import { webcrypto } from "crypto"
import KeyringService, { Keyring } from "../services/keyring"
import { EIP1559TransactionRequest, KeyringTypes } from "../types"

const originalCrypto = global.crypto
beforeEach(() => {
  // polyfill the WebCrypto API
  global.crypto = webcrypto as unknown as Crypto
})

afterEach(() => {
  global.crypto = originalCrypto
})

const validMnemonics = {
  metamask: [
    "input pulp truth gain expire kick castle voyage firm fee degree draft",
    "thumb major whip ensure spend brief pattern jelly stock echo tone session",
    "cancel canyon twenty pretty stool arrange brief speak agent earth thumb robust",
  ],
  other: [
    "square time hurdle gospel crash uncle flash tomorrow city space shine sad fence ski harsh salt need edit name fold corn chuckle resource else",
    "until issue must",
    "glass skin grass cat photo essay march detail remain",
    "dream dinosaur poem cherry brief hand injury ice stuff steel bench vacant amazing bar uncover",
    "mad such absent minor vapor edge tornado wrestle convince shy battle region adapt order finish foot follow monitor",
  ],
}

const validTransactionRequests: { [key: string]: EIP1559TransactionRequest } = {
  simple: {
    from: "0x0",
    nonce: 0,
    type: 2,
    input: "0x",
    value: 0n,
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n,
    gasLimit: 0n,
    chainID: "0",
  },
}

const testPassword = "my password"

const startKeyringService = async () => {
  const service = await KeyringService.create()
  await service.startService()

  return service
}

function expectBase64String(
  {
    minLength: min,
    maxLength: max,
  }: { minLength: number; maxLength?: number } = { minLength: 1 }
) {
  return expect.stringMatching(
    new RegExp(`^[0-9a-zA-Z=+/]{${min},${max ?? ""}}`)
  )
}

describe("KeyringService when uninitialized", () => {
  let service: KeyringService

  beforeEach(async () => {
    mockBrowser.storage.local.get.mock(() => Promise.resolve({}))
    mockBrowser.storage.local.set.mock(() => Promise.resolve())

    service = await startKeyringService()
  })

  describe("and locked", () => {
    it("won't import or create accounts", async () => {
      await expect(
        service.importLegacyKeyring(validMnemonics.metamask[0])
      ).rejects.toThrow("KeyringService must be unlocked.")

      await Promise.all(
        Object.keys(KeyringTypes).map(async (keyringType) =>
          expect(
            service.generateNewKeyring(keyringType as KeyringTypes)
          ).rejects.toThrow("KeyringService must be unlocked.")
        )
      )
    })

    it("won't sign transactions", async () => {
      await expect(
        service.signTransaction("0x0", validTransactionRequests.simple)
      ).rejects.toThrow("KeyringService must be unlocked.")
    })
  })

  describe("and unlocked", () => {
    beforeEach(async () => {
      await service.unlock(testPassword)
    })

    it.each(validMnemonics.metamask)(
      "will import mnemonic '%s'",
      async (mnemonic) => {
        return expect(service.importLegacyKeyring(mnemonic)).resolves
      }
    )

    it("will create multiple distinct BIP-39 S256 accounts", async () => {
      const idOne = service.generateNewKeyring(KeyringTypes.mnemonicBIP39S256)
      await expect(idOne).resolves.toMatch(/.+/)

      const idTwo = service.generateNewKeyring(KeyringTypes.mnemonicBIP39S256)
      await expect(idTwo).resolves.toMatch(/.+/)

      expect(await idOne).not.toEqual(await idTwo)
    })
  })
})

describe("KeyringService when initialized", () => {
  let service: KeyringService
  let address: string

  beforeEach(async () => {
    let localStorage: Record<string, Record<string, unknown>> = {}

    mockBrowser.storage.local.get.mock((key) => {
      if (typeof key === "string" && key in localStorage) {
        return Promise.resolve({ [key]: localStorage[key] } || {})
      }
      return Promise.resolve({})
    })
    mockBrowser.storage.local.set.mock((values) => {
      localStorage = {
        ...localStorage,
        ...values,
      }
      return Promise.resolve()
    })

    service = await startKeyringService()
    await service.unlock(testPassword)
    service.emitter.on("address", (emittedAddress) => {
      address = emittedAddress
    })
    await service.generateNewKeyring(KeyringTypes.mnemonicBIP39S256)
  })

  it("will sign a transaction", async () => {
    const transactionWithFrom = {
      ...validTransactionRequests.simple,
      from: address,
    }

    await expect(
      service.signTransaction(address, transactionWithFrom)
    ).resolves.toMatchObject({
      from: expect.stringMatching(new RegExp(address, "i")), // case insensitive match
      r: expect.anything(),
      s: expect.anything(),
      v: expect.anything(),
    })
    // TODO assert correct recovered address
  })

  it("does not overwrite data if unlocked with the wrong password", async () => {
    const transactionWithFrom = {
      ...validTransactionRequests.simple,
      from: address,
    }

    await service.lock()

    const badUnlockResult = await service.unlock("booyan")
    expect(badUnlockResult).toEqual(false)

    const goodUnlockResult = await service.unlock(testPassword)
    expect(goodUnlockResult).toEqual(true)

    await expect(
      service.signTransaction(address, transactionWithFrom)
    ).resolves.toBeDefined()
  })
})

describe("KeyringService when saving keyrings", () => {
  let localStorage: Record<string, Record<string, unknown>> = {}
  let localStorageCalls: Record<string, unknown>[] = []

  const dateNowValue = Date.now()

  beforeEach(() => {
    localStorage = {}
    localStorageCalls = []

    mockBrowser.storage.local.get.mock((key) => {
      if (typeof key === "string" && key in localStorage) {
        return Promise.resolve({ [key]: localStorage[key] } || {})
      }
      return Promise.resolve({})
    })
    mockBrowser.storage.local.set.mock((values) => {
      localStorage = {
        ...localStorage,
        ...values,
      }
      localStorageCalls.unshift(values)

      return Promise.resolve()
    })

    jest.spyOn(Date, "now").mockReturnValue(dateNowValue)
  })

  it("saves data encrypted", async () => {
    const service = await startKeyringService()
    await service.unlock(testPassword)

    expect(localStorageCalls.shift()).toMatchObject({
      tallyVaults: expect.objectContaining({
        vaults: [
          expect.objectContaining({
            timeSaved: dateNowValue,
            vault: expect.objectContaining({
              salt: expectBase64String(),
              initializationVector: expectBase64String(),
              cipherText: expectBase64String({ minLength: 24, maxLength: 24 }),
            }),
          }),
        ],
      }),
    })

    await service.generateNewKeyring(KeyringTypes.mnemonicBIP39S256)

    expect(localStorageCalls.shift()).toMatchObject({
      tallyVaults: expect.objectContaining({
        vaults: [
          expect.objectContaining({
            timeSaved: dateNowValue,
            vault: expect.objectContaining({
              salt: expectBase64String(),
              initializationVector: expectBase64String(),
              cipherText: expectBase64String({ minLength: 24, maxLength: 24 }),
            }),
          }),
          expect.objectContaining({
            timeSaved: dateNowValue,
            vault: expect.objectContaining({
              salt: expectBase64String(),
              initializationVector: expectBase64String(),
              cipherText: expectBase64String({ minLength: 25 }),
            }),
          }),
        ],
      }),
    })
  })

  it("loads encrypted data at instantiation time", async () => {
    localStorage = {
      tallyVaults: {
        version: 1,
        vaults: [
          {
            timeSaved: 1635201991098,
            vault: {
              salt: "XeQ9825jVp7rCq6f2vRySunT/G7Q4rbCcrWxKc/o6KiRCx27eyrQYHciGz4YB3wYCh6Po1liuffN7GIYqkxWJw==",
              initializationVector: "K5/+ECJ2ei6Fy+x10TutgQ==",
              cipherText:
                "9tmTazKJT4tai1HdhT4pVD/o97QJG4KspsCqIp2Gpk0CsWxEIQ4FFJ4ecOOmW6+Gpojgh77N0sQsCU8LL4S43zK/XS5LzTtLNlPq9CQ9IRDt0SZQN4tD7/0/rO5H4wDRCaHxj0g49O5/n87ezlHvijYB+gr0d64OE96TyDkTuZZgrZg4jB4DL3aEebhZp+zKidofi0GCHqqKClzw2nwq7teasRYV6h69KcYibpITB0+FN1QSqP4c9Oblio3VTjfIubC8uINXhnKO5b1Pj6md4N6wj3RyFQVober45vRfl/WAGQF4pHM2KyvWFytZ+tQJ+QgBhTPwrJjMMmabnCok6MWLUApLOdddDHYyUfrUZuxp2xvw/A==",
            },
          },
        ],
      },
    }

    const storedKeyrings: Keyring[] = []

    const service = await startKeyringService()
    service.emitter.on("keyrings", (keyrings) => {
      storedKeyrings.push(...keyrings)
      return Promise.resolve()
    })
    await service.unlock(testPassword)

    await expect(
      // Wait for the emitter to emit the keyrings event.
      new Promise((resolve) => {
        resolve(storedKeyrings)
      })
    ).resolves.toHaveLength(1)

    expect(storedKeyrings[0]).toMatchObject({
      type: KeyringTypes.mnemonicBIP39S256,
      id: "0x0f38729e",
      addresses: ["0xf34d8078c80d4be6ff928ff794ab65aa535ead4c"],
    })
  })
})
