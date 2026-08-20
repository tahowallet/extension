import sinon from "sinon"
import ChainService from ".."
import { ETHEREUM, OPTIMISM, POLYGON } from "../../../constants"
import {
  AnyEVMTransaction,
  TransactionRequest,
  TransactionRequestWithNonce,
} from "../../../networks"
import {
  createAddressOnNetwork,
  createAnyEVMTransaction,
  createChainService,
  createLegacyTransactionRequest,
} from "../../../tests/factories"
import { ChainDatabase } from "../db"
import { BOAR_RPC_URLS } from "../../../lib/boar"
import SerialFallbackProvider from "../serial-fallback-provider"

type ChainServiceExternalized = Omit<ChainService, ""> & {
  db: ChainDatabase
  handlePendingTransaction: (transaction: AnyEVMTransaction) => void
  populateEVMTransactionNonce: (
    transactionRequest: TransactionRequest,
  ) => Promise<TransactionRequestWithNonce>
  evmChainLastSeenNoncesByNormalizedAddress: {
    [chainID: string]: { [normalizedAddress: string]: number }
  }
}

describe("ChainService", () => {
  const sandbox = sinon.createSandbox()
  let chainService: ChainService

  beforeEach(async () => {
    sandbox.restore()
    chainService = await createChainService()
    await chainService.startService()
  })

  afterEach(async () => {
    await chainService.stopService()
  })

  describe("internalStartService", () => {
    it("should not add duplicate networks on startup", async () => {
      // Startup is simulated in the `beforeEach`
      expect(
        chainService.subscribedNetworks.filter(
          ({ network }) => network.chainID === ETHEREUM.chainID,
        ),
      ).toHaveLength(1)
    })

    it("should initialize persisted data in the correct order", async () => {
      const chainServiceInstance =
        (await createChainService()) as unknown as ChainServiceExternalized

      const initialize = sandbox.spy(chainServiceInstance.db, "initialize")

      const initializeBaseAssets = sandbox.spy(
        chainServiceInstance.db,
        "initializeBaseAssets" as keyof ChainDatabase,
      )
      const initializeRPCs = sandbox.spy(
        chainServiceInstance.db,
        "initializeRPCs" as keyof ChainDatabase,
      )
      const initializeEVMNetworks = sandbox.spy(
        chainServiceInstance.db,
        "initializeEVMNetworks" as keyof ChainDatabase,
      )

      const initializeNetworks = sandbox.spy(
        chainServiceInstance,
        "initializeNetworks",
      )

      await chainServiceInstance.internalStartService()

      expect(initialize.calledBefore(initializeNetworks)).toBe(true)
      expect(initializeBaseAssets.calledBefore(initializeRPCs)).toBe(true)
      expect(initializeRPCs.calledBefore(initializeEVMNetworks)).toBe(true)
      expect(initializeEVMNetworks.calledBefore(initializeNetworks)).toBe(true)
      expect(initializeNetworks.called).toBe(true)
    })
  })

  it("handlePendingTransactions on chains without mempool should subscribe to transaction confirmations, and persist the transaction to indexedDB", async () => {
    const chainServiceExternalized =
      chainService as unknown as ChainServiceExternalized
    const CHAIN_NONCE = 100
    // Return a fake provider
    const onceSpy = sandbox.spy()
    const providerForNetworkOrThrow = sandbox
      .stub(chainServiceExternalized, "providerForNetworkOrThrow")
      .callsFake(
        () =>
          ({
            getTransactionCount: async () => CHAIN_NONCE,
            once: onceSpy,
          }) as unknown as SerialFallbackProvider,
      )

    const transactionRequestWithoutNonce = createLegacyTransactionRequest({
      network: OPTIMISM,
      chainID: OPTIMISM.chainID,
      nonce: undefined,
    })

    // Populate EVM Transaction Nonce
    await chainServiceExternalized.populateEVMTransactionNonce(
      transactionRequestWithoutNonce,
    )

    const { from, network } = transactionRequestWithoutNonce
    expect(providerForNetworkOrThrow.called).toBe(true)

    const validOptimismEVMTransaction = createAnyEVMTransaction({
      nonce: CHAIN_NONCE + 1,
      from,
      network,
    })

    await chainServiceExternalized.handlePendingTransaction(
      validOptimismEVMTransaction,
    )

    // provider.once should be called inside of subscribeToTransactionConfirmation
    // with the transaction hash
    expect(onceSpy.called).toBe(true)
  })
  it("handlePendingTransactions on chains with mempool should update nonce tracking, subscribe to transaction confirmations, and persist the transaction to indexedDB", async () => {
    const chainServiceExternalized =
      chainService as unknown as ChainServiceExternalized
    const CHAIN_NONCE = 100
    // Return a fake provider
    const onceSpy = sandbox.spy()
    const providerForNetworkOrThrow = sandbox
      .stub(chainServiceExternalized, "providerForNetworkOrThrow")
      .callsFake(
        () =>
          ({
            getTransactionCount: async () => CHAIN_NONCE,
            once: onceSpy,
          }) as unknown as SerialFallbackProvider,
      )

    const transactionRequestWithoutNonce = createLegacyTransactionRequest({
      network: POLYGON,
      chainID: POLYGON.chainID,
      nonce: undefined,
    })

    // Populate EVM Transaction Nonce
    await chainServiceExternalized.populateEVMTransactionNonce(
      transactionRequestWithoutNonce,
    )

    const { chainID, from, network } = transactionRequestWithoutNonce
    expect(providerForNetworkOrThrow.called).toBe(true)

    const validOptimismEVMTransaction = createAnyEVMTransaction({
      nonce: CHAIN_NONCE + 1,
      from,
      network,
    })

    await chainServiceExternalized.handlePendingTransaction(
      validOptimismEVMTransaction,
    )

    // provider.once should be called inside of subscribeToTransactionConfirmation
    // with the transaction hash
    expect(onceSpy.called).toBe(true)

    expect(
      chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
        chainID
      ][from],
    ).toBe(CHAIN_NONCE + 1)

    // Handling a pending transaction should update the last seem EVM transaction nonce
    expect(
      chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
        chainID
      ][validOptimismEVMTransaction.from],
    ).toBe(validOptimismEVMTransaction.nonce)

    // Transaction should be persisted to the db
    expect(
      await chainServiceExternalized.getTransaction(
        POLYGON,
        validOptimismEVMTransaction.hash,
      ),
    ).toBeTruthy()
  })

  describe("updateSupportedNetworks", () => {
    it("Should properly update supported networks", async () => {
      chainService.supportedNetworks = []
      await chainService.updateSupportedNetworks()
      expect(chainService.supportedNetworks.length).toBe(10)
    })
  })

  describe("addCustomChain", () => {
    // prettier-ignore
    const FANTOM_CHAIN_PARAMS = { chainId: "250", blockExplorerUrl: "https://ftmscan.com", chainName: "Fantom Opera", nativeCurrency: { name: "Fantom", symbol: "FTM", decimals: 18, }, rpcUrls: [ "https://fantom-mainnet.gateway.pokt.network/v1/lb/62759259ea1b320039c9e7ac", "https://rpc.ftm.tools", "https://rpc.ankr.com/fantom", "https://rpc.fantom.network", "https://rpc2.fantom.network", "https://rpc3.fantom.network", "https://rpcapi.fantom.network", "https://fantom-mainnet.public.blastapi.io", "https://1rpc.io/ftm", ], blockExplorerUrls: ["https://ftmscan.com"], }
    it("should update supported networks after adding a chain", async () => {
      expect(chainService.supportedNetworks.length).toBe(10)
      await chainService.addCustomChain(FANTOM_CHAIN_PARAMS)
      expect(chainService.supportedNetworks.length).toBe(11)
    })

    it("should create a provider for the new chain", async () => {
      expect(chainService.providers.evm["250"]).toBe(undefined)
      await chainService.addCustomChain(FANTOM_CHAIN_PARAMS)
      expect(chainService.providers.evm["250"]).toBeInstanceOf(
        SerialFallbackProvider,
      )
    })

    it("should start tracking the new chain", async () => {
      expect((await chainService.getTrackedNetworks()).length).toBe(1)
      await chainService.addCustomChain(FANTOM_CHAIN_PARAMS)
      expect((await chainService.getTrackedNetworks()).length).toBe(2)
    })
  })

  describe("populateEVMTransactionNonce", () => {
    // The number of transactions address has ever sent
    const TRANSACTION_COUNT = 100
    // Nonce for chain. This should be set to the number of transactions ever sent from this address
    const CHAIN_NONCE = TRANSACTION_COUNT

    beforeEach(() => {
      chainService.providerForNetworkOrThrow = jest.fn(
        () =>
          ({
            getTransactionCount: async () => TRANSACTION_COUNT,
          }) as unknown as SerialFallbackProvider,
      )
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it("should not overwrite the nonce set on tx request for chains with a mempool", async () => {
      const chainServiceExternalized =
        chainService as unknown as ChainServiceExternalized
      const transactionRequest = createLegacyTransactionRequest({
        network: ETHEREUM,
        chainID: ETHEREUM.chainID,
        nonce: CHAIN_NONCE,
      })

      const transactionWithNonce =
        await chainServiceExternalized.populateEVMTransactionNonce(
          transactionRequest,
        )

      expect(transactionWithNonce.nonce).toBe(CHAIN_NONCE)
    })

    it("should not overwrite the nonce set on tx request for chains without a mempool", async () => {
      const chainServiceExternalized =
        chainService as unknown as ChainServiceExternalized
      const transactionRequest = createLegacyTransactionRequest({
        network: OPTIMISM,
        chainID: OPTIMISM.chainID,
        nonce: CHAIN_NONCE,
      })

      const transactionWithNonce =
        await chainServiceExternalized.populateEVMTransactionNonce(
          transactionRequest,
        )

      expect(transactionWithNonce.nonce).toBe(CHAIN_NONCE)
    })

    it("should not store the nonce for chains without a mempool when a tx request is set", async () => {
      const chainServiceExternalized =
        chainService as unknown as ChainServiceExternalized
      const transactionRequest = createLegacyTransactionRequest({
        network: OPTIMISM,
        chainID: OPTIMISM.chainID,
        nonce: CHAIN_NONCE,
      })

      await chainServiceExternalized.populateEVMTransactionNonce(
        transactionRequest,
      )

      expect(
        chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
          transactionRequest.chainID
        ],
      ).toBe(undefined)
    })

    it("should set the nonce for tx request for chains with a mempool", async () => {
      const chainServiceExternalized =
        chainService as unknown as ChainServiceExternalized
      const transactionRequest = createLegacyTransactionRequest({
        network: ETHEREUM,
        chainID: ETHEREUM.chainID,
        nonce: undefined,
      })

      const transactionWithNonce =
        await chainServiceExternalized.populateEVMTransactionNonce(
          transactionRequest,
        )

      expect(transactionWithNonce.nonce).toBe(CHAIN_NONCE)
    })

    it("should set the nonce for tx request for chains without a mempool", async () => {
      const chainServiceExternalized =
        chainService as unknown as ChainServiceExternalized
      const transactionRequest = createLegacyTransactionRequest({
        network: OPTIMISM,
        chainID: OPTIMISM.chainID,
        nonce: undefined,
      })

      const transactionWithNonce =
        await chainServiceExternalized.populateEVMTransactionNonce(
          transactionRequest,
        )

      expect(transactionWithNonce.nonce).toBe(CHAIN_NONCE)
    })

    it("should store the nonce for chains with a mempool when a tx request is set", async () => {
      const chainServiceExternalized =
        chainService as unknown as ChainServiceExternalized
      const transactionRequest = createLegacyTransactionRequest({
        network: ETHEREUM,
        chainID: ETHEREUM.chainID,
        nonce: undefined,
      })

      await chainServiceExternalized.populateEVMTransactionNonce(
        transactionRequest,
      )

      expect(
        chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
          transactionRequest.chainID
        ][transactionRequest.from],
      ).toBe(CHAIN_NONCE)
    })

    it("should not store the nonce for chains without a mempool when a tx request is set", async () => {
      const chainServiceExternalized =
        chainService as unknown as ChainServiceExternalized
      const transactionRequest = createLegacyTransactionRequest({
        network: OPTIMISM,
        chainID: OPTIMISM.chainID,
        nonce: undefined,
      })

      await chainServiceExternalized.populateEVMTransactionNonce(
        transactionRequest,
      )

      expect(
        chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
          transactionRequest.chainID
        ],
      ).toBe(undefined)
    })
  })

  describe("releaseEVMTransactionNonce", () => {
    it("should release all intervening nonces if the nonce for transaction is below the latest allocated nonce", async () => {
      /**
       * Two transactions have been sent: one approving (nonce=11) the other for the swapping (nonce=12).
       * In case transaction for nonce 11 will has too small gas we should release all intervening nonces.
       * Nonce for the chain is then 10. Last seen nonce should also be set to this value.
       */
      // Actual Swap transaction
      const LAST_SEEN_NONCE = 12
      // Approval transaction
      const NONCE = 11
      //  Nonce for chain
      const CHAIN_NONCE = 10

      const chainServiceExternalized =
        chainService as unknown as ChainServiceExternalized
      const transactionRequest = createLegacyTransactionRequest({
        network: ETHEREUM,
        chainID: ETHEREUM.chainID,
        nonce: NONCE,
      }) as TransactionRequestWithNonce
      const { chainID, from } = transactionRequest

      chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
        chainID
      ] ??= {}
      chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
        chainID
      ][from] = LAST_SEEN_NONCE

      await chainServiceExternalized.releaseEVMTransactionNonce(
        transactionRequest,
      )

      expect(
        chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
          chainID
        ][from],
      ).toBe(CHAIN_NONCE)
    })

    it("should release all intervening nonces if the nonce for a transaction is equal to the value of the latest allocated nonce", async () => {
      const LAST_SEEN_NONCE = 11
      const NONCE = LAST_SEEN_NONCE
      const CHAIN_NONCE = 10

      const chainServiceExternalized =
        chainService as unknown as ChainServiceExternalized
      const transactionRequest = createLegacyTransactionRequest({
        network: ETHEREUM,
        chainID: ETHEREUM.chainID,
        nonce: NONCE,
      }) as TransactionRequestWithNonce
      const { chainID, from } = transactionRequest

      chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
        chainID
      ] ??= {}
      chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
        chainID
      ][from] = LAST_SEEN_NONCE

      await chainServiceExternalized.releaseEVMTransactionNonce(
        transactionRequest,
      )

      expect(
        chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
          chainID
        ][from],
      ).toBe(CHAIN_NONCE)
    })
  })

  describe("getNetworksToTrack", () => {
    it("Should fetch built-in and custom networks to track", async () => {
      const account = createAddressOnNetwork()

      await chainService.addCustomChain({
        chainName: "Foo",
        chainId: "12345",
        nativeCurrency: {
          name: "FooCoin",
          symbol: "FOO",
          decimals: 18,
        },
        rpcUrls: ["https://foo.com"],
        blockExplorerUrl: "https://fooscanner.com",
      })

      await chainService.addAccountToTrack({
        address: account.address,
        network: {
          name: "Foo",
          chainID: "12345",
          family: "EVM",
          baseAsset: {
            decimals: 18,
            symbol: "FOO",
            name: "FooCoin",
            chainID: "12345",
          },
        },
      })

      await chainService.addAccountToTrack({
        address: account.address,
        network: ETHEREUM,
      })
      const networksToTrack = await chainService.getNetworksToTrack()

      expect(
        networksToTrack.find((network) => network.chainID === "12345"),
      ).toBeTruthy()
    })
  })

  describe("removeCustomChain", () => {
    const CUSTOM_CHAIN = {
      chainName: "Foo",
      chainId: "12345",
      nativeCurrency: { name: "FooCoin", symbol: "FOO", decimals: 18 },
      rpcUrls: ["https://foo.example.com"],
      blockExplorerUrl: "https://fooscanner.example.com",
    }

    it("retires the removed chain's provider and drops the entry", async () => {
      await chainService.addCustomChain(CUSTOM_CHAIN)

      const provider = chainService.providers.evm[
        CUSTOM_CHAIN.chainId
      ] as SerialFallbackProvider
      expect(provider).toBeDefined()

      const destroySpy = sandbox.spy(provider, "destroy")

      await chainService.removeCustomChain(CUSTOM_CHAIN.chainId)

      // The live provider is shut down, not just forgotten by the database.
      expect(destroySpy.called).toBe(true)
      expect(provider.isDestroyed).toBe(true)

      expect(chainService.providers.evm[CUSTOM_CHAIN.chainId]).toBeUndefined()

      // Nothing is left pointing at the retired provider, so the periodic
      // polls cannot keep addressing a removed chain.
      expect(
        chainService.subscribedNetworks.filter(
          ({ network }) => network.chainID === CUSTOM_CHAIN.chainId,
        ),
      ).toHaveLength(0)
      expect(
        chainService.subscribedAccounts.filter(
          ({ provider: accountProvider }) => accountProvider === provider,
        ),
      ).toHaveLength(0)
    })

    it("replaces and retires the existing provider when a known chain is re-added", async () => {
      await chainService.addCustomChain(CUSTOM_CHAIN)

      const firstProvider = chainService.providers.evm[
        CUSTOM_CHAIN.chainId
      ] as SerialFallbackProvider

      await chainService.addCustomChain({
        ...CUSTOM_CHAIN,
        rpcUrls: ["https://foo-replacement.example.com"],
      })

      const secondProvider = chainService.providers.evm[
        CUSTOM_CHAIN.chainId
      ] as SerialFallbackProvider

      expect(secondProvider).not.toBe(firstProvider)
      expect(firstProvider.isDestroyed).toBe(true)
      expect(secondProvider.isDestroyed).toBe(false)
    })
  })

  describe("setRpcEndpointsForChain", () => {
    const originalFetch = globalThis.fetch
    let fetchMock: jest.Mock

    const mockProbeResult = (chainIDHex: string) => {
      fetchMock.mockResolvedValue({
        json: async () => ({ jsonrpc: "2.0", id: 1, result: chainIDHex }),
      })
    }

    beforeEach(() => {
      fetchMock = jest.fn()
      globalThis.fetch = fetchMock as unknown as typeof fetch
    })

    afterEach(() => {
      globalThis.fetch = originalFetch
    })

    it("persists the new endpoint list and rebuilds the provider when the probe agrees", async () => {
      mockProbeResult("0x1")

      const previousProvider = chainService.providerForNetwork(ETHEREUM)

      await chainService.setRpcEndpointsForChain(ETHEREUM.chainID, [
        { url: "https://new-rpc.example.com", capabilities: ["alchemy_"] },
      ])

      expect(
        await chainService.getRpcEndpointsForChain(ETHEREUM.chainID),
      ).toEqual([
        { url: "https://new-rpc.example.com", capabilities: ["alchemy_"] },
      ])
      expect(chainService.providerForNetwork(ETHEREUM)).not.toBe(
        previousProvider,
      )
    })

    it("retires the replaced provider and moves subscriptions onto the new one", async () => {
      mockProbeResult("0x1")

      const previousProvider = chainService.providerForNetwork(ETHEREUM)!
      const destroySpy = sandbox.spy(previousProvider, "destroy")

      await chainService.setRpcEndpointsForChain(ETHEREUM.chainID, [
        { url: "https://new-rpc.example.com" },
      ])

      const newProvider = chainService.providerForNetwork(ETHEREUM)

      // The old provider's timers and connections are shut down rather than
      // left running against the endpoints that were just replaced.
      expect(destroySpy.called).toBe(true)

      // The network subscription is moved over in place, not duplicated.
      const ethereumSubscriptions = chainService.subscribedNetworks.filter(
        ({ network }) => network.chainID === ETHEREUM.chainID,
      )
      expect(ethereumSubscriptions).toHaveLength(1)
      expect(ethereumSubscriptions[0].provider).toBe(newProvider)

      // No account subscription is left pointing at the retired provider.
      expect(
        chainService.subscribedAccounts.filter(
          ({ provider }) => provider === previousProvider,
        ),
      ).toHaveLength(0)
    })

    it("rejects and does not persist when an endpoint reports the wrong chain ID", async () => {
      mockProbeResult("0x89") // Polygon, not Ethereum

      const existingEndpoints = await chainService.getRpcEndpointsForChain(
        ETHEREUM.chainID,
      )

      await expect(
        chainService.setRpcEndpointsForChain(ETHEREUM.chainID, [
          { url: "https://wrong-chain.example.com" },
        ]),
      ).rejects.toThrow("reports chain ID 137")

      expect(
        await chainService.getRpcEndpointsForChain(ETHEREUM.chainID),
      ).toEqual(existingEndpoints)
    })

    it("rejects when an endpoint is unreachable", async () => {
      fetchMock.mockRejectedValue(new Error("connection refused"))

      await expect(
        chainService.setRpcEndpointsForChain(ETHEREUM.chainID, [
          { url: "https://unreachable.example.com" },
        ]),
      ).rejects.toThrow("could not be reached")
    })

    it("rejects when an endpoint answers with a JSON-RPC error body", async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          error: { code: -32051, message: "API key disabled" },
        }),
      })

      await expect(
        chainService.setRpcEndpointsForChain(ETHEREUM.chainID, [
          { url: "https://error-body.example.com" },
        ]),
      ).rejects.toThrow("could not be reached")
    })

    it("does not probe WebSocket endpoints", async () => {
      mockProbeResult("0x1")

      await chainService.setRpcEndpointsForChain(ETHEREUM.chainID, [
        { url: "https://new-rpc.example.com" },
        { url: "wss://ws-rpc.example.com" },
      ])

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0][0]).toEqual("https://new-rpc.example.com")
    })

    it("rejects an empty endpoint list", async () => {
      await expect(
        chainService.setRpcEndpointsForChain(ETHEREUM.chainID, []),
      ).rejects.toThrow("At least one RPC endpoint is required")
    })

    it("reports Taho-managed endpoints alongside the stored list", async () => {
      const { rpcEndpoints, managedRpcEndpoints } =
        await chainService.getRpcConfigForChain(ETHEREUM.chainID)

      expect(rpcEndpoints.length).toBeGreaterThan(0)

      const boarRpcUrl = BOAR_RPC_URLS[ETHEREUM.chainID]
      if (boarRpcUrl === undefined) {
        expect(managedRpcEndpoints).toEqual([])
      } else {
        expect(managedRpcEndpoints).toEqual([
          { url: boarRpcUrl, capabilities: ["alchemy_"] },
        ])
      }
    })

    it("does not probe endpoints that are already stored", async () => {
      // A pre-existing endpoint having a transient outage must not block an
      // unrelated settings change; only new endpoints are probed.
      fetchMock.mockRejectedValue(new Error("connection refused"))

      const existingEndpoints = await chainService.getRpcEndpointsForChain(
        ETHEREUM.chainID,
      )
      expect(existingEndpoints.length).toBeGreaterThan(0)

      await chainService.setRpcEndpointsForChain(
        ETHEREUM.chainID,
        existingEndpoints,
      )

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("persists the block explorer URL via updateNetworkSettings", async () => {
      mockProbeResult("0x1")

      await chainService.updateNetworkSettings(
        ETHEREUM.chainID,
        [{ url: "https://new-rpc.example.com" }],
        "https://custom-explorer.example.com",
      )

      expect(
        chainService.supportedNetworks.find(
          ({ chainID }) => chainID === ETHEREUM.chainID,
        )?.blockExplorerURL,
      ).toEqual("https://custom-explorer.example.com")
    })

    it("rejects metadata updates for built-in networks", async () => {
      mockProbeResult("0x1")

      await expect(
        chainService.updateNetworkSettings(
          ETHEREUM.chainID,
          [{ url: "https://new-rpc.example.com" }],
          "https://custom-explorer.example.com",
          {
            chainName: "Fauxthereum",
            assetName: "Faux Ether",
            symbol: "FETH",
            decimals: 18,
          },
        ),
      ).rejects.toThrow("Cannot edit metadata of built-in network")
    })

    it("rejects for unknown chains", async () => {
      mockProbeResult("0x1")

      await expect(
        chainService.setRpcEndpointsForChain("999999", [
          { url: "https://new-rpc.example.com" },
        ]),
      ).rejects.toThrow("No network found")
    })
  })
})
