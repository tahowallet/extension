import { describe, expect, it } from "bun:test"
import {
  advertisedBlockRangeLimit,
  isBlockRangeLimitError,
  suggestedBlockRange,
} from "../log-query-errors"

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
