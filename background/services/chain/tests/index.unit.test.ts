import sinon from "sinon"
import ChainService, {
  PriorityQueuedTxToRetrieve,
  QueuedTxToRetrieve,
} from ".."
import { ETHEREUM, MINUTE, OPTIMISM, POLYGON, SECOND } from "../../../constants"
import { EVMNetwork } from "../../../networks"
import * as gas from "../../../lib/gas"
import {
  createAddressOnNetwork,
  createArrayWith0xHash,
  createBlockPrices,
  createChainService,
  createTransactionsToRetrieve,
} from "../../../tests/factories"
import { UNIXTime } from "../../../types"
import {
  EnrichedEIP1559TransactionSignatureRequest,
  EnrichedLegacyTransactionSignatureRequest,
} from "../../enrichment"
import { AddressOnNetwork } from "../../../accounts"

type ChainServiceExternalized = Omit<ChainService, ""> & {
  populatePartialEIP1559TransactionRequest: () => void
  populatePartialLegacyEVMTransactionRequest: () => void
  handleRecentAssetTransferAlarm: (forceUpdate: boolean) => Promise<void>
  lastUserActivityOnNetwork: {
    [chainID: string]: UNIXTime
  }
  lastUserActivityOnAddress: {
    [chainID: string]: UNIXTime
  }
  loadRecentAssetTransfers: (
    addressNetwork: AddressOnNetwork,
    incomingOnly: boolean
  ) => Promise<void>
  retrieveTransaction: (queuedTx: QueuedTxToRetrieve) => Promise<void>
  transactionsToRetrieve: PriorityQueuedTxToRetrieve[]
  handleQueuedTransactionAlarm: () => Promise<void>
  transactionToRetrieveGranularTimer: NodeJS.Timer | undefined
  queueTransactionHashToRetrieve: void
}

describe("Chain Service", () => {
  const sandbox = sinon.createSandbox()
  let chainService: ChainService
  beforeEach(async () => {
    sandbox.restore()

    chainService = await createChainService()
  })

  describe("populatePartialTransactionRequest", () => {
    beforeEach(async () => {
      await chainService.startService()
    })

    afterEach(async () => {
      await chainService.stopService()
    })

    it("should use the correct method to populate EIP1559 Transaction Requests", async () => {
      const partialTransactionRequest: EnrichedEIP1559TransactionSignatureRequest =
        {
          from: "0x0d18b6e68ec588149f2fc20b76ff70b1cfb28882",
          network: ETHEREUM,
          nonce: 1,
          maxPriorityFeePerGas: 1n,
          maxFeePerGas: 2n,
        }

      const stub = sandbox.stub(
        chainService as unknown as ChainServiceExternalized,
        "populatePartialEIP1559TransactionRequest"
      )

      await chainService.populatePartialTransactionRequest(
        ETHEREUM,
        partialTransactionRequest,
        { maxFeePerGas: 100n, maxPriorityFeePerGas: 1000n }
      )

      expect(stub.callCount).toBe(1)

      await chainService.populatePartialTransactionRequest(
        POLYGON,
        { ...partialTransactionRequest, network: POLYGON },
        { maxFeePerGas: 100n, maxPriorityFeePerGas: 1000n }
      )

      expect(stub.callCount).toBe(2)
    })

    it("should use the correct method to populate Legacy EVM Transaction Requests", async () => {
      const partialTransactionRequest: EnrichedLegacyTransactionSignatureRequest =
        {
          from: "0x0d18b6e68ec588149f2fc20b76ff70b1cfb28882",
          network: OPTIMISM,
          nonce: 1,
          gasPrice: 1_000n,
        }

      const stub = sandbox.stub(
        chainService as unknown as ChainServiceExternalized,
        "populatePartialLegacyEVMTransactionRequest"
      )

      await chainService.populatePartialTransactionRequest(
        OPTIMISM,
        partialTransactionRequest,
        { maxFeePerGas: 100n, maxPriorityFeePerGas: 1000n }
      )

      expect(stub.callCount).toBe(1)
    })
  })

  describe("markNetworkActivity", () => {
    beforeEach(async () => {
      sandbox.stub(chainService, "supportedNetworks").value([ETHEREUM])

      await chainService.startService()
    })

    afterEach(async () => {
      await chainService.stopService()
    })

    it("should correctly update lastUserActivityOnNetwork", async () => {
      jest.useFakeTimers()

      const lastUserActivity = (
        chainService as unknown as ChainServiceExternalized
      ).lastUserActivityOnNetwork[ETHEREUM.chainID]

      jest.advanceTimersByTime(100)

      chainService.markNetworkActivity(ETHEREUM.chainID)

      expect(lastUserActivity).toBeLessThan(
        (chainService as unknown as ChainServiceExternalized)
          .lastUserActivityOnNetwork[ETHEREUM.chainID]
      )

      jest.useRealTimers()
    })

    it("should get block prices if the NETWORK_POLLING_TIMEOUT has been exceeded", async () => {
      // Set last activity time to 10 minutes ago
      ;(
        chainService as unknown as ChainServiceExternalized
      ).lastUserActivityOnNetwork[ETHEREUM.chainID] = Date.now() - 10 * MINUTE
      const getBlockPricesStub = sandbox
        .stub(gas, "default")
        .callsFake(async () => createBlockPrices())

      await chainService.markNetworkActivity(ETHEREUM.chainID)
      expect(getBlockPricesStub.called).toEqual(true)
    })
  })

  describe("markAccountActivity", () => {
    beforeEach(async () => {
      sandbox.stub(chainService, "supportedNetworks").value([ETHEREUM])
      await chainService.startService()
    })

    afterEach(async () => {
      await chainService.stopService()
    })

    it("should call markNetworkActivity with the correct network", async () => {
      const stub = sandbox
        .stub(chainService, "markNetworkActivity")
        .callsFake(async () => {})

      chainService.markAccountActivity(
        createAddressOnNetwork({ network: ETHEREUM })
      )

      expect(stub.calledWith(ETHEREUM.chainID)).toEqual(true)
    })

    it("should call loadRecentAssetTransfers if the NETWORK_POLLING_TIMEOUT has been exceeded", async () => {
      const account = createAddressOnNetwork({ network: ETHEREUM })

      // Set last activity time to 10 minutes ago
      ;(
        chainService as unknown as ChainServiceExternalized
      ).lastUserActivityOnAddress[account.address] = Date.now() - 10 * MINUTE
      const stub = sandbox
        .stub(
          chainService as unknown as ChainServiceExternalized,
          "loadRecentAssetTransfers"
        )
        .callsFake(async () => {})

      await chainService.markAccountActivity(
        createAddressOnNetwork({ network: ETHEREUM })
      )
      expect(stub.called).toEqual(true)
    })
  })

  describe("getActiveNetworks", () => {
    it("should wait until tracked networks activate", async () => {
      const activeNetworksMock: EVMNetwork[] = []

      sandbox
        .stub(
          chainService as unknown as ChainServiceExternalized,
          "getNetworksToTrack"
        )
        .resolves([ETHEREUM, POLYGON])

      const resolvesWithPolygon = sinon.promise()

      sandbox
        .stub(
          chainService as unknown as ChainServiceExternalized,
          "startTrackingNetworkOrThrow"
        )
        .onFirstCall()
        .callsFake(() => {
          activeNetworksMock.push(ETHEREUM)
          return Promise.resolve(ETHEREUM)
        })
        .onSecondCall()
        .returns(resolvesWithPolygon as Promise<EVMNetwork>)

      setTimeout(() => {
        activeNetworksMock.push(POLYGON)
        resolvesWithPolygon.resolve(POLYGON)
      }, 30)

      await chainService.getTrackedNetworks()

      expect(activeNetworksMock).toEqual([ETHEREUM, POLYGON])
    })
  })
  describe("Queued Transaction Retrieve", () => {
    describe("handleQueuedTransactionAlarm", () => {
      let clock: sinon.SinonFakeTimers
      let setIntervalSpy: sinon.SinonSpy
      let chainServiceExternalized: ChainServiceExternalized
      let retrieveTransactionStub: sinon.SinonStub
      beforeEach(() => {
        clock = sinon.useFakeTimers()

        setIntervalSpy = sinon.spy(global, "setInterval")

        chainServiceExternalized =
          chainService as unknown as ChainServiceExternalized

        retrieveTransactionStub = sandbox.stub(
          chainServiceExternalized,
          "retrieveTransaction"
        )
      })
      afterEach(() => {
        clock.restore()
      })
      it("should not start the granular timer if the queue is empty", () => {
        chainServiceExternalized.handleQueuedTransactionAlarm()

        clock.tick(2 * SECOND)

        expect(setIntervalSpy.calledOnce).toBe(false)
        expect(retrieveTransactionStub.callCount).toBe(0)
        expect(chainServiceExternalized.transactionsToRetrieve.length).toBe(0)
      })
      it("should not recreate the timer when the alarm fires periodically", () => {
        const clearIntervalSpy = sinon.spy(global, "clearInterval")

        chainServiceExternalized.transactionsToRetrieve =
          createTransactionsToRetrieve(100)

        chainServiceExternalized.handleQueuedTransactionAlarm()
        clock.tick(60 * SECOND)
        chainServiceExternalized.handleQueuedTransactionAlarm()
        clock.tick(60 * SECOND)
        chainServiceExternalized.handleQueuedTransactionAlarm()
        clock.tick(60 * SECOND)

        expect(setIntervalSpy.calledOnce).toBe(true)
        expect(clearIntervalSpy.calledOnce).toBe(false)
      })
      it("should retrieve 1 tx every 2 seconds, remove the tx from the queue and call the retrieve function", async () => {
        const txInQueueCount = 100
        const txRetrievedCount = 98

        chainServiceExternalized.transactionsToRetrieve =
          createTransactionsToRetrieve(txInQueueCount)

        chainServiceExternalized.handleQueuedTransactionAlarm()

        clock.tick(txRetrievedCount * 2 * SECOND)

        expect(retrieveTransactionStub.callCount).toBe(txRetrievedCount)
        expect(chainServiceExternalized.transactionsToRetrieve.length).toBe(
          txInQueueCount - txRetrievedCount
        )
      })
      it("should clean up the timer after the queue is emptied", async () => {
        const clearIntervalSpy = sinon.spy(global, "clearInterval")
        const numberOfTxInQueue = 100

        chainServiceExternalized.transactionsToRetrieve =
          createTransactionsToRetrieve(numberOfTxInQueue)

        chainServiceExternalized.handleQueuedTransactionAlarm()

        clock.tick(numberOfTxInQueue * 2 * SECOND)

        expect(setIntervalSpy.calledOnce).toBe(true)
        expect(retrieveTransactionStub.callCount).toBe(numberOfTxInQueue)
        expect(chainServiceExternalized.transactionsToRetrieve.length).toBe(0)

        // the clean up happens on the next tick
        clock.tick(2 * SECOND)

        expect(clearIntervalSpy.calledOnce).toBe(true)
        expect(
          chainServiceExternalized.transactionToRetrieveGranularTimer
        ).toBe(undefined)
      })
    })

    describe("queueTransactionHashToRetrieve", () => {
      const NUMBER_OF_TX = 100
      const PRIORITY_MAX_COUNT = 25
      let chainServiceExternalized: ChainServiceExternalized
      let hashesForFirstAccount: string[]
      let hashesForSecondAccount: string[]
      let transactionsToRetrieve: PriorityQueuedTxToRetrieve[]

      beforeEach(() => {
        chainServiceExternalized =
          chainService as unknown as ChainServiceExternalized

        hashesForFirstAccount = createArrayWith0xHash(NUMBER_OF_TX)
        hashesForSecondAccount = createArrayWith0xHash(NUMBER_OF_TX)

        const allHashesToAdd = [hashesForFirstAccount, hashesForSecondAccount]

        allHashesToAdd.forEach((hashes) =>
          hashes.forEach((txHash, idx) =>
            chainServiceExternalized.queueTransactionHashToRetrieve(
              ETHEREUM,
              txHash,
              Date.now(),
              idx < PRIORITY_MAX_COUNT ? 1 : 0
            )
          )
        )

        transactionsToRetrieve = chainServiceExternalized.transactionsToRetrieve
      })

      it("should add transactions to the queue", async () => {
        expect(transactionsToRetrieve.length).toBe(NUMBER_OF_TX * 2)
      })

      it(`the first ${PRIORITY_MAX_COUNT} transactions have a higher priority and should come from the first account`, async () => {
        Array(PRIORITY_MAX_COUNT).forEach((idx) => {
          expect(transactionsToRetrieve[idx].transaction.hash).toBe(
            hashesForFirstAccount[idx]
          )
        })
      })

      it(`another ${PRIORITY_MAX_COUNT} transactions have a higher priority and should come from the second account`, async () => {
        Array(PRIORITY_MAX_COUNT).forEach((idx) => {
          expect(
            transactionsToRetrieve[idx + PRIORITY_MAX_COUNT].transaction.hash
          ).toBe(hashesForSecondAccount[idx])
        })
      })

      it("after items with higher priority in the queue should be the next transactions for the first account", async () => {
        Array(NUMBER_OF_TX - PRIORITY_MAX_COUNT).forEach((idx) => {
          expect(
            transactionsToRetrieve[idx + PRIORITY_MAX_COUNT * 2].transaction
              .hash
          ).toBe(hashesForFirstAccount[idx + PRIORITY_MAX_COUNT])
        })
      })

      it("transactions with lower priority for the second account should be after high-priority items and all items of the first account", async () => {
        Array(NUMBER_OF_TX - PRIORITY_MAX_COUNT).forEach((idx) => {
          expect(
            transactionsToRetrieve[idx + PRIORITY_MAX_COUNT + NUMBER_OF_TX]
              .transaction.hash
          ).toBe(hashesForSecondAccount[idx + PRIORITY_MAX_COUNT])
        })
      })
    })
  })
})
