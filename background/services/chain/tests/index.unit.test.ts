import sinon from "sinon"
import ChainService from ".."
import { ETHEREUM, MINUTE, OPTIMISM, POLYGON } from "../../../constants"
import * as gas from "../../../lib/gas"
import { createBlockPrices, createChainService } from "../../../tests/factories"
import { UNIXTime } from "../../../types"
import {
  EnrichedEIP1559TransactionSignatureRequest,
  EnrichedLegacyTransactionSignatureRequest,
} from "../../enrichment"

type ChainServiceExternalized = Omit<ChainService, ""> & {
  populatePartialEIP1559TransactionRequest: () => void
  populatePartialLegacyEVMTransactionRequest: () => void
  lastUserActivityOnNetwork: {
    [chainID: string]: UNIXTime
  }
}

describe("Chain Service", () => {
  const sandbox = sinon.createSandbox()
  let chainService: ChainService
  beforeEach(async () => {
    sandbox.restore()
    chainService = await createChainService()
    await chainService.startService()
  })

  describe("populatePartialTransactionRequest", () => {
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
    it("should correctly update lastUserActivityOnNetwork", () => {
      const lastUserActivity = (
        chainService as unknown as ChainServiceExternalized
      ).lastUserActivityOnNetwork[ETHEREUM.chainID]
      chainService.markNetworkActivity(ETHEREUM.chainID)
      expect(lastUserActivity).toBeLessThan(
        (chainService as unknown as ChainServiceExternalized)
          .lastUserActivityOnNetwork[ETHEREUM.chainID]
      )
    })

    it("should get block prices if the NETWORK_POLLING_TIMEOUT has been exceeded", () => {
      const T_PLUS_TEN = Date.now() + 10 * MINUTE
      const dateStub = sandbox.stub(Date, "now")
      // Fake 10 minutes into the future
      dateStub.onCall(1).returns(T_PLUS_TEN)
      // Then, return the real date so we don't skip polling inside of pollBlockPricesForNetwork
      dateStub.onCall(2).returns(Date.now())
      const getBlockPricesStub = sandbox
        .stub(gas, "default")
        .callsFake(async () => createBlockPrices())

      chainService.markNetworkActivity(ETHEREUM.chainID)
      expect(getBlockPricesStub.called).toEqual(true)
    })
  })
})
