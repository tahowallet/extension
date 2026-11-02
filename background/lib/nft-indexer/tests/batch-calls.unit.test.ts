import { ethers } from "ethers"
import { MULTICALL_ABI, MULTICALL_CONTRACT_ADDRESS } from "../../multicall"
import {
  batchCalls,
  CALLS_PER_MULTICALL,
  CallProvider,
  forgetMulticallDeployments,
} from "../batch-calls"

const MULTICALL = new ethers.utils.Interface(MULTICALL_ABI)
const TARGET = "0x4444444444444444444444444444444444444444"

const revert = () =>
  Object.assign(new Error("execution reverted"), {
    code: ethers.errors.CALL_EXCEPTION,
  })

const calls = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    target: TARGET,
    callData: ethers.utils.hexZeroPad(ethers.utils.hexlify(index), 4),
  }))

function stubProvider({
  code,
  chainID = "1",
}: {
  code: string
  chainID?: string
}) {
  const getCode = jest.fn(async () => code)
  const call = jest.fn(async ({ to, data }: { to: string; data: string }) => {
    if (to !== MULTICALL_CONTRACT_ADDRESS) {
      if (data === "0x00000001") throw revert()
      if (data === "0x00000002") throw new Error("NETWORK_ERROR")
      return `${data}ff`
    }
    const [inner] = MULTICALL.decodeFunctionData(
      "aggregate3",
      data,
    ) as unknown as [[string, boolean, string][]]
    return MULTICALL.encodeFunctionResult("aggregate3", [
      inner.map(([, , callData]) => [
        callData !== "0x00000001",
        `${callData}ee`,
      ]),
    ])
  })
  const provider: CallProvider = { chainID, getCode, call }
  return { provider, getCode, call }
}

describe("batchCalls", () => {
  afterEach(() => forgetMulticallDeployments())

  it("goes through Multicall3 where it is deployed, in chunks", async () => {
    const { provider, call } = stubProvider({ code: "0x6080" })

    const results = await batchCalls(provider, calls(CALLS_PER_MULTICALL + 1))

    expect(call).toHaveBeenCalledTimes(2)
    expect(results).toHaveLength(CALLS_PER_MULTICALL + 1)
    expect(results[0]).toEqual({ success: true, returnData: "0x00000000ee" })
    expect(results[1]?.success).toBe(false)
  })

  it("checks for Multicall3 once per chain", async () => {
    const { provider, getCode } = stubProvider({ code: "0x6080" })

    await batchCalls(provider, calls(1))
    await batchCalls(provider, calls(1))
    await batchCalls({ ...provider, chainID: "10" }, calls(1))

    expect(getCode).toHaveBeenCalledTimes(2)
    expect(getCode).toHaveBeenCalledWith(MULTICALL_CONTRACT_ADDRESS)
  })

  it("sends separate calls where Multicall3 isn't deployed", async () => {
    const { provider, call } = stubProvider({ code: "0x" })

    const results = await batchCalls(provider, calls(3))

    expect(call).toHaveBeenCalledTimes(3)
    expect(results).toEqual([
      { success: true, returnData: "0x00000000ff" },
      // A revert is an answer...
      { success: false, returnData: "0x" },
      // ...a failed request isn't.
      undefined,
    ])
  })

  it("sends a chunk one by one when Multicall3 fails it", async () => {
    const { provider, call } = stubProvider({ code: "0x6080" })
    call.mockRejectedValueOnce(new Error("out of gas"))

    const results = await batchCalls(provider, calls(1))

    expect(results).toEqual([{ success: true, returnData: "0x00000000ff" }])
  })

  it("asks again after a failed check", async () => {
    const { provider, getCode, call } = stubProvider({ code: "0x6080" })
    getCode.mockRejectedValueOnce(new Error("NETWORK_ERROR"))

    await batchCalls(provider, calls(1))
    await batchCalls(provider, calls(1))

    expect(getCode).toHaveBeenCalledTimes(2)
    expect(call.mock.calls.at(-1)?.[0].to).toBe(MULTICALL_CONTRACT_ADDRESS)
  })
})
