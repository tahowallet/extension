import "mockzilla-webextension"

import { webcrypto } from "crypto"
import { Browser } from "webextension-polyfill"
import { MockzillaDeep } from "mockzilla"
import KeyringService, {
  Keyring,
  MAX_KEYRING_IDLE_TIME,
  MAX_OUTSIDE_IDLE_TIME,
} from "../services/keyring"
import { KeyringTypes } from "../types"
import { EIP1559TransactionRequest } from "../networks"
import { ETH, ETHEREUM } from "../constants"
import logger from "../lib/logger"

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

const validTransactionRequests: {
  [key: string]: EIP1559TransactionRequest & { nonce: number }
} = {
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
    network: {
      name: "none",
      chainID: "0",
      baseAsset: ETH,
      family: "EVM",
      coingeckoPlatformID: "ethereum",
    },
  },
}

const testPassword = "my password"

// Default value that is clearly not correct for testing inspection.
const dateNowValue = 1000000000000

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

const mockAlarms = (mock: MockzillaDeep<Browser>) => {
  mock.alarms.create.mock(() => ({}))
  mock.alarms.onAlarm.addListener.mock(() => ({}))
}

describe("KeyringService when uninitialized", () => {
  let service: KeyringService

  beforeEach(async () => {
    mockBrowser.storage.local.get.mock(() => Promise.resolve({}))
    mockBrowser.storage.local.set.mock(() => Promise.resolve())
    mockAlarms(mockBrowser)

    service = await startKeyringService()
  })

  describe("and locked", () => {
    it("won't import or create accounts", async () => {
      await expect(
        service.importKeyring(validMnemonics.metamask[0], "import")
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
        service.signTransaction(
          { address: "0x0", network: ETHEREUM },
          validTransactionRequests.simple
        )
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
        return expect(service.importKeyring(mnemonic, "import")).resolves
      }
    )

    it("will create multiple distinct BIP-39 S256 accounts and expose mnemonics", async () => {
      const keyringOne = service.generateNewKeyring(
        KeyringTypes.mnemonicBIP39S256
      )
      await expect(keyringOne).resolves.toMatchObject({
        id: expect.stringMatching(/.+/),
      })

      const keyringTwo = service.generateNewKeyring(
        KeyringTypes.mnemonicBIP39S256
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

describe("KeyringService when initialized", () => {
  let service: KeyringService
  let address: string

  beforeEach(async () => {
    mockAlarms(mockBrowser)

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
    const { mnemonic } = await service.generateNewKeyring(
      KeyringTypes.mnemonicBIP39S256
    )
    await service.importKeyring(mnemonic.join(" "), "import")
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
      expect.not.stringMatching(new RegExp(originalAddress, "i"))
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

  it("will sign a transaction", async () => {
    const transactionWithFrom = {
      ...validTransactionRequests.simple,
      from: address,
    }

    await expect(
      service.signTransaction(
        { address, network: ETHEREUM },
        transactionWithFrom
      )
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
      service.signTransaction(
        { address, network: ETHEREUM },
        transactionWithFrom
      )
    ).resolves.toBeDefined()
  })

  it("successfully unlocks already unlocked wallet", async () => {
    jest.spyOn(logger, "warn").mockImplementation((arg) => {
      // We should log if we try to unlock an unlocked keyring
      expect(arg).toEqual("KeyringService is already unlocked!")
    })
    expect(service.locked()).toEqual(false)
    expect(await service.unlock(testPassword)).toEqual(true)
  })
})

describe("KeyringService when saving keyrings", () => {
  let localStorage: Record<string, Record<string, unknown>> = {}
  let localStorageCalls: Record<string, unknown>[] = []

  beforeEach(() => {
    mockAlarms(mockBrowser)

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

    const { mnemonic } = await service.generateNewKeyring(
      KeyringTypes.mnemonicBIP39S256
    )
    await service.importKeyring(mnemonic.join(" "), "import")

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
              salt: "cf1U5D4p8XdhVHAr3SaLE5pz8IdsOkWu9+bWgwlPySQRZThr5dsfD1QNmFroGnGn2Fh102ovm41vfFFb5Y/80A==",
              initializationVector: "M4PB1noDXQFoF8Lp4BwevQ==",
              cipherText:
                "krZ97jlfucMCq7u3TEy0skshtAC9z3cK8V0bZiQz6Nuk75RO//FBmNW3dQ9CzaMxpoQ4MUchA4e2xz9YjpCFmOWZqUJ9ESjGM348KIBW+VRB8YKTIWlvqB/nGsfd1UTUqtyElrUKvryO5o3AzNAVG8onRNR7ngXXB7K8PXXrtQGikoHmhrv+lu+WzVVE+tM/jvi71rQkSEveOX8u1MA5A/Gyow/7tOWCL6WY5a2tFdYffIwAPgtI1R+XVw5HmreBNiD4t46U7qALihcHVqcX9D/yJx8dP9XrKylyiF5u89qm0tKomZYJhpzE6yWPOjMHFyOwvTbJxxbhiXAKIdF2BsA6UCc/L1gbk8aVhyjVnOjyCNPjWcKPPDRD+Cfy9I6L+lTvWghHKrv2WykPtTne/XjxkgYCt2wkqgjm9Tl3dpFtigz8pBmkg+KkuEna",
            },
          },
        ],
      },
    }

    const storedKeyrings: Keyring[] = []

    const service = await startKeyringService()
    service.emitter.on("keyrings", (keyringEvent) => {
      storedKeyrings.push(...keyringEvent.keyrings)
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
      id: "0x77555a3b",
      addresses: ["0x3c10745391dfae50df6dc0ee17281f34bbda2fbf"],
    })
  })
})

describe("Keyring service when autolocking", () => {
  let service: KeyringService
  let address: string
  let callAutolockHandler: (timeSinceInitialMock: number) => void

  beforeEach(async () => {
    mockBrowser.storage.local.get.mock(() => Promise.resolve({}))
    mockBrowser.storage.local.set.mock(() => Promise.resolve())
    mockBrowser.alarms.create.mock(() => ({}))

    mockBrowser.alarms.onAlarm.addListener.mock((handler) => {
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

    service = await startKeyringService()
    await service.unlock(testPassword)
    service.emitter.on("address", (emittedAddress) => {
      address = emittedAddress
    })
    const { mnemonic } = await service.generateNewKeyring(
      KeyringTypes.mnemonicBIP39S256
    )
    await service.importKeyring(mnemonic.join(" "), "import")
  })

  it("will autolock after the keyring idle time but not sooner", async () => {
    expect(service.locked()).toEqual(false)

    callAutolockHandler(MAX_KEYRING_IDLE_TIME - 10)
    expect(service.locked()).toEqual(false)

    callAutolockHandler(MAX_KEYRING_IDLE_TIME)
    expect(service.locked()).toEqual(true)
  })

  it("will autolock after the outside activity idle time but not sooner", async () => {
    expect(service.locked()).toEqual(false)

    callAutolockHandler(MAX_OUTSIDE_IDLE_TIME - 10)
    expect(service.locked()).toEqual(false)

    callAutolockHandler(MAX_OUTSIDE_IDLE_TIME)
    expect(service.locked()).toEqual(true)
  })

  it.each([
    {
      action: "signing a transaction",
      call: async () => {
        const transactionWithFrom = {
          ...validTransactionRequests.simple,
          from: address,
        }

        await service.signTransaction(
          { address, network: ETHEREUM },
          transactionWithFrom
        )
      },
    },
    {
      action: "importing a keyring",
      call: async () => {
        await service.importKeyring(validMnemonics.metamask[0], "import")
      },
    },
    {
      action: "generating a keyring",
      call: async () => {
        await service.generateNewKeyring(KeyringTypes.mnemonicBIP39S256)
      },
    },
  ])("will bump keyring activity idle time when $action", async ({ call }) => {
    jest
      .spyOn(Date, "now")
      .mockReturnValue(dateNowValue + MAX_KEYRING_IDLE_TIME - 1)

    await call()

    // Bump the outside activity timer to make sure the service doesn't
    // autolock due to outside idleness.
    jest
      .spyOn(Date, "now")
      .mockReturnValue(dateNowValue + MAX_OUTSIDE_IDLE_TIME - 1)
    service.markOutsideActivity()

    callAutolockHandler(MAX_KEYRING_IDLE_TIME)
    expect(service.locked()).toEqual(false)

    callAutolockHandler(2 * MAX_KEYRING_IDLE_TIME - 10)
    expect(service.locked()).toEqual(false)

    callAutolockHandler(2 * MAX_KEYRING_IDLE_TIME)
    expect(service.locked()).toEqual(true)
  })

  it("will bump the outside activity idle time when outside activity is marked", async () => {
    jest
      .spyOn(Date, "now")
      .mockReturnValue(dateNowValue + MAX_OUTSIDE_IDLE_TIME - 1)

    service.markOutsideActivity()

    // Bump the keyring activity timer to make sure the service doesn't
    // autolock due to keyring idleness.
    jest
      .spyOn(Date, "now")
      .mockReturnValue(dateNowValue + MAX_KEYRING_IDLE_TIME - 1)
    await service.generateNewKeyring(KeyringTypes.mnemonicBIP39S256)

    callAutolockHandler(MAX_OUTSIDE_IDLE_TIME)
    expect(service.locked()).toEqual(false)

    callAutolockHandler(2 * MAX_OUTSIDE_IDLE_TIME - 10)
    expect(service.locked()).toEqual(false)

    callAutolockHandler(2 * MAX_OUTSIDE_IDLE_TIME)
    expect(service.locked()).toEqual(true)
  })
})
