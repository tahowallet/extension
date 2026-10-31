import * as sinon from "sinon"
import { utils } from "ethers"
import { ETHEREUM } from "../../../constants"
import type { EIP712TypedData } from "../../../types"
import type ChainService from "../../chain"
import {
  SAFE_EXEC_TRANSACTION_SELECTOR,
  type SafeTransactionParams,
  buildPreValidatedSignature,
  encodeExecTransaction,
  findThresholdSlot,
  interpretSafeExecution,
  isSafeExecTransactionCalldata,
  parseSafeTxTypedData,
  simulatePendingSafeTransaction,
} from "../safe"

const SAFE = "0x1111111111111111111111111111111111111111"
const OWNER_A = "0x2222222222222222222222222222222222222222"
const OWNER_B = "0x3333333333333333333333333333333333333333"
const TARGET = "0x4444444444444444444444444444444444444444"
const ZERO = "0x0000000000000000000000000000000000000000"

const SAFE_ABI = new utils.Interface([
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)",
  "function getThreshold() view returns (uint256)",
  "function getOwners() view returns (address[])",
  "function nonce() view returns (uint256)",
])

const params: SafeTransactionParams = {
  to: TARGET,
  value: 0n,
  data: "0xa9059cbb",
  operation: 0,
  safeTxGas: 0n,
  baseGas: 0n,
  gasPrice: 0n,
  gasToken: ZERO,
  refundReceiver: ZERO,
}

const slot = (n: number) => utils.hexZeroPad(utils.hexlify(n), 32)
const word = (n: number) => utils.hexZeroPad(utils.hexlify(n), 32)

const safeTxTypedData = (
  overrides: Partial<EIP712TypedData> = {},
  message: Record<string, unknown> = {},
): EIP712TypedData => ({
  primaryType: "SafeTx",
  domain: { chainId: 1, verifyingContract: SAFE },
  types: {},
  message: {
    to: TARGET,
    value: "1000",
    data: "0xa9059cbb",
    operation: 0,
    safeTxGas: "0",
    baseGas: "0",
    gasPrice: "0",
    gasToken: ZERO,
    refundReceiver: ZERO,
    nonce: 7,
    ...message,
  },
  ...overrides,
})

describe("Safe transactions", () => {
  const sandbox = sinon.createSandbox()
  afterEach(() => sandbox.restore())

  describe("parseSafeTxTypedData", () => {
    it("extracts the Safe transaction from a SafeTx request", () => {
      expect(parseSafeTxTypedData(safeTxTypedData())).toEqual({
        safeAddress: SAFE,
        chainID: "1",
        nonce: 7n,
        params: { ...params, value: 1000n },
      })
    })

    it("accepts pre-1.0 dataGas and a domain without a chain ID", () => {
      const parsed = parseSafeTxTypedData(
        safeTxTypedData(
          { domain: { verifyingContract: SAFE } },
          { baseGas: undefined, dataGas: "21000" },
        ),
      )
      expect(parsed?.chainID).toBeUndefined()
      expect(parsed?.params.baseGas).toBe(21000n)
    })

    it("ignores other typed data and malformed SafeTx messages", () => {
      expect(
        parseSafeTxTypedData(safeTxTypedData({ primaryType: "Permit" })),
      ).toBeUndefined()
      expect(
        parseSafeTxTypedData(safeTxTypedData({ domain: { chainId: 1 } })),
      ).toBeUndefined()
      expect(
        parseSafeTxTypedData(safeTxTypedData({}, { operation: 2 })),
      ).toBeUndefined()
      expect(
        parseSafeTxTypedData(safeTxTypedData({}, { to: "not an address" })),
      ).toBeUndefined()
    })
  })

  describe("isSafeExecTransactionCalldata", () => {
    it("recognizes execTransaction calldata only when it decodes", () => {
      const calldata = encodeExecTransaction(params, "0x")
      expect(calldata.startsWith(SAFE_EXEC_TRANSACTION_SELECTOR)).toBe(true)
      expect(isSafeExecTransactionCalldata(calldata)).toBe(true)
      expect(
        isSafeExecTransactionCalldata(`0x${calldata.slice(2).toUpperCase()}`),
      ).toBe(true)
      expect(
        isSafeExecTransactionCalldata(SAFE_EXEC_TRANSACTION_SELECTOR),
      ).toBe(false)
      expect(isSafeExecTransactionCalldata("0xa9059cbb")).toBe(false)
      expect(isSafeExecTransactionCalldata(undefined)).toBe(false)
    })
  })

  it("builds a pre-validated signature for an owner", () => {
    const signature = buildPreValidatedSignature(OWNER_A)
    expect(utils.hexDataLength(signature)).toBe(65)
    expect(utils.hexDataSlice(signature, 12, 32)).toBe(OWNER_A.toLowerCase())
    expect(utils.hexDataSlice(signature, 32, 64)).toBe(word(0))
    expect(utils.hexDataSlice(signature, 64)).toBe("0x01")
  })

  describe("findThresholdSlot", () => {
    const chainServiceWith = (
      threshold: number,
      slots: Record<number, number>,
    ) =>
      ({
        send: async (method: string, callParams: unknown[]) => {
          if (method === "eth_call") return word(threshold)
          const requested = Number(callParams[1])
          return word(slots[requested] ?? 0)
        },
      }) as unknown as ChainService

    it("prefers slot 4 even when owner count holds the same number", async () => {
      // A 2-of-2 Safe: ownerCount (slot 3) and threshold (slot 4) are both 2.
      expect(
        await findThresholdSlot(
          chainServiceWith(2, { 3: 2, 4: 2, 5: 9 }),
          ETHEREUM,
          SAFE,
        ),
      ).toBe(slot(4))
    })

    it("falls back to the other candidate slots", async () => {
      expect(
        await findThresholdSlot(
          chainServiceWith(3, { 3: 3, 4: 1 }),
          ETHEREUM,
          SAFE,
        ),
      ).toBe(slot(3))
      expect(
        await findThresholdSlot(chainServiceWith(3, {}), ETHEREUM, SAFE),
      ).toBeUndefined()
    })
  })

  describe("interpretSafeExecution", () => {
    const returning = (success: boolean) =>
      SAFE_ABI.encodeFunctionResult("execTransaction", [success])

    it("reports success with the Safe attached", () => {
      expect(
        interpretSafeExecution(
          { status: "0x1", returnData: returning(true), logs: [] },
          SAFE,
        ),
      ).toEqual({ status: "success", logs: [], safeAddress: SAFE })
    })

    it("treats a false return as a failed Safe transaction", () => {
      // With safeTxGas set, a failing inner call returns false rather than
      // reverting execTransaction.
      expect(
        interpretSafeExecution(
          { status: "0x1", returnData: returning(false), logs: [] },
          SAFE,
        ),
      ).toEqual({
        status: "reverted",
        revertReason: "A call in this Safe transaction reverts",
        safeAddress: SAFE,
      })
    })

    it("explains Safe revert codes", () => {
      expect(
        interpretSafeExecution(
          {
            status: "0x0",
            error: { code: 3, message: "execution reverted: GS026" },
          },
          SAFE,
        ),
      ).toEqual({
        status: "reverted",
        revertReason: "The signer is not an owner of this Safe (GS026)",
        safeAddress: SAFE,
      })
    })
  })

  describe("simulatePendingSafeTransaction", () => {
    const setUp = (owners: string[], { nonce = 5 } = {}) => {
      const simulateV1 = sandbox.stub().resolves([
        {
          calls: [
            {
              status: "0x1",
              returnData: SAFE_ABI.encodeFunctionResult("execTransaction", [
                true,
              ]),
              logs: [],
            },
          ],
        },
      ])
      const chainService = {
        providerForNetwork: () => ({ supportsEthSimulateV1: async () => true }),
        send: async (method: string, callParams: unknown[]) => {
          if (method === "eth_simulateV1") return simulateV1(callParams)
          if (method === "eth_getStorageAt") {
            return word(Number(callParams[1]) === 4 ? 2 : 0)
          }
          const { data } = callParams[0] as { data: string }
          const { name } = SAFE_ABI.parseTransaction({ data })
          if (name === "getThreshold") {
            return SAFE_ABI.encodeFunctionResult(name, [2])
          }
          if (name === "getOwners") {
            return SAFE_ABI.encodeFunctionResult(name, [owners])
          }
          return SAFE_ABI.encodeFunctionResult("nonce", [nonce])
        },
      } as unknown as ChainService
      return { chainService, simulateV1 }
    }

    const sentCall = (simulateV1: sinon.SinonStub) => {
      const [[payload, block]] = simulateV1.firstCall.args as [
        [
          {
            blockStateCalls: {
              stateOverrides: Record<
                string,
                { stateDiff: Record<string, string> }
              >
              calls: { from: string; to: string; input: string }[]
            }[]
          },
          string,
        ],
      ]
      const [{ stateOverrides, calls }] = payload.blockStateCalls
      return { block, stateOverrides, call: calls[0] }
    }

    it("executes as the signing owner with threshold 1 and a pre-validated signature", async () => {
      const { chainService, simulateV1 } = setUp([OWNER_A, OWNER_B])

      const { simulation, currentNonce } = await simulatePendingSafeTransaction(
        chainService,
        ETHEREUM,
        SAFE,
        params,
        OWNER_B,
      )

      expect(simulation).toEqual({
        status: "success",
        logs: [],
        safeAddress: SAFE,
      })
      expect(currentNonce).toBe(5n)

      const { block, stateOverrides, call } = sentCall(simulateV1)
      expect(block).toBe("latest")
      expect(stateOverrides).toEqual({
        [SAFE]: { stateDiff: { [slot(4)]: word(1) } },
      })
      expect(call.from).toBe(OWNER_B)
      expect(call.to).toBe(SAFE)

      const decoded = SAFE_ABI.decodeFunctionData("execTransaction", call.input)
      expect(decoded.to).toBe(utils.getAddress(TARGET))
      expect(decoded.data).toBe(params.data)
      expect(decoded.signatures).toBe(buildPreValidatedSignature(OWNER_B))
    })

    it("falls back to the first owner when the signer doesn't own the Safe", async () => {
      const { chainService, simulateV1 } = setUp([OWNER_A, OWNER_B])

      await simulatePendingSafeTransaction(
        chainService,
        ETHEREUM,
        SAFE,
        params,
        TARGET,
      )

      expect(sentCall(simulateV1).call.from).toBe(OWNER_A)
    })

    it("gives up without simulating when the Safe can't be read", async () => {
      const simulateV1 = sandbox.stub()
      const chainService = {
        providerForNetwork: () => ({ supportsEthSimulateV1: async () => true }),
        send: async (method: string) => {
          if (method === "eth_simulateV1") return simulateV1()
          throw new Error("not a Safe")
        },
      } as unknown as ChainService

      expect(
        await simulatePendingSafeTransaction(
          chainService,
          ETHEREUM,
          SAFE,
          params,
          OWNER_A,
        ),
      ).toEqual({ simulation: undefined, currentNonce: undefined })
      expect(simulateV1.called).toBe(false)
    })
  })
})
