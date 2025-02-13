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
      expect(chainService.supportedNetworks.length).toBe(9)
    })
  })

  describe("addCustomChain", () => {
    // prettier-ignore
    const FANTOM_CHAIN_PARAMS = { chainId: "250", blockExplorerUrl: "https://ftmscan.com", chainName: "Fantom Opera", nativeCurrency: { name: "Fantom", symbol: "FTM", decimals: 18, }, rpcUrls: [ "https://fantom-mainnet.gateway.pokt.network/v1/lb/62759259ea1b320039c9e7ac", "https://rpc.ftm.tools", "https://rpc.ankr.com/fantom", "https://rpc.fantom.network", "https://rpc2.fantom.network", "https://rpc3.fantom.network", "https://rpcapi.fantom.network", "https://fantom-mainnet.public.blastapi.io", "https://1rpc.io/ftm", ], blockExplorerUrls: ["https://ftmscan.com"], }
    it("should update supported networks after adding a chain", async () => {
      expect(chainService.supportedNetworks.length).toBe(9)
      await chainService.addCustomChain(FANTOM_CHAIN_PARAMS)
      expect(chainService.supportedNetworks.length).toBe(10)
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
})
