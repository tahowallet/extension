import { webcrypto } from "crypto"
import InternalSignerService, {
  SignerImportSource,
  SignerSourceTypes,
} from ".."
import { ETHEREUM } from "../../../constants"
import {
  createInternalSignerService,
  createTransactionRequest,
  createTypedData,
} from "../../../tests/factories"
import { mockLocalStorage } from "../../../tests/utils"
import { InternalSignerTypes } from "../../../types"

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

describe("InternalSignerService", () => {
  let internalSignerService: InternalSignerService

  beforeEach(async () => {
    global.crypto = webcrypto as unknown as Crypto
    mockLocalStorage()

    internalSignerService = await createInternalSignerService()
    await internalSignerService.startService()
    await internalSignerService.unlock("test")
  })

  afterEach(async () => {
    await internalSignerService.stopService()
    global.crypto = originalCrypto
  })

  describe("generated HD wallet", () => {
    it("should generate new HD wallet", async () => {
      const keyring = await internalSignerService.generateNewKeyring(
        InternalSignerTypes.mnemonicBIP39S256
      )

      expect(keyring.id).toBeDefined()
      expect(keyring.mnemonic.length).toBe(24)

      await internalSignerService.importSigner({
        type: SignerSourceTypes.keyring,
        mnemonic: keyring.mnemonic.join(" "),
        source: SignerImportSource.internal,
      })

      const keyrings = internalSignerService.getKeyrings()
      expect(keyrings.length).toBe(1)
      expect(keyrings[0].id).toBe(keyring.id)
      expect(
        internalSignerService.getSignerSourceForAddress(
          keyrings[0].addresses[0]
        )
      ).toBe("internal")
    })
  })

  describe("imported HD wallet", () => {
    beforeEach(async () => {
      await internalSignerService.importSigner({
        type: SignerSourceTypes.keyring,
        mnemonic: HD_WALLET_MOCK.mnemonic,
        source: SignerImportSource.import,
      })
    })
    it("should add HD wallet to keyrings", () => {
      const keyrings = internalSignerService.getKeyrings()
      expect(keyrings.length).toBe(1)
    })
    it("should classify HD wallet as imported", async () => {
      expect(
        internalSignerService.getSignerSourceForAddress(
          HD_WALLET_MOCK.addresses[0]
        )
      ).toBe("import")
    })
    it("should be able to derive next address", async () => {
      const [keyring] = internalSignerService.getKeyrings()
      const [addressMock1, addressMock2] = HD_WALLET_MOCK.addresses

      expect(keyring.addresses.length).toBe(1)

      await internalSignerService.deriveAddress({
        type: "keyring",
        keyringID: keyring.id ?? "",
      })

      const [updatedKeyring] = internalSignerService.getKeyrings()

      expect(updatedKeyring.addresses.length).toBe(2)

      const [address1, address2] = updatedKeyring.addresses
      expect(address1).toBe(addressMock1)
      expect(address2).toBe(addressMock2)
    })
    it("should be able to hide address from HD wallet", async () => {
      const [keyring] = internalSignerService.getKeyrings()

      const address = await internalSignerService.deriveAddress({
        type: "keyring",
        keyringID: keyring.id ?? "",
      })

      await internalSignerService.hideAccount(address)

      const [updatedKeyring] = internalSignerService.getKeyrings()

      expect(updatedKeyring.addresses.length).toBe(1)
    })
    it("should be able to remove HD wallet by hiding all addresses", async () => {
      await internalSignerService.hideAccount(HD_WALLET_MOCK.addresses[0])
      const keyrings = internalSignerService.getKeyrings()

      expect(keyrings.length).toBe(0)
    })
    it("should be able to remove HD wallet and add it again", async () => {
      await internalSignerService.hideAccount(HD_WALLET_MOCK.addresses[0])
      await internalSignerService.importSigner({
        type: SignerSourceTypes.keyring,
        mnemonic: HD_WALLET_MOCK.mnemonic,
        source: SignerImportSource.import,
      })
      const keyrings = internalSignerService.getKeyrings()

      expect(keyrings.length).toBe(1)
    })
    it("should be able to sign transaction", async () => {
      const address = HD_WALLET_MOCK.addresses[0]
      const signed = await internalSignerService.signTransaction(
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
      const signed = await internalSignerService.signTypedData({
        typedData,
        account: address,
      })

      expect(signed).toBeDefined()
    })
    it("should be able to make a personal sign", async () => {
      const address = HD_WALLET_MOCK.addresses[0]
      const signingData = "0x1230"
      const signed = await internalSignerService.personalSign({
        signingData,
        account: address,
      })

      expect(signed).toBeDefined()
    })
  })

  describe("wallet imported with private key", () => {
    beforeEach(async () => {
      await internalSignerService.importSigner({
        type: SignerSourceTypes.privateKey,
        privateKey: PK_WALLET_MOCK.privateKey,
      })
    })
    it("should add pk wallet to wallets", () => {
      const wallets = internalSignerService.getPrivateKeys()
      expect(wallets.length).toBe(1)
    })
    it("should classify pk wallet as imported", async () => {
      expect(
        internalSignerService.getSignerSourceForAddress(PK_WALLET_MOCK.address)
      ).toBe("import")
    })
    it("should be able to remove pk wallet and add it again", async () => {
      await internalSignerService.hideAccount(PK_WALLET_MOCK.address)
      expect(internalSignerService.getPrivateKeys().length).toBe(0)

      await internalSignerService.importSigner({
        type: SignerSourceTypes.privateKey,
        privateKey: PK_WALLET_MOCK.privateKey,
      })
      expect(internalSignerService.getPrivateKeys().length).toBe(1)
    })
    it("should be able to sign transaction", async () => {
      const { address } = PK_WALLET_MOCK
      const signed = await internalSignerService.signTransaction(
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
      const signed = await internalSignerService.signTypedData({
        typedData,
        account: address,
      })

      expect(signed).toBeDefined()
    })
    it("should be able to make a personal sign", async () => {
      const { address } = PK_WALLET_MOCK
      const signingData = "0x1230"
      const signed = await internalSignerService.personalSign({
        signingData,
        account: address,
      })

      expect(signed).toBeDefined()
    })
  })

  describe("export secrets", () => {
    beforeEach(async () => {
      await internalSignerService.importSigner({
        type: SignerSourceTypes.privateKey,
        privateKey: PK_WALLET_MOCK.privateKey,
      })
      await internalSignerService.importSigner({
        type: SignerSourceTypes.keyring,
        mnemonic: HD_WALLET_MOCK.mnemonic,
        source: SignerImportSource.import,
      })
    })
    it("should be able to export private key", async () => {
      const privateKey = await internalSignerService.exportPrivateKey(
        PK_WALLET_MOCK.address
      )

      expect(privateKey).toBe(PK_WALLET_MOCK.privateKey)
    })
    it("should be able to export mnemonic", async () => {
      const mnemonic = await internalSignerService.exportMnemonic(
        HD_WALLET_MOCK.addresses[0]
      )

      expect(mnemonic).toBe(HD_WALLET_MOCK.mnemonic)
    })
    it("should be able to export private key from HD wallet addresses", async () => {
      const privateKey = await internalSignerService.exportPrivateKey(
        HD_WALLET_MOCK.addresses[0]
      )

      expect(privateKey).toBe(PK_WALLET_MOCK.privateKey) // first address from both mocks is the same
    })
    it("should require wallet to be unlocked to export secrets", async () => {
      internalSignerService.lock()

      const errorMessage = "InternalSignerService must be unlocked."
      const exportMnemonic = async () => {
        await internalSignerService.exportMnemonic(HD_WALLET_MOCK.addresses[0])
      }
      const exportPrivateKey = async () => {
        await internalSignerService.exportPrivateKey(PK_WALLET_MOCK.address)
      }

      expect(exportMnemonic()).rejects.toThrowError(errorMessage)
      expect(exportPrivateKey()).rejects.toThrowError(errorMessage)
    })
  })
})
