import sinon from "sinon"
import { ETHEREUM } from "../../../constants"
import { createTransactionRequest } from "../../../tests/factories"
import ChainService from "../../chain"
import simulateSignatureRequest from "../simulation"

const TRANSFER_LOG = {
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  topics: [
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    "0x000000000000000000000000208e94d5661a73360d9387d3ca169e5c130090cd",
    "0x0000000000000000000000009eef87f4c08d8934cb2a3309df4dec5635338115",
  ],
  data: "0x00000000000000000000000000000000000000000000000000000000000f4240",
}

describe("simulateSignatureRequest", () => {
  const sandbox = sinon.createSandbox()

  const makeChainService = ({
    supported = true,
    send,
  }: {
    supported?: boolean
    send?: sinon.SinonStub
  }) => {
    const sendStub = send ?? sandbox.stub()
    const chainService = {
      providerForNetwork: () => ({
        supportsEthSimulateV1: async () => supported,
      }),
      send: sendStub,
    } as unknown as ChainService
    return { chainService, sendStub }
  }

  const request = {
    ...createTransactionRequest({
      to: "0x9eef87f4c08d8934cb2a3309df4dec5635338115",
      input: "0xa9059cbb",
      value: 10n,
      gasLimit: 21_000n,
    }),
  }

  afterEach(() => sandbox.restore())

  it("returns logs in EVMLog shape for a successful simulation", async () => {
    const { chainService, sendStub } = makeChainService({
      send: sandbox
        .stub()
        .resolves([{ calls: [{ status: "0x1", logs: [TRANSFER_LOG] }] }]),
    })

    const result = await simulateSignatureRequest(
      chainService,
      ETHEREUM,
      request,
    )

    expect(result).toEqual({
      status: "success",
      logs: [
        {
          contractAddress: TRANSFER_LOG.address,
          topics: TRANSFER_LOG.topics,
          data: TRANSFER_LOG.data,
        },
      ],
    })

    const [method, [payload, block]] = sendStub.firstCall.args
    expect(method).toBe("eth_simulateV1")
    expect(block).toBe("latest")
    expect(payload.blockStateCalls[0].calls[0]).toEqual({
      from: request.from,
      to: request.to,
      data: "0xa9059cbb",
      value: "0xa",
    })
  })

  it("treats a successful call without logs as an empty transfer list", async () => {
    const { chainService } = makeChainService({
      send: sandbox.stub().resolves([{ calls: [{ status: "0x1" }] }]),
    })

    expect(
      await simulateSignatureRequest(chainService, ETHEREUM, request),
    ).toEqual({ status: "success", logs: [] })
  })

  it("reports a revert with the provider's reason", async () => {
    const { chainService } = makeChainService({
      send: sandbox.stub().resolves([
        {
          calls: [
            {
              status: "0x0",
              error: {
                code: 3,
                message: "execution reverted: insufficient balance",
              },
            },
          ],
        },
      ]),
    })

    expect(
      await simulateSignatureRequest(chainService, ETHEREUM, request),
    ).toEqual({
      status: "reverted",
      revertReason: "execution reverted: insufficient balance",
    })
  })

  it("does not call eth_simulateV1 when the provider lacks support", async () => {
    const { chainService, sendStub } = makeChainService({ supported: false })

    expect(
      await simulateSignatureRequest(chainService, ETHEREUM, request),
    ).toBeUndefined()
    expect(sendStub.called).toBe(false)
  })

  it("returns undefined when the call errors or the response is malformed", async () => {
    const { chainService: erroring } = makeChainService({
      send: sandbox.stub().rejects(new Error("boom")),
    })
    const { chainService: malformed } = makeChainService({
      send: sandbox.stub().resolves([]),
    })

    expect(
      await simulateSignatureRequest(erroring, ETHEREUM, request),
    ).toBeUndefined()
    expect(
      await simulateSignatureRequest(malformed, ETHEREUM, request),
    ).toBeUndefined()
  })
})
