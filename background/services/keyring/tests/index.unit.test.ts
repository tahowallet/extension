import { webcrypto } from "crypto"
import KeyringService, { SignerTypes } from ".."
import { ETHEREUM } from "../../../constants"
import {
  createKeyringService,
  createTransactionRequest,
  createTypedData,
} from "../../../tests/factories"
import { mockLocalStorage } from "../../../tests/utils"
import { KeyringTypes } from "../../../types"

const originalCrypto = global.crypto
const HD_WALLET_MOCK = {
  mnemonic:
    "input pulp truth gain expire kick castle voyage firm fee degree draft",
  addresses: [
    "0x0cf98fd79eaf6d27679dc1a328621b5791bd874e",
    "0xbfab971fdadcfebb1086dadf3e68d6edee81a6cf",
  ],
}
const PK_WALLET_MOCK = {
  address: "0x0cf98fd79eaf6d27679dc1a328621b5791bd874e",
  privateKey:
    "0x252da775ac59bf1e3a3c2b3b2633e29f8b8236dc3054b7ce9d019c79166ccf14",
}

describe("Keyring Service", () => {
  let keyringService: KeyringService

  beforeEach(async () => {
    global.crypto = webcrypto as unknown as Crypto
    mockLocalStorage()

    keyringService = await createKeyringService()
    await keyringService.startService()
    await keyringService.unlock("test")
  })

  afterEach(async () => {
    await keyringService.stopService()
    global.crypto = originalCrypto
  })

  describe("generated HD wallet", () => {
    it("should generate new HD wallet", async () => {
      const keyring = await keyringService.generateNewKeyring(
        KeyringTypes.mnemonicBIP39S256
      )

      expect(keyring.id).toBeDefined()
      expect(keyring.mnemonic.length).toBe(24)

      await keyringService.importSigner({
        type: SignerTypes.keyring,
        mnemonic: keyring.mnemonic.join(" "),
        source: "internal",
      })

      const keyrings = keyringService.getKeyrings()
      expect(keyrings.length).toBe(1)
      expect(keyrings[0].id).toBe(keyring.id)
      expect(
        await keyringService.getSignerSourceForAddress(keyrings[0].addresses[0])
      ).toBe("internal")
    })
  })

  describe("imported HD wallet", () => {
    beforeEach(async () => {
      await keyringService.importSigner({
        type: SignerTypes.keyring,
        mnemonic: HD_WALLET_MOCK.mnemonic,
        source: "import",
      })
    })
    it("should add HD wallet to keyrings", () => {
      const keyrings = keyringService.getKeyrings()
      expect(keyrings.length).toBe(1)
    })
    it("should classify HD wallet as imported", async () => {
      expect(
        await keyringService.getSignerSourceForAddress(
          HD_WALLET_MOCK.addresses[0]
        )
      ).toBe("import")
    })
    it("should be able to derive next address", async () => {
      const [keyring] = keyringService.getKeyrings()
      const [addressMock1, addressMock2] = HD_WALLET_MOCK.addresses

      expect(keyring.addresses.length).toBe(1)

      await keyringService.deriveAddress({
        type: "keyring",
        keyringID: keyring.id ?? "",
      })

      const [updatedKeyring] = keyringService.getKeyrings()

      expect(updatedKeyring.addresses.length).toBe(2)

      const [address1, address2] = updatedKeyring.addresses
      expect(address1).toBe(addressMock1)
      expect(address2).toBe(addressMock2)
    })
    it("should be able to hide address from HD wallet", async () => {
      const [keyring] = keyringService.getKeyrings()

      const address = await keyringService.deriveAddress({
        type: "keyring",
        keyringID: keyring.id ?? "",
      })

      await keyringService.hideAccount(address)

      const [updatedKeyring] = keyringService.getKeyrings()

      expect(updatedKeyring.addresses.length).toBe(1)
    })
    it("should be able to remove HD wallet by hiding all addresses", async () => {
      await keyringService.hideAccount(HD_WALLET_MOCK.addresses[0])
      const keyrings = keyringService.getKeyrings()

      expect(keyrings.length).toBe(0)
    })
    it("should be able to remove HD wallet and add it again", async () => {
      await keyringService.hideAccount(HD_WALLET_MOCK.addresses[0])
      await keyringService.importSigner({
        type: SignerTypes.keyring,
        mnemonic: HD_WALLET_MOCK.mnemonic,
        source: "import",
      })
      const keyrings = keyringService.getKeyrings()

      expect(keyrings.length).toBe(1)
    })
    it("should be able to sign transaction", async () => {
      const address = HD_WALLET_MOCK.addresses[0]
      const signed = await keyringService.signTransaction(
        { address, network: ETHEREUM },
        createTransactionRequest({ from: address })
      )

      expect(signed).toMatchObject({
        from: expect.stringMatching(new RegExp(address, "i")),
        r: expect.anything(),
        s: expect.anything(),
        v: expect.anything(),
      })
    })
    it("should be able to sign typed data", async () => {
      const address = HD_WALLET_MOCK.addresses[0]
      const typedData = createTypedData()
      const signed = await keyringService.signTypedData({
        typedData,
        account: address,
      })

      expect(signed).toBeDefined()
    })
    it("should be able to make a personal sign", async () => {
      const address = HD_WALLET_MOCK.addresses[0]
      const signingData = "0x1230"
      const signed = await keyringService.personalSign({
        signingData,
        account: address,
      })

      expect(signed).toBeDefined()
    })
  })

  describe("wallet imported with private key", () => {
    beforeEach(async () => {
      await keyringService.importSigner({
        type: SignerTypes.privateKey,
        privateKey: PK_WALLET_MOCK.privateKey,
      })
    })
    it("should add pk wallet to wallets", () => {
      const wallets = keyringService.getPrivateKeys()
      expect(wallets.length).toBe(1)
    })
    it("should classify pk wallet as imported", async () => {
      expect(
        await keyringService.getSignerSourceForAddress(PK_WALLET_MOCK.address)
      ).toBe("import")
    })
    it("should be able to remove pk wallet and add it again", async () => {
      await keyringService.hideAccount(PK_WALLET_MOCK.address)
      expect(keyringService.getPrivateKeys().length).toBe(0)

      await keyringService.importSigner({
        type: SignerTypes.privateKey,
        privateKey: PK_WALLET_MOCK.privateKey,
      })
      expect(keyringService.getPrivateKeys().length).toBe(1)
    })
    it("should be able to sign transaction", async () => {
      const { address } = PK_WALLET_MOCK
      const signed = await keyringService.signTransaction(
        { address, network: ETHEREUM },
        createTransactionRequest({ from: address })
      )

      expect(signed).toMatchObject({
        from: expect.stringMatching(new RegExp(address, "i")),
        r: expect.anything(),
        s: expect.anything(),
        v: expect.anything(),
      })
    })
    it("should be able to sign typed data", async () => {
      const { address } = PK_WALLET_MOCK
      const typedData = createTypedData()
      const signed = await keyringService.signTypedData({
        typedData,
        account: address,
      })

      expect(signed).toBeDefined()
    })
    it("should be able to make a personal sign", async () => {
      const { address } = PK_WALLET_MOCK
      const signingData = "0x1230"
      const signed = await keyringService.personalSign({
        signingData,
        account: address,
      })

      expect(signed).toBeDefined()
    })
  })

  describe("export secrets", () => {
    beforeEach(async () => {
      await keyringService.importSigner({
        type: SignerTypes.privateKey,
        privateKey: PK_WALLET_MOCK.privateKey,
      })
      await keyringService.importSigner({
        type: SignerTypes.keyring,
        mnemonic: HD_WALLET_MOCK.mnemonic,
        source: "import",
      })
    })
    it("should be able to export private key", async () => {
      const privateKey = await keyringService.exportPrivateKey(
        PK_WALLET_MOCK.address
      )

      expect(privateKey).toBe(PK_WALLET_MOCK.privateKey)
    })
    it("should be able to export mnemonic", async () => {
      const mnemonic = await keyringService.exportMnemonic(
        HD_WALLET_MOCK.addresses[0]
      )

      expect(mnemonic).toBe(HD_WALLET_MOCK.mnemonic)
    })
    it("should be able to export private key from HD wallet addresses", async () => {
      const privateKey = await keyringService.exportPrivateKey(
        HD_WALLET_MOCK.addresses[0]
      )

      expect(privateKey).toBe(PK_WALLET_MOCK.privateKey) // first address from both mocks is the same
    })
    it("should require wallet to be unlocked to export secrets", async () => {
      keyringService.lock()

      const errorMessage = "KeyringService must be unlocked."
      const exportMnemonic = async () => {
        await keyringService.exportMnemonic(HD_WALLET_MOCK.addresses[0])
      }
      const exportPrivateKey = async () => {
        await keyringService.exportPrivateKey(PK_WALLET_MOCK.address)
      }

      expect(exportMnemonic()).rejects.toThrowError(errorMessage)
      expect(exportPrivateKey()).rejects.toThrowError(errorMessage)
    })
  })
})
