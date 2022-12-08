import sinon from "sinon"
import TransactionRetrieveQueueService, {
  QueuedTxToRetrieve,
} from "../transaction-retrieve-queue.service"
import {
  createTransactionRetrieveQueueService,
  createTransactionsToRetrieve,
} from "../../../tests/factories"
import { SECOND } from "../../../constants"

type TransactionRetrieveQueueServiceExternalized = Omit<
  TransactionRetrieveQueueService,
  ""
> & {
  transactionsToRetrieve: QueuedTxToRetrieve[]
  handleQueuedTransactionAlarm: () => Promise<void>
  transactionToRetrieveGranularTimer: NodeJS.Timer | undefined
}

describe("TransactionRetrieveQueueService", () => {
  const sandbox = sinon.createSandbox()
  let transactionRetrieveQueueService: TransactionRetrieveQueueService
  beforeEach(async () => {
    sandbox.restore()

    transactionRetrieveQueueService =
      await createTransactionRetrieveQueueService()
  })
  describe("handleQueuedTransactionAlarm", () => {
    let clock: sinon.SinonFakeTimers
    let setIntervalSpy: sinon.SinonSpy
    let queueExternalized: TransactionRetrieveQueueServiceExternalized
    let emitStub: sinon.SinonStub
    beforeEach(() => {
      clock = sinon.useFakeTimers()

      setIntervalSpy = sinon.spy(global, "setInterval")

      queueExternalized =
        transactionRetrieveQueueService as unknown as TransactionRetrieveQueueServiceExternalized

      emitStub = sinon.stub(queueExternalized.emitter, "emit")
    })
    afterEach(() => {
      clock.restore()
    })
    it("should not start the granular timer if the queue is empty", () => {
      queueExternalized.handleQueuedTransactionAlarm()

      clock.tick(2 * SECOND)

      expect(setIntervalSpy.calledOnce).toBe(false)
      expect(emitStub.callCount).toBe(0)
      expect(queueExternalized.transactionsToRetrieve.length).toBe(0)
    })
    it("should not recreate the timer when the alarm fires periodically", () => {
      const clearIntervalSpy = sinon.spy(global, "clearInterval")

      queueExternalized.transactionsToRetrieve =
        createTransactionsToRetrieve(100)

      queueExternalized.handleQueuedTransactionAlarm()
      clock.tick(60 * SECOND)
      queueExternalized.handleQueuedTransactionAlarm()
      clock.tick(60 * SECOND)
      queueExternalized.handleQueuedTransactionAlarm()
      clock.tick(60 * SECOND)

      expect(setIntervalSpy.calledOnce).toBe(true)
      expect(clearIntervalSpy.calledOnce).toBe(false)
    })
    it("should retrieve 1 tx every 2 seconds, remove the tx from the queue and call the retrieve function", async () => {
      const txInQueueCount = 100
      const txRetrievedCount = 98

      queueExternalized.transactionsToRetrieve =
        createTransactionsToRetrieve(txInQueueCount)

      queueExternalized.handleQueuedTransactionAlarm()

      clock.tick(txRetrievedCount * 2 * SECOND)

      expect(emitStub.callCount).toBe(txRetrievedCount)
      expect(queueExternalized.transactionsToRetrieve.length).toBe(
        txInQueueCount - txRetrievedCount
      )
    })
    it("should clean up the timer after the queue is emptied", async () => {
      const clearIntervalSpy = sinon.spy(global, "clearInterval")
      const numberOfTxInQueue = 100

      queueExternalized.transactionsToRetrieve =
        createTransactionsToRetrieve(numberOfTxInQueue)

      queueExternalized.handleQueuedTransactionAlarm()

      clock.tick(numberOfTxInQueue * 2 * SECOND)

      expect(setIntervalSpy.calledOnce).toBe(true)
      expect(emitStub.callCount).toBe(numberOfTxInQueue)
      expect(queueExternalized.transactionsToRetrieve.length).toBe(0)

      // the clean up happens on the next tick
      clock.tick(2 * SECOND)

      expect(clearIntervalSpy.calledOnce).toBe(true)
      expect(queueExternalized.transactionToRetrieveGranularTimer).toBe(
        undefined
      )
    })
  })
})
