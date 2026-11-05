import { describe, expect, it } from "bun:test"
import {
  advertisedBlockRangeLimit,
  earliestAvailableBlock,
  isBlockRangeLimitError,
  isLogQueryRefusedError,
  isLogRangeRefusal,
  isMethodNotFoundError,
  isPrunedHistoryError,
  logQueryBlockCount,
  MINIMUM_LOG_BLOCK_RANGE,
  suggestedBlockRange,
} from "../log-query-errors"

// The error dRPC's free plan returns for a 157-block log query on BSC.
const DRPC_FREE_PLAN_BODY = JSON.stringify({
  jsonrpc: "2.0",
  id: 42,
  error: {
    code: 35,
    message: "ranges over 10000 blocks are not supported on free plan",
  },
})
const DRPC_FREE_PLAN_ERROR = Object.assign(
  new Error("processing response error"),
  {
    code: "SERVER_ERROR",
    body: DRPC_FREE_PLAN_BODY,
    error: {
      code: 35,
      message: "ranges over 10000 blocks are not supported on free plan",
    },
  },
)
const DRPC_FREE_PLAN_PARAMS = [
  {
    fromBlock: "0x7dbe09a",
    toBlock: "0x7dbe136",
    topics: [
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      null,
      "0x0000000000000000000000001111111111111111111111111111111111111111",
    ],
  },
]

describe("advertisedBlockRangeLimit", () => {
  it.each<[string, string, number]>([
    [
      "Boar",
      "block range too large; try a block range of at most 10000 blocks",
      10_000,
    ],
    [
      "QuickNode",
      "eth_getLogs and eth_newFilter are limited to a 10,000 blocks range",
      10_000,
    ],
    [
      "Alchemy",
      "Log response size exceeded. You can make eth_getLogs requests with up to a 2K block range and no limit on the response size",
      2_000,
    ],
    ["BSC and Polygon nodes", "exceed maximum block range: 5000", 5_000],
    ["a max block range", "max block range 1000", 1_000],
    ["a range limit", "block range limit of 2000 exceeded", 2_000],
    [
      "a bracketed range limit",
      "query exceeds block range limit (1000)",
      1_000,
    ],
    ["Cloudflare", "Max range: 800", 800],
    ["dRPC", "ranges over 10000 blocks are not supported on freetier", 10_000],
    [
      "Sei",
      "block range too large (2001), maximum allowed is 2000 blocks",
      2_000,
    ],
    [
      "Blast",
      "eth_getLogs block range too large, range: 100001, max: 50000",
      50_000,
    ],
  ])("reads %s's wording", (_, message, expected) => {
    expect(advertisedBlockRangeLimit(new Error(message))).toBe(expected)
  })

  it("reads a limit from a wrapped JSON-RPC error", () => {
    expect(
      advertisedBlockRangeLimit({
        message: "processing response error",
        error: {
          message: "try a block range of at most 10000 blocks",
          code: -32602,
        },
      }),
    ).toBe(10_000)
  })

  it.each([
    "bad response",
    "query returned more than 10000 results",
    "execution reverted",
    "block range too wide",
  ])("finds no limit in %p", (message) => {
    expect(advertisedBlockRangeLimit(new Error(message))).toBeUndefined()
  })
})

describe("suggestedBlockRange", () => {
  it("measures the range Infura and Alchemy suggest", () => {
    expect(
      suggestedBlockRange(
        new Error(
          "query returned more than 10000 results. Try with this block range [0x1, 0x3e8].",
        ),
      ),
    ).toBe(1_000)
  })

  it("finds nothing without a suggestion", () => {
    expect(suggestedBlockRange(new Error("bad response"))).toBeUndefined()
  })
})

describe("isBlockRangeLimitError", () => {
  it.each<[string, boolean]>([
    ["block range too wide", true],
    ["Block range is too large", true],
    ["try a block range of at most 10000 blocks", true],
    ["exceed maximum block range: 5000", true],
    ["too many blocks requested", true],
    ["execution reverted", false],
    ["NETWORK_ERROR", false],
  ])("says %p refuses a range: %p", (message, expected) => {
    expect(isBlockRangeLimitError(new Error(message))).toBe(expected)
  })
})

describe("isPrunedHistoryError", () => {
  it.each<[string, unknown, boolean]>([
    [
      "Boar's code 4444",
      Object.assign(new Error("something"), { code: 4444 }),
      true,
    ],
    [
      "a wrapped code 4444",
      { message: "processing response error", error: { code: 4444 } },
      true,
    ],
    [
      "Boar's wording",
      new Error(
        "pruned history unavailable: requested 0, earliest available 105000000",
      ),
      true,
    ],
    ["geth's missing state", new Error("missing trie node abc123"), true],
    ["an old header", new Error("header not found"), true],
    ["pruned history", new Error("history has been pruned"), true],
    ["a revert", new Error("execution reverted"), false],
    ["a range refusal", new Error("block range too wide"), false],
  ])("says %s is pruned history: %p", (_, error, expected) => {
    expect(isPrunedHistoryError(error)).toBe(expected)
  })
})

describe("earliestAvailableBlock", () => {
  it.each<[string, number | undefined]>([
    [
      "pruned history unavailable: requested 0, earliest available 105000000",
      105_000_000,
    ],
    ["earliest available block: 0x64", 100],
    ["first available block is 2000", 2_000],
    ["missing trie node abc123", undefined],
  ])("reads %p as %p", (message, expected) => {
    expect(earliestAvailableBlock(new Error(message))).toBe(expected)
  })
})

describe("isLogQueryRefusedError", () => {
  it.each<[string, unknown, boolean]>([
    [
      "an address requirement",
      { code: -32701, message: "Please specify an address in your request" },
      true,
    ],
    ["a getLogs limit", { code: -32005, message: "limit exceeded" }, true],
    [
      "a request limit",
      { code: -32011, message: "request limit reached" },
      true,
    ],
    [
      "a free plan refusal",
      { code: 35, message: "eth_getLogs is not available on free plan" },
      true,
    ],
    [
      "an archive token requirement",
      { code: -32602, message: "Archive requests require a personal token" },
      true,
    ],
    [
      "an administrative block",
      new Error("forbidden by administrative rules"),
      true,
    ],
    [
      "a range limit",
      {
        code: 35,
        message: "ranges over 10000 blocks are not supported on free plan",
      },
      false,
    ],
    ["a revert", new Error("execution reverted"), false],
  ])("says %s is refused: %p", (_, error, expected) => {
    expect(isLogQueryRefusedError(error)).toBe(expected)
  })
})

describe("logQueryBlockCount", () => {
  it("counts the blocks of dRPC's refused query", () => {
    expect(logQueryBlockCount(DRPC_FREE_PLAN_PARAMS)).toBe(157)
  })

  it.each<[string, unknown[], number | undefined]>([
    ["one block", [{ fromBlock: "0x10", toBlock: "0x10" }], 1],
    ["numbers", [{ fromBlock: 100, toBlock: 199 }], 100],
    ["a tag", [{ fromBlock: "0x10", toBlock: "latest" }], undefined],
    ["a block hash", [{ blockHash: "0xabc" }], undefined],
    ["a reversed range", [{ fromBlock: "0x10", toBlock: "0x1" }], undefined],
    ["no filter", [], undefined],
  ])("reads %s as %p", (_, params, expected) => {
    expect(logQueryBlockCount(params)).toBe(expected)
  })
})

describe("isLogRangeRefusal", () => {
  it("takes dRPC's free plan refusing 157 blocks as a refusal", () => {
    expect(
      isLogRangeRefusal(
        DRPC_FREE_PLAN_ERROR,
        logQueryBlockCount(DRPC_FREE_PLAN_PARAMS),
      ),
    ).toBe(true)
    expect(
      isLogRangeRefusal({ code: 35, body: DRPC_FREE_PLAN_BODY }, 157),
    ).toBe(true)
  })

  it.each<[string, unknown, number | undefined, boolean]>([
    // Against a limit the error advertises, only queries within it are refused.
    ["at the advertised limit", DRPC_FREE_PLAN_ERROR, 10_000, true],
    ["over the advertised limit", DRPC_FREE_PLAN_ERROR, 10_001, false],
    ["with no request range", DRPC_FREE_PLAN_ERROR, undefined, false],
    // An advertised limit below the minimum is a refusal whatever the range.
    [
      "a 10-block cap",
      new Error(
        "You can make eth_getLogs requests with up to a 10 block range",
      ),
      5_000,
      true,
    ],
    [
      "a cap at the minimum",
      new Error(`exceed maximum block range: ${MINIMUM_LOG_BLOCK_RANGE * 2}`),
      5_000,
      false,
    ],
    // A complaint naming no limit is a refusal only below the minimum.
    [
      "no limit, under the minimum",
      new Error("block range too large"),
      MINIMUM_LOG_BLOCK_RANGE * 2 - 1,
      true,
    ],
    [
      "no limit, at the minimum",
      new Error("block range too large"),
      MINIMUM_LOG_BLOCK_RANGE * 2,
      false,
    ],
    [
      "no limit, no range",
      new Error("block range too large"),
      undefined,
      false,
    ],
    // Complaints that depend on the query are never refusals.
    [
      "too many results",
      new Error("query returned more than 10000 results"),
      100,
      false,
    ],
    [
      "a suggested range",
      new Error(
        "Log response size exceeded. You can make eth_getLogs requests with up to a 2K block range. Based on your parameters, this block range should work: [0x0, 0x31]",
      ),
      100,
      false,
    ],
    // Errors that aren't about ranges are never refusals.
    ["a revert", new Error("execution reverted"), 100, false],
  ])("says %s is a refusal: %p", (_, error, blockCount, expected) => {
    expect(isLogRangeRefusal(error, blockCount)).toBe(expected)
  })
})

describe("isMethodNotFoundError", () => {
  // The error Rootstock's public node returns for any log query, shaped like
  // the SERVER_ERROR Ethers raises for a JSON-RPC error.
  const rootstockError = () =>
    Object.assign(new Error("processing response error"), {
      code: "SERVER_ERROR",
      body: '{"jsonrpc":"2.0","id":42,"error":{"code":-32601,"message":"the method eth_getLogs does not exist/is not available"}}',
      error: Object.assign(
        new Error("the method eth_getLogs does not exist/is not available"),
        { code: -32601 },
      ),
    })

  it.each<[string, unknown]>([
    ["Rootstock's error", rootstockError()],
    [
      "Rootstock's body alone",
      new Error(
        'processing response error (body="{\\"jsonrpc\\":\\"2.0\\",\\"id\\":42,\\"error\\":{\\"code\\":-32601,\\"message\\":\\"the method eth_getLogs does not exist/is not available\\"}}", code=SERVER_ERROR)',
      ),
    ],
    [
      "a bare -32601",
      Object.assign(new Error("request failed"), { code: -32601 }),
    ],
    [
      "EIP-1474's -32004",
      Object.assign(new Error("request failed"), { code: -32004 }),
    ],
    ["method not found", new Error("Method not found")],
    ["method not supported", new Error("method eth_getLogs not supported")],
    ["an unsupported method", new Error("Unsupported method: eth_getLogs")],
    ["eth_getLogs not supported", new Error("eth_getLogs is not supported")],
  ])("recognises %s", (_, error) => {
    expect(isMethodNotFoundError(error)).toBe(true)
  })

  it.each<[string, unknown]>([
    // A range complaint can be met with a narrower range.
    ["dRPC's free plan", DRPC_FREE_PLAN_ERROR],
    ["a range limit", new Error("block range is too wide")],
    ["a revert", new Error("execution reverted")],
    ["an outage", new Error("NETWORK_ERROR")],
    ["an address requirement", new Error("Please specify an address")],
  ])("leaves %s alone", (_, error) => {
    expect(isMethodNotFoundError(error)).toBe(false)
  })
})
