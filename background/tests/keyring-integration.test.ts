import "mockzilla-webextension"

import { webcrypto } from "crypto"
import KeyringService from "../services/keyring"
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

describe("KeyringService when uninitialized", () => {
  let service: KeyringService

  beforeEach(async () => {
    mockBrowser.storage.local.get.mock(() => Promise.resolve({}))
    mockBrowser.storage.local.set.mock(() => Promise.resolve())

    service = await startKeyringService()
  })

  describe("and locked", () => {
    test("won't import or create accounts", async () => {
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

    test("won't sign transactions", async () => {
      await expect(
        service.signTransaction("0x0", validTransactionRequests.simple)
      ).rejects.toThrow("KeyringService must be unlocked.")
    })
  })

  describe("and unlocked", () => {
    beforeEach(async () => {
      await service.unlock(testPassword)
    })

    test.each(validMnemonics.metamask)(
      "will import mnemonic '%s'",
      async (mnemonic) => {
        return expect(service.importLegacyKeyring(mnemonic)).resolves
      }
    )

    test("will create distinct BIP-39 S256 accounts", async () => {
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

  test("will sign a transaction", async () => {
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

  test("does not overwrite data if unlocked with the wrong password", async () => {
    await service.lock()

    const unlockResult = await service.unlock("booyan")
    expect(unlockResult).toEqual(false)

    const goodUnlockResult = await service.unlock(testPassword)
    expect(goodUnlockResult).toEqual(true)

    const transactionWithFrom = {
      ...validTransactionRequests.simple,
      from: address,
    }

    await expect(
      service.signTransaction(address, transactionWithFrom)
    ).resolves.toBeDefined()
  })
})

test("doesn't overwrite data if unlock() is called with the wrong password", async () => {})

test("can generate a keyring (24 word)", async () => {})

test("can import a legacy mnemonic (12 word)", async () => {})

test("save keyrings encrypted to browser extension storage. I suspect this will require mocking or something like Puppeteer to get this running in a real browser", async () => {})
