import browser from "webextension-polyfill"

import InternalSignerService, {
  Keyring,
  SignerImportSource,
  SignerSourceTypes,
  SignerInternalTypes,
} from ".."
import { ETHEREUM } from "../../../constants"
import logger from "../../../lib/logger"
import {
  mockLocalStorage,
  mockLocalStorageWithCalls,
} from "../../../tests/utils"
import {
  createTransactionRequest,
  createPreferenceService,
} from "../../../tests/factories"

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

const validPrivateKey = [
  "252da775ac59bf1e3a3c2b3b2633e29f8b8236dc3054b7ce9d019c79166ccf14",
]

const testPassword = "my password"

// Default value that is clearly not correct for testing inspection.
const dateNowValue = 1000000000000

const startInternalSignerService = async () => {
  const preferencesService = createPreferenceService()
  const service = await InternalSignerService.create(preferencesService)

  await service.startService()

  return service
}

function expectBase64String(
  {
    minLength: min,
    maxLength: max,
  }: { minLength: number; maxLength?: number } = { minLength: 1 },
) {
  return expect.stringMatching(
    new RegExp(`^[0-9a-zA-Z=+/]{${min},${max ?? ""}}`),
  )
}

const mockAlarms = () => {
  browser.alarms.create = jest.fn(() => ({}))
  browser.alarms.onAlarm.addListener = jest.fn(() => ({}))
}

describe("InternalSignerService when uninitialized", () => {
  let service: InternalSignerService

  beforeEach(async () => {
    mockLocalStorage()
    mockAlarms()

    service = await startInternalSignerService()
  })

  describe("and locked", () => {
    it("won't import or create accounts", async () => {
      await expect(
        service.importSigner({
          type: SignerSourceTypes.keyring,
          mnemonic: validMnemonics.metamask[0],
          source: SignerImportSource.import,
        }),
      ).rejects.toThrow("InternalSignerService must be unlocked.")

      await Promise.all(
        Object.keys(SignerInternalTypes).map(async (signerType) =>
          expect(
            service.generateNewKeyring(signerType as SignerInternalTypes),
          ).rejects.toThrow("InternalSignerService must be unlocked."),
        ),
      )

      await expect(
        service.importSigner({
          type: SignerSourceTypes.privateKey,
          privateKey: validPrivateKey[0],
        }),
      ).rejects.toThrow("InternalSignerService must be unlocked.")
    })

    it("won't sign transactions", async () => {
      await expect(
        service.signTransaction(
          { address: "0x0", network: ETHEREUM },
          createTransactionRequest({ from: "0x0" }),
        ),
      ).rejects.toThrow("InternalSignerService must be unlocked.")
    })
  })

  describe("and unlocked", () => {
    beforeEach(async () => {
      await service.unlock(testPassword)
    })

    it.each(validMnemonics.metamask)(
      "will import mnemonic '%s'",
      async (mnemonic) =>
        expect(
          service.importSigner({
            type: SignerSourceTypes.keyring,
            mnemonic,
            source: SignerImportSource.import,
          }),
        ).resolves,
    )

    it("will create multiple distinct BIP-39 S256 accounts and expose mnemonics", async () => {
      const keyringOne = service.generateNewKeyring(
        SignerInternalTypes.mnemonicBIP39S256,
      )
      await expect(keyringOne).resolves.toMatchObject({
        id: expect.stringMatching(/.+/),
      })

      const keyringTwo = service.generateNewKeyring(
        SignerInternalTypes.mnemonicBIP39S256,
      )
      await expect(keyringTwo).resolves.toMatchObject({
        id: expect.stringMatching(/.+/),
      })

      const { id: idOne, mnemonic: mnemonicOne } = await keyringOne
      const { id: idTwo, mnemonic: mnemonicTwo } = await keyringTwo

      expect(idOne).not.toEqual(idTwo)
      expect(mnemonicOne).not.toEqual(mnemonicTwo)
      expect(mnemonicOne.length).toEqual(24)
      expect(mnemonicTwo.length).toEqual(24)
    })
  })
})

describe("InternalSignerService when initialized", () => {
  let service: InternalSignerService
  let address: string

  beforeEach(async () => {
    mockAlarms()
    mockLocalStorage()

    service = await startInternalSignerService()
    await service.unlock(testPassword)
    service.emitter.on("address", (emittedAddress) => {
      address = emittedAddress
    })
    const { mnemonic } = await service.generateNewKeyring(
      SignerInternalTypes.mnemonicBIP39S256,
    )
    await service.importSigner({
      type: SignerSourceTypes.keyring,

      mnemonic: mnemonic.join(" "),
      source: SignerImportSource.import,
    })
  })

  it("will return keyring IDs and addresses", async () => {
    const keyrings = service.getKeyrings()
    expect(keyrings).toHaveLength(1)
    expect(keyrings[0]).toMatchObject({
      id: expect.anything(),
      addresses: expect.arrayContaining([
        expect.stringMatching(new RegExp(address, "i")),
      ]),
    })
  })

  it("will derive a new address", async () => {
    const [
      {
        id,
        addresses: [originalAddress],
      },
    ] = service.getKeyrings()

    const newAddress = id
      ? await service.deriveAddress({ type: "keyring", keyringID: id })
      : ""
    expect(newAddress).toEqual(
      expect.not.stringMatching(new RegExp(originalAddress, "i")),
    )

    const keyrings = service.getKeyrings()
    expect(keyrings).toHaveLength(1)
    expect(keyrings[0]).toMatchObject({
      id: expect.anything(),
      addresses: expect.arrayContaining([
        expect.stringMatching(new RegExp(originalAddress, "i")),
        expect.stringMatching(new RegExp(newAddress, "i")),
      ]),
    })
  })

  it("does not overwrite data if unlocked with the wrong password", async () => {
    const transactionWithFrom = createTransactionRequest({ from: address })

    await service.lock()

    const badUnlockResult = await service.unlock("booyan")
    expect(badUnlockResult).toEqual(false)

    const goodUnlockResult = await service.unlock(testPassword)
    expect(goodUnlockResult).toEqual(true)

    await expect(
      service.signTransaction(
        { address, network: ETHEREUM },
        transactionWithFrom,
      ),
    ).resolves.toBeDefined()
  })

  it("successfully unlocks already unlocked wallet", async () => {
    jest.spyOn(logger, "warn").mockImplementation((arg) => {
      // We should log if we try to unlock an unlocked keyring
      expect(arg).toEqual("InternalSignerService is already unlocked!")
    })
    expect(service.locked()).toEqual(false)
    expect(await service.unlock(testPassword)).toEqual(true)
  })
})

describe("InternalSignerService when saving keyrings", () => {
  let localStorageCalls: Record<string, unknown>[] = []

  beforeEach(() => {
    mockAlarms()

    const localStorageMock = mockLocalStorageWithCalls()
    localStorageCalls = localStorageMock.localStorageCalls

    jest.spyOn(Date, "now").mockReturnValue(dateNowValue)
  })

  it("saves data encrypted", async () => {
    const service = await startInternalSignerService()
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

    const { mnemonic } = await service.generateNewKeyring(
      SignerInternalTypes.mnemonicBIP39S256,
    )
    await service.importSigner({
      type: SignerSourceTypes.keyring,

      mnemonic: mnemonic.join(" "),
      source: SignerImportSource.import,
    })

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
    browser.storage.local.set({
      tallyVaults: {
        version: 1,
        vaults: [
          {
            timeSaved: 1635201991098,
            vault: {
              salt: "cf1U5D4p8XdhVHAr3SaLE5pz8IdsOkWu9+bWgwlPySQRZThr5dsfD1QNmFroGnGn2Fh102ovm41vfFFb5Y/80A==",
              initializationVector: "M4PB1noDXQFoF8Lp4BwevQ==",
              cipherText:
                "krZ97jlfucMCq7u3TEy0skshtAC9z3cK8V0bZiQz6Nuk75RO//FBmNW3dQ9CzaMxpoQ4MUchA4e2xz9YjpCFmOWZqUJ9ESjGM348KIBW+VRB8YKTIWlvqB/nGsfd1UTUqtyElrUKvryO5o3AzNAVG8onRNR7ngXXB7K8PXXrtQGikoHmhrv+lu+WzVVE+tM/jvi71rQkSEveOX8u1MA5A/Gyow/7tOWCL6WY5a2tFdYffIwAPgtI1R+XVw5HmreBNiD4t46U7qALihcHVqcX9D/yJx8dP9XrKylyiF5u89qm0tKomZYJhpzE6yWPOjMHFyOwvTbJxxbhiXAKIdF2BsA6UCc/L1gbk8aVhyjVnOjyCNPjWcKPPDRD+Cfy9I6L+lTvWghHKrv2WykPtTne/XjxkgYCt2wkqgjm9Tl3dpFtigz8pBmkg+KkuEna",
            },
          },
        ],
      },
    })

    const storedKeyrings: Keyring[] = []

    const service = await startInternalSignerService()
    service.emitter.on("internalSigners", (signers) => {
      storedKeyrings.push(...signers.keyrings)
      return Promise.resolve()
    })
    await service.unlock(testPassword)

    await expect(
      // Wait for the emitter to emit the keyrings event.
      new Promise((resolve) => {
        resolve(storedKeyrings)
      }),
    ).resolves.toHaveLength(1)

    expect(storedKeyrings[0]).toMatchObject({
      type: SignerInternalTypes.mnemonicBIP39S256,
      id: "0x77555a3b",
      addresses: ["0x3c10745391dfae50df6dc0ee17281f34bbda2fbf"],
    })
  })
})

describe("InternalSignerService when autolocking", () => {
  let service: InternalSignerService
  let address: string
  let callAutolockHandler: (timeSinceInitialMock: number) => void

  beforeEach(async () => {
    mockLocalStorage()
    browser.alarms.create = jest.fn(() => ({}))

    browser.alarms.onAlarm.addListener = jest.fn((handler) => {
      callAutolockHandler = (timeSinceInitialMock) => {
        jest
          .spyOn(Date, "now")
          .mockReturnValue(dateNowValue + timeSinceInitialMock)

        handler({
          name: "autolock",
          scheduledTime: dateNowValue + timeSinceInitialMock,
        })
      }
    })

    jest.spyOn(Date, "now").mockReturnValue(dateNowValue)

    service = await startInternalSignerService()
    await service.unlock(testPassword)
    service.emitter.on("address", (emittedAddress) => {
      address = emittedAddress
    })
    const { mnemonic } = await service.generateNewKeyring(
      SignerInternalTypes.mnemonicBIP39S256,
    )
    await service.importSigner({
      type: SignerSourceTypes.keyring,

      mnemonic: mnemonic.join(" "),
      source: SignerImportSource.import,
    })
  })

  it("will autolock after the keyring idle time but not sooner", async () => {
    // oxlint-disable-next-line typescript/dot-notation
    const maxIdleTime = await service["preferenceService"].getAutoLockInterval()

    expect(service.locked()).toEqual(false)

    callAutolockHandler(maxIdleTime - 10)
    expect(service.locked()).toEqual(false)

    callAutolockHandler(maxIdleTime)
    expect(service.locked()).toEqual(true)
  })

  it("will autolock after the outside activity idle time but not sooner", async () => {
    // oxlint-disable-next-line typescript/dot-notation
    const maxIdleTime = await service["preferenceService"].getAutoLockInterval()

    expect(service.locked()).toEqual(false)

    callAutolockHandler(maxIdleTime - 10)
    expect(service.locked()).toEqual(false)

    callAutolockHandler(maxIdleTime)
    expect(service.locked()).toEqual(true)
  })

  it.each([
    {
      action: "signing a transaction",
      call: async () => {
        const transactionWithFrom = createTransactionRequest({ from: address })

        await service.signTransaction(
          { address, network: ETHEREUM },
          transactionWithFrom,
        )
      },
    },
    {
      action: "importing a keyring",
      call: async () => {
        await service.importSigner({
          type: SignerSourceTypes.keyring,
          mnemonic: validMnemonics.metamask[0],
          source: SignerImportSource.import,
        })
      },
    },
    {
      action: "generating a keyring",
      call: async () => {
        await service.generateNewKeyring(SignerInternalTypes.mnemonicBIP39S256)
      },
    },
  ])("will bump keyring activity idle time when $action", async ({ call }) => {
    // oxlint-disable-next-line typescript/dot-notation
    const maxIdleTime = await service["preferenceService"].getAutoLockInterval()

    jest.spyOn(Date, "now").mockReturnValue(dateNowValue + maxIdleTime - 1)

    await call()

    // Bump the outside activity timer to make sure the service doesn't
    // autolock due to outside idleness.
    jest.spyOn(Date, "now").mockReturnValue(dateNowValue + maxIdleTime - 1)
    service.markOutsideActivity()

    callAutolockHandler(maxIdleTime)
    expect(service.locked()).toEqual(false)

    callAutolockHandler(2 * maxIdleTime - 10)
    expect(service.locked()).toEqual(false)

    callAutolockHandler(2 * maxIdleTime)
    expect(service.locked()).toEqual(true)
  })

  it("will bump the outside activity idle time when outside activity is marked", async () => {
    // oxlint-disable-next-line typescript/dot-notation
    const maxIdleTime = await service["preferenceService"].getAutoLockInterval()

    jest.spyOn(Date, "now").mockReturnValue(dateNowValue + maxIdleTime - 1)

    service.markOutsideActivity()

    // Bump the keyring activity timer to make sure the service doesn't
    // autolock due to keyring idleness.
    jest.spyOn(Date, "now").mockReturnValue(dateNowValue + maxIdleTime - 1)
    await service.generateNewKeyring(SignerInternalTypes.mnemonicBIP39S256)

    callAutolockHandler(maxIdleTime)
    expect(service.locked()).toEqual(false)

    callAutolockHandler(2 * maxIdleTime - 10)
    expect(service.locked()).toEqual(false)

    callAutolockHandler(2 * maxIdleTime)
    expect(service.locked()).toEqual(true)
  })

  it("locks when auto-lock timer has been updated to be less than current idle time", async () => {
    // oxlint-disable-next-line typescript/dot-notation, prefer-destructuring
    const preferenceService = service["preferenceService"]

    const maxIdleTime = await preferenceService.getAutoLockInterval()

    await service.generateNewKeyring(SignerInternalTypes.mnemonicBIP39S256)

    expect(service.locked()).toBe(false)

    callAutolockHandler(maxIdleTime / 2)

    await preferenceService.updateAutoLockInterval(maxIdleTime / 2)

    await service.updateAutoLockInterval()

    expect(service.locked()).toEqual(true)
  })
})
