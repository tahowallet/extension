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

  describe("internalStartService", () => {
    it("should not add duplicate networks on startup", async () => {
      // Startup is simulated in the `beforeEach`
      expect(
        chainService.supportedNetworks.filter(
          (network) => network.chainID === ETHEREUM.chainID
        )
      ).toHaveLength(1)

      expect(
        chainService.supportedNetworks.filter(
          (network) => network.chainID === POLYGON.chainID
        )
      ).toHaveLength(1)
    })
  })

  it("handlePendingTransactions should update nonce tracking, subscribe to transaction confirmations, and persist the transaction to indexedDB", async () => {
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
      nonce: undefined,
    })

    // Populate EVM Transaction Nonce
    await chainServiceExternalized.populateEVMTransactionNonce(
      transactionRequestWithoutNonce
    )

    const { chainID, from, network } = transactionRequestWithoutNonce
    expect(providerForNetworkOrThrow.called).toBe(true)
    expect(
      chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
        chainID
      ][from]
    ).toBe(CHAIN_NONCE)

    const validOptimismEVMTransaction = createAnyEVMTransaction({
      nonce: 101,
      from,
      network,
    })

    await chainServiceExternalized.handlePendingTransaction(
      validOptimismEVMTransaction
    )
    // Handling a pending transaction should update the last seem EVM transaction nonce
    expect(
      chainServiceExternalized.evmChainLastSeenNoncesByNormalizedAddress[
        chainID
      ][validOptimismEVMTransaction.from]
    ).toBe(validOptimismEVMTransaction.nonce)

    // provider.once should be called inside of subscribeToTransactionConfirmation
    // with the transaction hash
    expect(onceSpy.called).toBe(true)

    // Transaction should be persisted to the db
    expect(
      await chainServiceExternalized.getTransaction(
        OPTIMISM,
        validOptimismEVMTransaction.hash
      )
    ).toBeTruthy()
  })
})
