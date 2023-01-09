import sinon from "sinon"
import ChainService from ".."
import { ETHEREUM, OPTIMISM, POLYGON } from "../../../constants"
import {
  AnyEVMTransaction,
  TransactionRequest,
  TransactionRequestWithNonce,
} from "../../../networks"
import {
  createAnyEVMTransaction,
  createChainService,
  createLegacyTransactionRequest,
} from "../../../tests/factories"
import SerialFallbackProvider from "../serial-fallback-provider"

type ChainServiceExternalized = Omit<ChainService, ""> & {
  handlePendingTransaction: (transaction: AnyEVMTransaction) => void
  populateEVMTransactionNonce: (
    transactionRequest: TransactionRequest
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
          ({ network }) => network.chainID === ETHEREUM.chainID
        )
      ).toHaveLength(1)
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
          } as unknown as SerialFallbackProvider)
      )

    const transactionRequestWithoutNonce = createLegacyTransactionRequest({
      network: OPTIMISM,
      chainID: OPTIMISM.chainID,
      nonce: undefined,
    })

    // Populate EVM Transaction Nonce
    await chainServiceExternalized.populateEVMTransactionNonce(
      transactionRequestWithoutNonce
    )

    const { from, network } = transactionRequestWithoutNonce
    expect(providerForNetworkOrThrow.called).toBe(true)

    const validOptimismEVMTransaction = createAnyEVMTransaction({
      nonce: CHAIN_NONCE + 1,
      from,
      network,
    })

    await chainServiceExternalized.handlePendingTransaction(
      validOptimismEVMTransaction
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
          } as unknown as SerialFallbackProvider)
      )

    const transactionRequestWithoutNonce = createLegacyTransactionRequest({
      network: POLYGON,
      chainID: POLYGON.chainID,
      nonce: undefined,
    })

    // Populate EVM Transaction Nonce
    await chainServiceExternalized.populateEVMTransactionNonce(
      transactionRequestWithoutNonce
    )

    const { chainID, from, network } = transactionRequestWithoutNonce
    expect(providerForNetworkOrThrow.called).toBe(true)

    const validOptimismEVMTransaction = createAnyEVMTransaction({
      nonce: CHAIN_NONCE + 1,
      from,
      network,
    })

    await chainServiceExternalized.handlePendingTransaction(
      validOptimismEVMTransaction
    )

    // provider.once should be called inside of subscribeToTransactionConfirmation
    // with the transaction hash
    expect(onceSpy.called).toBe(true)

    expect(
      chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
        chainID
      ][from]
    ).toBe(CHAIN_NONCE + 1)

    // Handling a pending transaction should update the last seem EVM transaction nonce
    expect(
      chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
        chainID
      ][validOptimismEVMTransaction.from]
    ).toBe(validOptimismEVMTransaction.nonce)

    // Transaction should be persisted to the db
    expect(
      await chainServiceExternalized.getTransaction(
        POLYGON,
        validOptimismEVMTransaction.hash
      )
    ).toBeTruthy()
  })

  describe("populateEVMTransactionNonce", () => {
    // The number of transactions address has ever sent
    const TRANSACTION_COUNT = 100
    // Next correct nonce for chain. This should be set to the number of transactions ever sent from this address
    const CHAIN_NONCE = TRANSACTION_COUNT

    beforeEach(() => {
      chainService.providerForNetworkOrThrow = jest.fn(
        () =>
          ({
            getTransactionCount: async () => TRANSACTION_COUNT,
          } as unknown as SerialFallbackProvider)
      )
    })

    it("if nonce is not yet populated for transaction request on chain with mempool should populate nonce", async () => {
      const chainServiceExternalized =
        chainService as unknown as ChainServiceExternalized
      const transactionRequest = createLegacyTransactionRequest({
        network: ETHEREUM,
        chainID: ETHEREUM.chainID,
        nonce: undefined,
      })

      const transactionWithNonce =
        await chainServiceExternalized.populateEVMTransactionNonce(
          transactionRequest
        )

      expect(transactionWithNonce.nonce).toBe(CHAIN_NONCE)
      expect(
        chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
          transactionRequest.chainID
        ][transactionRequest.from]
      ).toBe(CHAIN_NONCE)
    })

    it("if nonce is populated for transaction request on chain with mempool should not populate nonce", async () => {
      const chainServiceExternalized =
        chainService as unknown as ChainServiceExternalized
      const transactionRequest = createLegacyTransactionRequest({
        network: ETHEREUM,
        chainID: ETHEREUM.chainID,
        nonce: CHAIN_NONCE,
      })

      const transactionWithNonce =
        await chainServiceExternalized.populateEVMTransactionNonce(
          transactionRequest
        )

      expect(transactionWithNonce.nonce).toBe(CHAIN_NONCE)
    })

    it("if nonce is not yet populated for transaction request on chain without mempool should populate nonce", async () => {
      const chainServiceExternalized =
        chainService as unknown as ChainServiceExternalized
      const transactionRequest = createLegacyTransactionRequest({
        network: OPTIMISM,
        chainID: OPTIMISM.chainID,
        nonce: undefined,
      })

      const transactionWithNonce =
        await chainServiceExternalized.populateEVMTransactionNonce(
          transactionRequest
        )

      expect(transactionWithNonce.nonce).toBe(CHAIN_NONCE)
    })

    it("if nonce is populated for transaction request on chain without mempool should not populate nonce", async () => {
      const chainServiceExternalized =
        chainService as unknown as ChainServiceExternalized
      const transactionRequest = createLegacyTransactionRequest({
        network: ETHEREUM,
        chainID: ETHEREUM.chainID,
        nonce: CHAIN_NONCE,
      })

      const transactionWithNonce =
        await chainServiceExternalized.populateEVMTransactionNonce(
          transactionRequest
        )

      expect(transactionWithNonce.nonce).toBe(CHAIN_NONCE)
    })
  })

  describe("releaseEVMTransactionNonce", () => {
    const LAST_SEEN_NONCE = 12
    const WRONG_NONCE = 11
    const NONCE = 10

    it("if the nonce for transaction is below the latest allocated nonce should release all intervening nonces", async () => {
      const chainServiceExternalized =
        chainService as unknown as ChainServiceExternalized
      const transactionRequest = createLegacyTransactionRequest({
        network: ETHEREUM,
        chainID: ETHEREUM.chainID,
        nonce: WRONG_NONCE,
      }) as TransactionRequestWithNonce
      const { chainID, from } = transactionRequest

      chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
        chainID
      ] ??= {}
      chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
        chainID
      ][from] = LAST_SEEN_NONCE

      await chainServiceExternalized.releaseEVMTransactionNonce(
        transactionRequest
      )

      expect(
        chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
          chainID
        ][from]
      ).toBe(NONCE)
    })
  })
})
