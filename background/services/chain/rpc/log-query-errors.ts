/**
 * Recognises the errors endpoints give for queries they won't serve: a log
 * range wider than they allow, and blocks older than they keep.
 */

// A block count such as 10000, 10,000 or 2K.
const COUNT = String.raw`(\d[\d,_]*(?:\.\d+)?\s?[kK]?)`

/**
 * Wordings providers use to advertise their widest range, such as Boar's
 * "try a block range of at most 10000 blocks", QuickNode's "limited to a
 * 10,000 blocks range", Alchemy's "up to a 2K block range", geth forks'
 * "exceed maximum block range: 5000" and dRPC's "ranges over 10000 blocks".
 */
const RANGE_LIMIT_PATTERNS = [
  new RegExp(String.raw`at most ${COUNT} blocks?`, "i"),
  new RegExp(String.raw`range limit (?:of |is |\(|: ?)?${COUNT}`, "i"),
  new RegExp(
    String.raw`max(?:imum)?(?: allowed)? (?:block )?range(?: allowed)?(?: is| of)?:? ?${COUNT}`,
    "i",
  ),
  new RegExp(
    String.raw`limited to (?:a )?${COUNT}(?:[- ]?blocks?)? range`,
    "i",
  ),
  new RegExp(String.raw`up to (?:a )?${COUNT}(?:[- ]?blocks?)? range`, "i"),
  new RegExp(
    String.raw`ranges? (?:over|above|greater than|exceeding|larger than) ${COUNT} blocks?`,
    "i",
  ),
  new RegExp(
    String.raw`max(?:imum)?(?: allowed)?(?: is|:) ?${COUNT} blocks?`,
    "i",
  ),
  // "block range too large, range: 100001, max: 50000"
  new RegExp(String.raw`range.*\bmax(?:imum)?: ?${COUNT}`, "i"),
]

const RANGE_COMPLAINT =
  /block range|range (?:is )?too (?:large|wide|big)|exceeds? (?:the )?(?:max(?:imum)? )?(?:block )?range|too many blocks/i

// Alchemy and Infura name a range that would work: "[0x1, 0x2710]".
const SUGGESTED_RANGE = /\[\s*(0x[0-9a-f]+)\s*,\s*(0x[0-9a-f]+)\s*\]/i

/** The text of an error and the errors it wraps, where messages hide. */
function errorText(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return String(error)
  }
  const {
    message,
    reason,
    body,
    error: inner,
  } = error as {
    message?: unknown
    reason?: unknown
    body?: unknown
    error?: unknown
  }
  return [
    message,
    reason,
    body,
    inner === undefined ? undefined : errorText(inner),
  ]
    .filter((part) => typeof part === "string")
    .join(" ")
}

function parseCount(text: string): number | undefined {
  const thousands = /k$/i.test(text)
  const value = Number(text.replace(/[\s,_kK]/g, ""))
  const count = Math.floor(thousands ? value * 1000 : value)
  return Number.isFinite(count) && count > 0 ? count : undefined
}

/** The widest block range an error says the endpoint allows, if it says. */
export function advertisedBlockRangeLimit(error: unknown): number | undefined {
  const text = errorText(error)
  const counts = RANGE_LIMIT_PATTERNS.flatMap((pattern) => {
    const count = pattern.exec(text)?.[1]
    return count === undefined ? [] : [parseCount(count)]
  }).filter((count) => count !== undefined)
  return counts.length === 0 ? undefined : Math.min(...counts)
}

/**
 * The size of a range an error suggests trying instead. These suggestions
 * depend on how many logs the request matched, so they suit only that
 * request.
 */
export function suggestedBlockRange(error: unknown): number | undefined {
  const match = SUGGESTED_RANGE.exec(errorText(error))
  if (match === null) {
    return undefined
  }
  const size = Number(BigInt(match[2]) - BigInt(match[1])) + 1
  return size > 0 ? size : undefined
}

/** Whether an error refuses a log query for its block range's width. */
export function isBlockRangeLimitError(error: unknown): boolean {
  return (
    advertisedBlockRangeLimit(error) !== undefined ||
    RANGE_COMPLAINT.test(errorText(error))
  )
}

/**
 * Thrown for a range entirely before the earliest block a chain's endpoints
 * keep, without asking them again.
 */
export class LogHistoryUnavailableError extends Error {
  constructor(
    readonly chainID: string,
    readonly earliestBlock: number,
  ) {
    super(`chain ${chainID} keeps no logs before block ${earliestBlock}`)
    this.name = "LogHistoryUnavailableError"
  }
}

/** The JSON-RPC code Boar and others use for pruned history. */
const PRUNED_HISTORY_CODE = 4444

const PRUNED_HISTORY =
  /pruned|earliest available|missing trie node|header not found|history (?:has been |is )?(?:pruned|unavailable)/i

const EARLIEST_BLOCK =
  /(?:earliest|first|oldest) available(?: block)?(?: is)?:? ?(0x[0-9a-f]+|\d+)/i

function hasCode(error: unknown, code: number): boolean {
  if (typeof error !== "object" || error === null) {
    return false
  }
  const { code: own, error: inner } = error as {
    code?: unknown
    error?: unknown
  }
  return own === code || hasCode(inner, code)
}

/**
 * Whether an error says the blocks asked for are older than the endpoint
 * keeps, as in "pruned history unavailable", "missing trie node" or "header
 * not found".
 */
export function isPrunedHistoryError(error: unknown): boolean {
  return (
    hasCode(error, PRUNED_HISTORY_CODE) || PRUNED_HISTORY.test(errorText(error))
  )
}

/** The earliest block a pruned-history error says is available, if any. */
export function earliestAvailableBlock(error: unknown): number | undefined {
  const match = EARLIEST_BLOCK.exec(errorText(error))
  if (match === null) {
    return undefined
  }
  const block = Number(match[1])
  return Number.isSafeInteger(block) && block >= 0 ? block : undefined
}
