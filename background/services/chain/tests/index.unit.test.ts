import sinon from "sinon"
import {
  mock,
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
  jest,
} from "bun:test"
import ChainService, {
  PriorityQueuedTxToRetrieve,
  QueuedTxToRetrieve,
} from ".."
import { ETHEREUM, MINUTE, OPTIMISM, POLYGON } from "../../../constants"
import { EVMNetwork } from "../../../networks"

const getBlockPricesMock = mock(() => {})
mock.module("../../../lib/gas", () => {
  const actual = require("../../../lib/gas")
  return { ...actual, default: getBlockPricesMock }
})
import {
  createAddressOnNetwork,
  createArrayWith0xHash,
  createBlockPrices,
  createChainService,
} from "../../../tests/factories"
import type { UNIXTime } from "../../../types"
import {
  EnrichedEIP1559TransactionSignatureRequest,
  EnrichedLegacyTransactionSignatureRequest,
} from "../../enrichment"
import type { AddressOnNetwork } from "../../../accounts"
import type { ChainDatabase } from "../db"

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
    incomingOnly: boolean,
  ) => Promise<void>
  loadHistoricAssetTransfers: (
    addressNetwork: AddressOnNetwork,
  ) => Promise<void>
  loadAssetTransfers: (
    addressNetwork: AddressOnNetwork,
    startBlock: bigint,
    endBlock: bigint,
    incomingOnly?: boolean,
  ) => Promise<void>
  db: ChainDatabase & {
    getOldestAccountAssetTransferLookup: (
      addressNetwork: AddressOnNetwork,
    ) => Promise<bigint | null>
  }
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
    getBlockPricesMock.mockReset()

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
          broadcastOnSign: true,
        }

      // Population moved to the transaction submitter.
      const stub = sandbox.stub(
        (
          chainService as unknown as {
            transactionSubmitter: ChainServiceExternalized
          }
        ).transactionSubmitter,
        "populatePartialEIP1559TransactionRequest",
      )

      await chainService.populatePartialTransactionRequest(
        ETHEREUM,
        partialTransactionRequest,
        { maxFeePerGas: 100n, maxPriorityFeePerGas: 1000n },
      )

      expect(stub.callCount).toBe(1)

      await chainService.populatePartialTransactionRequest(
        POLYGON,
        { ...partialTransactionRequest, network: POLYGON },
        { maxFeePerGas: 100n, maxPriorityFeePerGas: 1000n },
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
          broadcastOnSign: true,
        }

      // Population moved to the transaction submitter.
      const stub = sandbox.stub(
        (
          chainService as unknown as {
            transactionSubmitter: ChainServiceExternalized
          }
        ).transactionSubmitter,
        "populatePartialLegacyEVMTransactionRequest",
      )

      await chainService.populatePartialTransactionRequest(
        OPTIMISM,
        partialTransactionRequest,
        { maxFeePerGas: 100n, maxPriorityFeePerGas: 1000n },
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
          .lastUserActivityOnNetwork[ETHEREUM.chainID],
      )

      jest.useRealTimers()
    })

    it("should get block prices if the NETWORK_POLLING_TIMEOUT has been exceeded", async () => {
      // Set last activity time to 10 minutes ago
      const externalized = chainService as unknown as ChainServiceExternalized
      externalized.lastUserActivityOnNetwork[ETHEREUM.chainID] =
        Date.now() - 10 * MINUTE
      getBlockPricesMock.mockImplementation(async () => createBlockPrices())

      await chainService.markNetworkActivity(ETHEREUM.chainID)
      expect(getBlockPricesMock).toHaveBeenCalled()
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

      await chainService.markAccountActivity(
        createAddressOnNetwork({ network: ETHEREUM }),
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
          "loadRecentAssetTransfers",
        )
        .callsFake(async () => {})

      await chainService.markAccountActivity(
        createAddressOnNetwork({ network: ETHEREUM }),
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
          "getNetworksToTrack",
        )
        .resolves([ETHEREUM, POLYGON])

      const resolvesWithPolygon = sinon.promise()

      sandbox
        .stub(
          chainService as unknown as ChainServiceExternalized,
          "startTrackingNetworkOrThrow",
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
              idx < PRIORITY_MAX_COUNT ? 1 : 0,
            ),
          ),
        )

        transactionsToRetrieve = chainServiceExternalized.transactionsToRetrieve
      })

      it("should add transactions to the queue", async () => {
        expect(transactionsToRetrieve.length).toBe(NUMBER_OF_TX * 2)
      })

      it(`the first ${PRIORITY_MAX_COUNT} transactions have a higher priority and should come from the first account`, async () => {
        Array(PRIORITY_MAX_COUNT).forEach((idx) => {
          expect(transactionsToRetrieve[idx].transaction.hash).toBe(
            hashesForFirstAccount[idx],
          )
        })
      })

      it(`another ${PRIORITY_MAX_COUNT} transactions have a higher priority and should come from the second account`, async () => {
        Array(PRIORITY_MAX_COUNT).forEach((idx) => {
          expect(
            transactionsToRetrieve[idx + PRIORITY_MAX_COUNT].transaction.hash,
          ).toBe(hashesForSecondAccount[idx])
        })
      })

      it("after items with higher priority in the queue should be the next transactions for the first account", async () => {
        Array(NUMBER_OF_TX - PRIORITY_MAX_COUNT).forEach((idx) => {
          expect(
            transactionsToRetrieve[idx + PRIORITY_MAX_COUNT * 2].transaction
              .hash,
          ).toBe(hashesForFirstAccount[idx + PRIORITY_MAX_COUNT])
        })
      })

      it("transactions with lower priority for the second account should be after high-priority items and all items of the first account", async () => {
        Array(NUMBER_OF_TX - PRIORITY_MAX_COUNT).forEach((idx) => {
          expect(
            transactionsToRetrieve[idx + PRIORITY_MAX_COUNT + NUMBER_OF_TX]
              .transaction.hash,
          ).toBe(hashesForSecondAccount[idx + PRIORITY_MAX_COUNT])
        })
      })
    })
  })

  describe("characterization", () => {
    const CUSTOM_CHAIN = {
      chainName: "Foo",
      chainId: "12345",
      nativeCurrency: { name: "FooCoin", symbol: "FOO", decimals: 18 },
      rpcUrls: ["https://foo.example.com"],
      blockExplorerUrl: "https://fooscanner.example.com",
    }

    beforeEach(async () => {
      sandbox
        .stub(
          chainService as unknown as ChainServiceExternalized,
          "getNetworksToTrack",
        )
        .resolves([ETHEREUM])
      getBlockPricesMock.mockImplementation(async () => createBlockPrices())
      await chainService.startService()
    })

    afterEach(async () => {
      await chainService.stopService()
    })

    // Problem 3: re-adding a chain replaces its provider while the network is
    // already tracked.
    it("polls gas on the new provider after a known chain is re-added", async () => {
      await chainService.addCustomChain(CUSTOM_CHAIN)
      chainService.markNetworkActivity(CUSTOM_CHAIN.chainId)
      const firstProvider = chainService.providerForNetwork({
        chainID: CUSTOM_CHAIN.chainId,
      } as EVMNetwork)

      await chainService.addCustomChain({
        ...CUSTOM_CHAIN,
        rpcUrls: ["https://foo-replacement.example.com"],
      })
      getBlockPricesMock.mockClear()

      await chainService.pollBlockPricesForNetwork(CUSTOM_CHAIN.chainId)

      expect(firstProvider?.isDestroyed).toBe(true)
      expect(getBlockPricesMock).toHaveBeenCalledTimes(1)
      const [, polledProvider] = getBlockPricesMock.mock.calls[0] as unknown[]
      expect(polledProvider).not.toBe(firstProvider)
      expect(polledProvider).toBe(
        chainService.providerForNetwork({
          chainID: CUSTOM_CHAIN.chainId,
        } as EVMNetwork),
      )
    })

    // Problem 4: each watched network polls gas on its own single timer.
    it("polls gas four times a minute per network with three networks watched", async () => {
      const clock = sinon.useFakeTimers({
        now: Date.now(),
        toFake: ["setTimeout", "clearTimeout"],
      })
      try {
        ;[ETHEREUM, POLYGON, OPTIMISM].forEach(({ chainID }) =>
          chainService.markNetworkActivity(chainID),
        )
        await chainService.startTrackingNetworkOrThrow(POLYGON.chainID)
        await chainService.startTrackingNetworkOrThrow(OPTIMISM.chainID)
        getBlockPricesMock.mockClear()

        await clock.tickAsync(MINUTE)

        expect(getBlockPricesMock.mock.calls.length).toBe(12)
      } finally {
        clock.restore()
      }
    })

    // Problem 5: an edit changes the network watchers report on.
    it("emits block prices with the network as it is after an edit", async () => {
      chainService.markNetworkActivity(ETHEREUM.chainID)
      const emitted: EVMNetwork[] = []
      chainService.emitter.on("blockPrices", ({ network }) => {
        emitted.push(network)
      })

      await chainService.updateNetworkSettings(
        ETHEREUM.chainID,
        await chainService.getRpcEndpointsForChain(ETHEREUM.chainID),
        "https://edited-explorer.example.com",
      )
      await chainService.pollBlockPricesForNetwork(ETHEREUM.chainID)

      expect(emitted.at(-1)?.blockExplorerURL).toEqual(
        "https://edited-explorer.example.com",
      )
    })
  })
})
