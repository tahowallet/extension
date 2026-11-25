import sinon from "sinon"
import { Wallet } from "ethers"
import {
  createAddressOnNetwork,
  createChainService,
  createInternalSignerService,
  createLedgerService,
  createNameService,
  createRandomAddress,
  createSigningService,
} from "../../../tests/factories"
import { ETHEREUM, OPTIMISM, POLYGON } from "../../../constants"
import type { AddressOnNetwork, NameOnNetwork } from "../../../accounts"
import type { EVMNetwork } from "../../../networks"
import type { HexString } from "../../../types"
import type { ResolvedAddressRecord } from "../../name"
import type InternalSignerService from "../../internal-signer"
import {
  type Keyring,
  type PrivateKey,
  SignerInternalTypes,
} from "../../internal-signer"
import type ChainService from "../../chain"
import type LedgerService from "../../ledger"
import type NameService from "../../name"
import SigningService, { type ControlCompatibility } from "../index"
import { SigningDatabase } from "../db"

describe("Signing Service Unit", () => {
  let signingService: SigningService
  const sandbox = sinon.createSandbox()

  beforeEach(async () => {
    signingService = await createSigningService()
    await signingService.startService()
    sandbox.restore()
  })

  afterEach(async () => {
    await signingService.stopService()
    sandbox.restore()
  })

  describe("deriveAddress", () => {
    it("should use ledger service to derive from a ledger account", async () => {
      const ledgerService = await createLedgerService()
      await ledgerService.startService()
      const deriveAddressStub = sandbox
        .stub(ledgerService, "deriveAddress")
        .callsFake(async () => "")

      signingService = await createSigningService({
        ledgerService: Promise.resolve(ledgerService),
      })
      await signingService.startService()

      await signingService.deriveAddress({
        type: "ledger",
        deviceID: "foo",
        path: "bar",
      })

      expect(deriveAddressStub.called).toBe(true)
    })

    it("should use keyring service to derive from a keyring account", async () => {
      const internalSignerService = await createInternalSignerService()
      const deriveAddressStub = sandbox
        .stub(internalSignerService, "deriveAddress")
        .callsFake(async () => "")

      signingService = await createSigningService({
        internalSignerService: Promise.resolve(internalSignerService),
      })
      await signingService.startService()

      await signingService.deriveAddress({
        type: "keyring",
        keyringID: "foo",
      })

      expect(deriveAddressStub.called).toBe(true)
    })

    it("should error when trying to derive from a read-only account", () => {
      expect(
        signingService.deriveAddress({
          type: "read-only",
        }),
      ).rejects.toBeTruthy()
    })
  })

  describe("internal signer registry", () => {
    let internalSignerService: InternalSignerService
    let lockedStub: sinon.SinonStub
    let replaceAllSpy: sinon.SinonSpy

    const keyringAddress = createRandomAddress()
    const privateKeyAddress = createRandomAddress()
    const keyring: Keyring = {
      type: SignerInternalTypes.mnemonicBIP39S256,
      id: "keyring-id",
      path: "m/44'/60'/0'/0",
      addresses: [keyringAddress],
    }
    const privateKey: PrivateKey = {
      type: SignerInternalTypes.singleSECP,
      id: "private-key-id",
      path: null,
      addresses: [privateKeyAddress],
    }

    /**
     * Emits an internalSigners event as the internal signer service would.
     * Emittery awaits its listeners, so awaiting the emit waits for the
     * registry write to finish.
     */
    const emitInternalSigners = async (signers: {
      privateKeys: PrivateKey[]
      keyrings: Keyring[]
    }) => {
      await internalSignerService.emitter.emit("internalSigners", {
        ...signers,
        metadata: {},
      })
    }

    beforeEach(async () => {
      internalSignerService = await createInternalSignerService()
      lockedStub = sandbox.stub(internalSignerService, "locked").returns(false)
      replaceAllSpy = sandbox.spy(SigningDatabase.prototype, "replaceAll")

      signingService = await createSigningService({
        internalSignerService: Promise.resolve(internalSignerService),
      })
      await signingService.startService()
    })

    it("populates the registry from unlocked internalSigners events", async () => {
      await emitInternalSigners({
        privateKeys: [privateKey],
        keyrings: [keyring],
      })

      expect(await signingService.getSignersForAddress(keyringAddress)).toEqual(
        [{ type: "keyring", keyringID: "keyring-id" }],
      )
      expect(
        await signingService.getSignersForAddress(privateKeyAddress),
      ).toEqual([{ type: "private-key", walletID: "private-key-id" }])
    })

    it("prefers the keyring signer when an address is in a keyring and a private key", async () => {
      await emitInternalSigners({
        privateKeys: [{ ...privateKey, addresses: [keyringAddress] }],
        keyrings: [keyring],
      })

      expect(await signingService.getSignersForAddress(keyringAddress)).toEqual(
        [{ type: "keyring", keyringID: "keyring-id" }],
      )
    })

    it("matches addresses regardless of checksum casing", async () => {
      const checksummedAddress = Wallet.createRandom().address
      await emitInternalSigners({
        privateKeys: [],
        keyrings: [{ ...keyring, addresses: [checksummedAddress] }],
      })

      expect(
        await signingService.getSignersForAddress(
          checksummedAddress.toLowerCase() as HexString,
        ),
      ).toEqual([{ type: "keyring", keyringID: "keyring-id" }])
    })

    it("replaces the registry on each unlocked event", async () => {
      await emitInternalSigners({ privateKeys: [], keyrings: [keyring] })
      await emitInternalSigners({ privateKeys: [], keyrings: [] })

      expect(await signingService.getSignersForAddress(keyringAddress)).toEqual(
        [],
      )
    })

    it("ignores internalSigners events while the internal signer is locked", async () => {
      await emitInternalSigners({ privateKeys: [], keyrings: [keyring] })
      expect(replaceAllSpy.callCount).toBe(1)

      lockedStub.returns(true)
      await emitInternalSigners({ privateKeys: [], keyrings: [] })

      expect(replaceAllSpy.callCount).toBe(1)
      expect(await signingService.getSignersForAddress(keyringAddress)).toEqual(
        [{ type: "keyring", keyringID: "keyring-id" }],
      )
    })

    it("answers signer lookups while the internal signer is locked", async () => {
      await emitInternalSigners({
        privateKeys: [privateKey],
        keyrings: [keyring],
      })

      lockedStub.returns(true)

      expect(await signingService.getSignersForAddress(keyringAddress)).toEqual(
        [{ type: "keyring", keyringID: "keyring-id" }],
      )
    })

    it("returns Ledger signers for Ledger addresses", async () => {
      const ledgerAddress = createRandomAddress()
      const ledgerService = await createLedgerService()
      sandbox.stub(ledgerService, "getAccountByAddress").resolves({
        ledgerId: "ledger-id",
        address: ledgerAddress,
        path: "m/44'/60'/0'/0/0",
      })
      signingService = await createSigningService({
        internalSignerService: Promise.resolve(internalSignerService),
        ledgerService: Promise.resolve(ledgerService),
      })
      await signingService.startService()

      expect(await signingService.getSignersForAddress(ledgerAddress)).toEqual([
        { type: "ledger", deviceID: "ledger-id", path: "m/44'/60'/0'/0/0" },
      ])
    })
  })

  describe("control compatibility map", () => {
    let internalSignerService: InternalSignerService
    let chainService: ChainService
    let trackedAccounts: AddressOnNetwork[]
    let supportedNetworks: EVMNetwork[]

    const keyringAddress = createRandomAddress()
    const otherAddress = createRandomAddress()
    const singleNetworkAddress = createRandomAddress()
    const keyring: Keyring = {
      type: SignerInternalTypes.mnemonicBIP39S256,
      id: "keyring-id",
      path: "m/44'/60'/0'/0",
      addresses: [keyringAddress],
    }

    // Keyring-controlled on both networks; the other address has no signer;
    // the single-network address is tracked on Ethereum only, but still
    // mapped on every known network.
    const expectedMap: ControlCompatibility = {
      [keyringAddress]: {
        [ETHEREUM.chainID]: [OPTIMISM.chainID],
        [OPTIMISM.chainID]: [ETHEREUM.chainID],
      },
      [otherAddress]: {
        [ETHEREUM.chainID]: [],
        [OPTIMISM.chainID]: [],
      },
      [singleNetworkAddress]: {
        [ETHEREUM.chainID]: [],
        [OPTIMISM.chainID]: [],
      },
    }

    const createTrackingService = async () =>
      createSigningService({
        internalSignerService: Promise.resolve(internalSignerService),
        chainService: Promise.resolve(chainService),
      })

    beforeEach(async () => {
      internalSignerService = await createInternalSignerService()
      sandbox.stub(internalSignerService, "locked").returns(false)
      chainService = await createChainService({
        internalSignerService: Promise.resolve(internalSignerService),
      })
      trackedAccounts = [
        { address: keyringAddress, network: ETHEREUM },
        { address: keyringAddress, network: OPTIMISM },
        { address: otherAddress, network: ETHEREUM },
        { address: otherAddress, network: OPTIMISM },
        { address: singleNetworkAddress, network: ETHEREUM },
      ]
      sandbox
        .stub(chainService, "getAccountsToTrack")
        .callsFake(async () => trackedAccounts)
      supportedNetworks = [ETHEREUM, OPTIMISM]
      sandbox
        .stub(chainService, "getSupportedNetworks")
        .callsFake(() => supportedNetworks)

      signingService = await createTrackingService()
      await internalSignerService.emitter.emit("internalSigners", {
        privateKeys: [],
        keyrings: [keyring],
        metadata: {},
      })

      // Wait for the startup computation so each test starts from a settled
      // service.
      const started = signingService.emitter.once("controlCompatibility")
      await signingService.startService()
      await started
    })

    it("maps each tracked address and network to the networks it is compatible with", async () => {
      expect(await signingService.getControlCompatibility()).toEqual(
        expectedMap,
      )
    })

    it("covers known networks an address isn't tracked on yet", async () => {
      supportedNetworks = [ETHEREUM, OPTIMISM, POLYGON]
      trackedAccounts = [{ address: keyringAddress, network: ETHEREUM }]

      expect(await signingService.getControlCompatibility()).toEqual({
        [keyringAddress]: {
          [ETHEREUM.chainID]: [OPTIMISM.chainID, POLYGON.chainID],
          [OPTIMISM.chainID]: [ETHEREUM.chainID, POLYGON.chainID],
          [POLYGON.chainID]: [ETHEREUM.chainID, OPTIMISM.chainID],
        },
      })
    })

    it("groups tracked networks by address regardless of checksum casing", async () => {
      trackedAccounts = [
        { address: keyringAddress, network: ETHEREUM },
        {
          address: keyringAddress
            .toUpperCase()
            .replace("0X", "0x") as HexString,
          network: OPTIMISM,
        },
      ]

      expect(await signingService.getControlCompatibility()).toEqual({
        [keyringAddress]: {
          [ETHEREUM.chainID]: [OPTIMISM.chainID],
          [OPTIMISM.chainID]: [ETHEREUM.chainID],
        },
      })
    })

    it("reads each address's signers once, not once per network pair", async () => {
      const getSignersSpy = sandbox.spy(signingService, "getSignersForAddress")

      await signingService.getControlCompatibility()

      // Three tracked addresses, each on one or two networks.
      expect(getSignersSpy.callCount).toBe(3)
    })

    it("emits the map once the service starts", async () => {
      signingService = await createTrackingService()
      const emitted = signingService.emitter.once("controlCompatibility")

      await signingService.startService()

      expect(await emitted).toEqual(expectedMap)
    })

    it("recomputes when an account is tracked on another network", async () => {
      trackedAccounts = [
        ...trackedAccounts,
        { address: singleNetworkAddress, network: OPTIMISM },
      ]
      const emitted = signingService.emitter.once("controlCompatibility")

      await chainService.emitter.emit("newAccountToTrack", {
        address: singleNetworkAddress,
        network: OPTIMISM,
      })

      expect(await emitted).toEqual({
        ...expectedMap,
        [singleNetworkAddress]: {
          [ETHEREUM.chainID]: [],
          [OPTIMISM.chainID]: [],
        },
      })
    })

    it("recomputes when a network is subscribed", async () => {
      const emitted = signingService.emitter.once("controlCompatibility")

      await chainService.emitter.emit("networkSubscribed", ETHEREUM)

      expect(await emitted).toEqual(expectedMap)
    })

    it("recomputes when an account is removed", async () => {
      trackedAccounts = trackedAccounts.filter(
        ({ address }) => address !== otherAddress,
      )
      const emitted = signingService.emitter.once("controlCompatibility")

      await signingService.removeAccount(otherAddress)

      const { [otherAddress]: _, ...withoutOther } = expectedMap
      expect(await emitted).toEqual(withoutOther)
    })

    it("recomputes when the internal signers change", async () => {
      const emitted = signingService.emitter.once("controlCompatibility")

      await internalSignerService.emitter.emit("internalSigners", {
        privateKeys: [],
        keyrings: [],
        metadata: {},
      })

      expect(await emitted).toEqual({
        ...expectedMap,
        [keyringAddress]: {
          [ETHEREUM.chainID]: [],
          [OPTIMISM.chainID]: [],
        },
      })
    })

    it("coalesces a burst of triggers into one computation", async () => {
      const computeSpy = sandbox.spy(signingService, "getControlCompatibility")
      const emitted = signingService.emitter.once("controlCompatibility")

      await Promise.all([
        chainService.emitter.emit("newAccountToTrack", {
          address: otherAddress,
          network: ETHEREUM,
        }),
        chainService.emitter.emit("newAccountToTrack", {
          address: otherAddress,
          network: OPTIMISM,
        }),
        chainService.emitter.emit("networkSubscribed", ETHEREUM),
      ])
      await emitted
      await new Promise((resolve) => {
        setTimeout(resolve, 10)
      })

      expect(computeSpy.callCount).toBe(1)
    })
  })

  describe("isControlCompatible", () => {
    let internalSignerService: InternalSignerService
    let ledgerService: LedgerService
    let nameService: NameService

    const keyringAddress = createRandomAddress()
    const keyring: Keyring = {
      type: SignerInternalTypes.mnemonicBIP39S256,
      id: "keyring-id",
      path: "m/44'/60'/0'/0",
      addresses: [keyringAddress],
    }
    const nameOnNetwork: NameOnNetwork = {
      name: "vitalik.eth",
      network: ETHEREUM,
    }

    const resolvesTo = (address: HexString): ResolvedAddressRecord => ({
      from: nameOnNetwork,
      resolved: {
        addressOnNetwork: { address, network: ETHEREUM },
      },
      system: "ENS",
    })

    beforeEach(async () => {
      internalSignerService = await createInternalSignerService()
      ledgerService = await createLedgerService()
      nameService = await createNameService()

      sandbox.stub(internalSignerService, "locked").returns(false)

      signingService = await createSigningService({
        internalSignerService: Promise.resolve(internalSignerService),
        ledgerService: Promise.resolve(ledgerService),
        nameService: Promise.resolve(nameService),
      })
      await signingService.startService()

      await internalSignerService.emitter.emit("internalSigners", {
        privateKeys: [],
        keyrings: [keyring],
        metadata: {},
      })
    })

    it("returns true on the same network", async () => {
      const addressOnNetwork = createAddressOnNetwork({ network: ETHEREUM })

      expect(
        await signingService.isControlCompatible(addressOnNetwork, ETHEREUM),
      ).toBe(true)
    })

    it("returns false when the address formats differ", async () => {
      const otherFamilyNetwork = {
        ...OPTIMISM,
        family: "not-evm",
      } as unknown as EVMNetwork
      const addressOnNetwork = createAddressOnNetwork({ network: ETHEREUM })

      expect(
        await signingService.isControlCompatible(
          addressOnNetwork,
          otherFamilyNetwork,
        ),
      ).toBe(false)
    })

    it("returns true when a keyring signer controls the address", async () => {
      const addressOnNetwork = createAddressOnNetwork({
        address: keyringAddress,
        network: ETHEREUM,
      })

      expect(
        await signingService.isControlCompatible(addressOnNetwork, OPTIMISM),
      ).toBe(true)
    })

    it("returns false when the keyring signer cannot sign on the other network", async () => {
      sandbox
        .stub(internalSignerService, "isTransactionCompatible")
        .returns(false)
      const addressOnNetwork = createAddressOnNetwork({
        address: keyringAddress,
        network: ETHEREUM,
      })

      expect(
        await signingService.isControlCompatible(addressOnNetwork, OPTIMISM),
      ).toBe(false)
    })

    it("returns true when only a Ledger signer controls the address", async () => {
      const ledgerAddress = createRandomAddress()
      sandbox.stub(ledgerService, "getAccountByAddress").resolves({
        ledgerId: "ledger-id",
        address: ledgerAddress,
        path: "m/44'/60'/0'/0/0",
      })
      const addressOnNetwork = createAddressOnNetwork({
        address: ledgerAddress,
        network: ETHEREUM,
      })

      expect(
        await signingService.isControlCompatible(addressOnNetwork, OPTIMISM),
      ).toBe(true)
    })

    it("returns false for an address no signer controls", async () => {
      const addressOnNetwork = createAddressOnNetwork({
        address: createRandomAddress(),
        network: ETHEREUM,
      })

      expect(
        await signingService.isControlCompatible(addressOnNetwork, OPTIMISM),
      ).toBe(false)
    })

    it("returns false for a name that does not resolve", async () => {
      sandbox.stub(nameService, "lookUpEthereumAddress").resolves(undefined)
      const isNameOwnershipCompatibleStub = sandbox
        .stub(nameService, "isNameOwnershipCompatible")
        .resolves(true)

      expect(
        await signingService.isControlCompatible(nameOnNetwork, OPTIMISM),
      ).toBe(false)
      expect(isNameOwnershipCompatibleStub.called).toBe(false)
    })

    it("uses the signers of the name's resolved address", async () => {
      sandbox
        .stub(nameService, "lookUpEthereumAddress")
        .resolves(resolvesTo(keyringAddress))
      const isNameOwnershipCompatibleStub = sandbox
        .stub(nameService, "isNameOwnershipCompatible")
        .resolves(false)

      expect(
        await signingService.isControlCompatible(nameOnNetwork, OPTIMISM),
      ).toBe(true)
      expect(isNameOwnershipCompatibleStub.called).toBe(false)
    })

    it("falls back to name ownership when the resolved address has no signer", async () => {
      sandbox
        .stub(nameService, "lookUpEthereumAddress")
        .resolves(resolvesTo(createRandomAddress()))
      const isNameOwnershipCompatibleStub = sandbox
        .stub(nameService, "isNameOwnershipCompatible")
        .resolves(true)

      expect(
        await signingService.isControlCompatible(nameOnNetwork, OPTIMISM),
      ).toBe(true)
      expect(
        isNameOwnershipCompatibleStub.calledWith(nameOnNetwork, OPTIMISM),
      ).toBe(true)
    })

    it("returns false when name ownership is not compatible", async () => {
      sandbox
        .stub(nameService, "lookUpEthereumAddress")
        .resolves(resolvesTo(createRandomAddress()))
      sandbox.stub(nameService, "isNameOwnershipCompatible").resolves(false)

      expect(
        await signingService.isControlCompatible(nameOnNetwork, OPTIMISM),
      ).toBe(false)
    })
  })
})
