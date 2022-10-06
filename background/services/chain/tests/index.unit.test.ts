import sinon from "sinon"
import ChainService from ".."
import { ETHEREUM, MINUTE, OPTIMISM, POLYGON } from "../../../constants"
import { EVMNetwork } from "../../../networks"
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
  handleRecentAssetTransferAlarm: (forceUpdate: boolean) => Promise<void>
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
  })

  describe("populatePartialTransactionRequest", () => {
    beforeEach(async () => {
      await chainService.startService()
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

    it("should query recent transfers if the NETWORK_POLLING_TIMEOUT has been exceeded", async () => {
      // Set last activity time to 10 minutes ago
      ;(
        chainService as unknown as ChainServiceExternalized
      ).lastUserActivityOnNetwork[ETHEREUM.chainID] = Date.now() - 10 * MINUTE
      const handleRecentAssetTransferAlarmStub = sandbox
        .stub(
          chainService as unknown as ChainServiceExternalized,
          "handleRecentAssetTransferAlarm"
        )
        .callsFake(async () => {})

      await chainService.markNetworkActivity(ETHEREUM.chainID)
      expect(handleRecentAssetTransferAlarmStub.called).toEqual(true)
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
          "activateNetworkOrThrow"
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

      await chainService.getActiveNetworks()

      expect(activeNetworksMock).toEqual([ETHEREUM, POLYGON])
    })
  })
})
