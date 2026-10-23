import * as sinon from "sinon"
import { utils } from "ethers"
import { ETHEREUM } from "../../../constants"
import {
  createAnyEVMBlock,
  createAnyEVMTransaction,
  createChainService,
  createIndexingService,
  createNameService,
} from "../../../tests/factories"
import annotateSafeTxSignTypedDataRequest from "../safe-annotation"
import type { SafeTypedDataTransaction } from "../safe"
import resolveTransactionAnnotation, {
  annotationsFromLogs,
} from "../transactions"
import { encodeExecTransaction } from "../safe"

const SAFE = "0x1111111111111111111111111111111111111111"
const OWNER = "0x2222222222222222222222222222222222222222"
const RECIPIENT = "0x4444444444444444444444444444444444444444"
const ZERO = "0x0000000000000000000000000000000000000000"
const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

const SAFE_ABI = new utils.Interface([
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)",
  "function getThreshold() view returns (uint256)",
  "function getOwners() view returns (address[])",
  "function nonce() view returns (uint256)",
])

const topicFor = (address: string) => utils.hexZeroPad(address, 32)

// What eth_simulateV1's traceTransfers emits for 1 ETH leaving the Safe.
const NATIVE_TRANSFER_LOG = {
  contractAddress: NATIVE,
  topics: [TRANSFER_TOPIC, topicFor(SAFE), topicFor(RECIPIENT)],
  data: utils.hexZeroPad(utils.hexlify(10n ** 18n), 32),
}

const safeTx = (nonce: bigint, chainID?: string): SafeTypedDataTransaction => ({
  safeAddress: SAFE,
  chainID,
  nonce,
  params: {
    to: RECIPIENT,
    value: 10n ** 18n,
    data: "0x",
    operation: 0,
    safeTxGas: 0n,
    baseGas: 0n,
    gasPrice: 0n,
    gasToken: ZERO,
    refundReceiver: ZERO,
  },
})

describe("Safe transaction enrichment", () => {
  const sandbox = sinon.createSandbox()

  const setUp = async () => {
    const chainService = await createChainService()
    const [indexingService, nameService] = await Promise.all([
      createIndexingService({ chainService: Promise.resolve(chainService) }),
      createNameService({ chainService: Promise.resolve(chainService) }),
    ])
    // Address enrichment touches the network; keep it local.
    sandbox.stub(chainService, "getAccountsToTrack").resolves([])
    sandbox
      .stub(chainService, "getLatestBaseAccountBalance")
      .callsFake(async ({ address, network }) => ({
        address,
        network,
        assetAmount: { asset: network.baseAsset, amount: 0n },
        dataSource: "local",
        retrievedAt: Date.now(),
      }))
    sandbox.stub(nameService, "lookUpName").resolves(undefined)
    return { chainService, indexingService, nameService }
  }

  afterEach(() => sandbox.restore())

  describe("annotationsFromLogs", () => {
    it("maps simulated native transfers to the base asset for extra addresses", async () => {
      const { chainService, indexingService, nameService } = await setUp()
      sandbox
        .stub(chainService, "providerForNetworkOrThrow")
        .returns({ getCode: async () => "0x" } as never)

      const withoutSafe = await annotationsFromLogs(
        chainService,
        indexingService,
        nameService,
        [NATIVE_TRANSFER_LOG],
        ETHEREUM,
        2,
        Date.now(),
        undefined,
      )
      const withSafe = await annotationsFromLogs(
        chainService,
        indexingService,
        nameService,
        [NATIVE_TRANSFER_LOG],
        ETHEREUM,
        2,
        Date.now(),
        undefined,
        { additionalRelevantAddresses: [SAFE] },
      )

      expect(withoutSafe).toEqual([])
      expect(withSafe).toHaveLength(1)
      expect(withSafe[0]).toMatchObject({
        type: "asset-transfer",
        assetAmount: { asset: ETHEREUM.baseAsset, amount: 10n ** 18n },
        sender: { address: utils.getAddress(SAFE) },
      })
    })
  })

  describe("annotationsFromLogs with untracked tokens", () => {
    const TOKEN = "0x5555555555555555555555555555555555555555"
    const tokenTransferLog = {
      contractAddress: TOKEN,
      topics: [TRANSFER_TOPIC, topicFor(SAFE), topicFor(RECIPIENT)],
      data: utils.hexZeroPad(utils.hexlify(42n), 32),
    }

    it("looks up untracked tokens only when asked, and flags them", async () => {
      const { chainService, indexingService, nameService } = await setUp()
      sandbox
        .stub(chainService, "providerForNetworkOrThrow")
        .returns({ getCode: async () => "0x" } as never)
      const getTokenMetadata = sandbox
        .stub(chainService.assetData, "getTokenMetadata")
        .resolves({
          contractAddress: TOKEN,
          homeNetwork: ETHEREUM,
          symbol: "MYST",
          name: "Mystery",
          decimals: 0,
        })

      const annotate = (resolveUntrackedAssets: boolean) =>
        annotationsFromLogs(
          chainService,
          indexingService,
          nameService,
          [tokenTransferLog],
          ETHEREUM,
          2,
          Date.now(),
          undefined,
          { additionalRelevantAddresses: [SAFE], resolveUntrackedAssets },
        )

      expect(await annotate(false)).toEqual([])
      expect(getTokenMetadata.called).toBe(false)

      const resolved = await annotate(true)
      expect(resolved).toHaveLength(1)
      expect(resolved[0]).toMatchObject({
        type: "asset-transfer",
        untrackedAsset: true,
        assetAmount: { asset: { symbol: "MYST" }, amount: 42n },
      })
    })

    it("skips a token whose metadata can't be read", async () => {
      const { chainService, indexingService, nameService } = await setUp()
      sandbox
        .stub(chainService, "providerForNetworkOrThrow")
        .returns({ getCode: async () => "0x" } as never)
      sandbox
        .stub(chainService.assetData, "getTokenMetadata")
        .rejects(new Error("not a token"))

      expect(
        await annotationsFromLogs(
          chainService,
          indexingService,
          nameService,
          [tokenTransferLog],
          ETHEREUM,
          2,
          Date.now(),
          undefined,
          { additionalRelevantAddresses: [SAFE], resolveUntrackedAssets: true },
        ),
      ).toEqual([])
    })
  })

  describe("resolveTransactionAnnotation for a mined Safe execution", () => {
    const TOKEN = "0x5555555555555555555555555555555555555555"
    // Checksummed, as stored transactions carry it.
    const CHECKSUMMED_SAFE = utils.getAddress(SAFE)
    const tokenTransferLog = {
      contractAddress: TOKEN,
      topics: [TRANSFER_TOPIC, topicFor(SAFE), topicFor(RECIPIENT)],
      data: utils.hexZeroPad(utils.hexlify(42n), 32),
    }
    const minedTransaction = (input: string, to: string) =>
      ({
        ...createAnyEVMTransaction({
          network: ETHEREUM,
          from: OWNER,
          to,
          input,
        }),
        gasUsed: 100_000n,
        status: 1,
        logs: [tokenTransferLog],
      }) as Parameters<typeof resolveTransactionAnnotation>[4]

    const stubMinedLookups = (services: Awaited<ReturnType<typeof setUp>>) => {
      sandbox
        .stub(services.chainService, "providerForNetworkOrThrow")
        .returns({ getCode: async () => "0x" } as never)
      sandbox
        .stub(services.chainService, "getBlockData")
        .resolves(createAnyEVMBlock())
      return sandbox
        .stub(services.chainService.assetData, "getTokenMetadata")
        .resolves({
          contractAddress: TOKEN,
          homeNetwork: ETHEREUM,
          symbol: "MYST",
          name: "Mystery",
          decimals: 0,
        })
    }

    it("includes the Safe's transfers, untracked tokens and all", async () => {
      const services = await setUp()
      stubMinedLookups(services)

      const annotation = await resolveTransactionAnnotation(
        services.chainService,
        services.indexingService,
        services.nameService,
        ETHEREUM,
        minedTransaction(
          encodeExecTransaction(safeTx(0n).params, "0x"),
          CHECKSUMMED_SAFE,
        ),
        2,
      )

      expect(annotation.subannotations).toEqual([
        expect.objectContaining({
          type: "asset-transfer",
          untrackedAsset: true,
          assetAmount: expect.objectContaining({
            asset: expect.objectContaining({ symbol: "MYST" }),
            amount: 42n,
          }),
        }),
      ])
    })

    it("leaves other mined transactions to tracked tokens and accounts", async () => {
      const services = await setUp()
      const getTokenMetadata = stubMinedLookups(services)

      const annotation = await resolveTransactionAnnotation(
        services.chainService,
        services.indexingService,
        services.nameService,
        ETHEREUM,
        minedTransaction("0xa9059cbb", CHECKSUMMED_SAFE),
        2,
      )

      expect(annotation.subannotations).toBeUndefined()
      expect(getTokenMetadata.called).toBe(false)
    })
  })

  describe("annotateSafeTxSignTypedDataRequest", () => {
    const stubSafeRpc = (
      chainService: Awaited<ReturnType<typeof createChainService>>,
      simulateV1Result: unknown,
      { nonce = 5 } = {},
    ) => {
      sandbox
        .stub(chainService, "providerForNetwork")
        .returns({ supportsEthSimulateV1: async () => true } as never)
      sandbox
        .stub(chainService, "providerForNetworkOrThrow")
        .returns({ getCode: async () => "0x" } as never)
      const send = sandbox
        .stub(chainService, "send")
        .callsFake(async (method: string, params: unknown[]) => {
          if (method === "eth_simulateV1") return simulateV1Result
          if (method === "eth_getStorageAt") {
            return utils.hexZeroPad(
              utils.hexlify(Number(params[1]) === 4 ? 2 : 0),
              32,
            )
          }
          const { data } = params[0] as { data: string }
          const { name } = SAFE_ABI.parseTransaction({ data })
          if (name === "getThreshold") {
            return SAFE_ABI.encodeFunctionResult(name, [2])
          }
          if (name === "getOwners") {
            return SAFE_ABI.encodeFunctionResult(name, [[OWNER]])
          }
          return SAFE_ABI.encodeFunctionResult("nonce", [nonce])
        })
      return send
    }

    it("shows the Safe's simulated balance changes", async () => {
      const services = await setUp()
      stubSafeRpc(services.chainService, [
        {
          calls: [
            {
              status: "0x1",
              returnData: SAFE_ABI.encodeFunctionResult("execTransaction", [
                true,
              ]),
              logs: [
                {
                  address: NATIVE,
                  topics: NATIVE_TRANSFER_LOG.topics,
                  data: NATIVE_TRANSFER_LOG.data,
                },
              ],
            },
          ],
        },
      ])

      const annotation = await annotateSafeTxSignTypedDataRequest(
        services.chainService,
        services.indexingService,
        services.nameService,
        ETHEREUM,
        safeTx(5n, ETHEREUM.chainID),
        OWNER,
      )

      expect(annotation).toEqual({
        type: "safe-transaction",
        safeAddress: SAFE,
        simulation: {
          status: "success",
          balanceChanges: [
            expect.objectContaining({
              direction: "out",
              assetSymbol: ETHEREUM.baseAsset.symbol,
            }),
          ],
        },
      })
    })

    it("reports a revert and how many transactions are queued first", async () => {
      const services = await setUp()
      stubSafeRpc(
        services.chainService,
        [
          {
            calls: [
              {
                status: "0x0",
                error: { code: 3, message: "execution reverted: GS013" },
              },
            ],
          },
        ],
        { nonce: 3 },
      )

      const annotation = await annotateSafeTxSignTypedDataRequest(
        services.chainService,
        services.indexingService,
        services.nameService,
        ETHEREUM,
        safeTx(5n),
        OWNER,
      )

      expect(annotation).toEqual({
        type: "safe-transaction",
        safeAddress: SAFE,
        queuedBefore: 2,
        simulation: {
          status: "reverted",
          revertReason: "A call in this Safe transaction reverts (GS013)",
          balanceChanges: [],
        },
      })
    })

    it("flags a nonce that has already been used", async () => {
      const services = await setUp()
      stubSafeRpc(
        services.chainService,
        [{ calls: [{ status: "0x1", returnData: "0x", logs: [] }] }],
        { nonce: 9 },
      )

      const annotation = await annotateSafeTxSignTypedDataRequest(
        services.chainService,
        services.indexingService,
        services.nameService,
        ETHEREUM,
        safeTx(5n),
        OWNER,
      )

      expect(annotation.nonceAlreadyUsed).toBe(true)
    })

    it("skips simulation for a Safe on another chain", async () => {
      const services = await setUp()
      const send = stubSafeRpc(services.chainService, [])

      const annotation = await annotateSafeTxSignTypedDataRequest(
        services.chainService,
        services.indexingService,
        services.nameService,
        ETHEREUM,
        safeTx(5n, "10"),
        OWNER,
      )

      expect(annotation).toEqual({
        type: "safe-transaction",
        safeAddress: SAFE,
      })
      expect(send.called).toBe(false)
    })
  })
})
