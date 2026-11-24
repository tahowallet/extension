import { JsonRpcProvider } from "@ethersproject/providers"
import * as sinon from "sinon"
import { ETHEREUM } from "../../../constants"
import SerialFallbackProvider, {
  HistoricalStateUnavailableError,
} from "../serial-fallback-provider"

const sandbox = sinon.createSandbox()

const CALL = { to: "0x0000000000000000000000000000000000000001", data: "0x" }

/** An endpoint's transport whose eth_call answers with `answer`. */
function transport(answer: () => Promise<string>) {
  const provider = new JsonRpcProvider("fake-rpc-url")
  const send = sandbox.stub(provider, "send").callsFake(async (method) => {
    if (method === "eth_call") return answer()
    // Anything else, such as the chain id check, just needs an answer.
    return "0x1"
  })
  return { provider, send }
}

const prunedError = () =>
  Promise.reject(
    new Error("missing trie node 0xabc (path ) state is not available"),
  )

const callsTo = (send: sinon.SinonStub) =>
  send.args.filter(([method]) => method === "eth_call").length

describe("SerialFallbackProvider.historicalCall", () => {
  afterEach(() => {
    sandbox.restore()
  })

  it("asks the next endpoint when one doesn't keep old state, and remembers the one that did", async () => {
    const recent = transport(prunedError)
    const archive = transport(async () => "0xarchive")
    const provider = new SerialFallbackProvider(ETHEREUM.chainID, [
      { kind: "managed", createTransport: () => recent.provider },
      { kind: "standard", createTransport: () => archive.provider },
    ])

    await expect(provider.historicalCall(CALL, 100)).resolves.toBe("0xarchive")
    expect(callsTo(recent.send)).toBe(1)

    // The endpoint with the state is asked first next time.
    await expect(provider.historicalCall(CALL, 50)).resolves.toBe("0xarchive")
    expect(callsTo(recent.send)).toBe(1)
    expect(callsTo(archive.send)).toBe(2)
  })

  it("says the state is unavailable only when every endpoint says so", async () => {
    const first = transport(prunedError)
    const second = transport(prunedError)
    const provider = new SerialFallbackProvider(ETHEREUM.chainID, [
      { kind: "managed", createTransport: () => first.provider },
      { kind: "standard", createTransport: () => second.provider },
    ])

    const error = await provider.historicalCall(CALL, 100).catch((e) => e)
    expect(error).toBeInstanceOf(HistoricalStateUnavailableError)
    expect((error as HistoricalStateUnavailableError).endpoints).toHaveLength(2)
  })

  it("treats any other failure as worth retrying, not as missing state", async () => {
    const pruned = transport(prunedError)
    const limited = transport(() =>
      Promise.reject(new Error("Too Many Requests")),
    )
    const provider = new SerialFallbackProvider(ETHEREUM.chainID, [
      { kind: "managed", createTransport: () => pruned.provider },
      { kind: "standard", createTransport: () => limited.provider },
    ])

    const error = await provider.historicalCall(CALL, 100).catch((e) => e)
    expect(error).not.toBeInstanceOf(HistoricalStateUnavailableError)
    expect(String(error)).toContain("Too Many Requests")
  })
})
