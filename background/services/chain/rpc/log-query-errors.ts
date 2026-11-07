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

/**
 * Wordings for log queries an endpoint won't serve at any range, though
 * another endpoint may: PublicNode's "Please specify an address", BSC
 * dataseed's "limit exceeded", Base's "request limit reached", dRPC's free
 * plan, PublicNode's archive token and bloXroute's administrative rules.
 */
const LOG_QUERY_REFUSED =
  /specify an address|limit exceeded|request limit reached|not (?:available|supported) on (?:the )?free plan|archive requests require|forbidden by administrative rules/i

/**
 * The JSON-RPC codes for a method an endpoint doesn't serve: -32601, "method
 * not found", and EIP-1474's -32004, "method not supported".
 */
const METHOD_NOT_FOUND_CODES = [-32601, -32004]

/**
 * Wordings for a method an endpoint doesn't serve, such as Rootstock's "the
 * method eth_getLogs does not exist/is not available", "method not found" and
 * "method not supported". The codes in a response body that only survives as
 * text count too.
 */
const METHOD_NOT_FOUND =
  /"code"\s*:\s*-32(?:601|004)\b|method not found|does not exist\/is not available|\bmethod\b[^.]*?\b(?:does not exist|not (?:found|supported|available))|(?:unsupported|unknown) method|eth_getLogs (?:is )?(?:not supported|unsupported)/i

// Complaints about how many logs a query matched. Note that these depend on
// the query, not just its range.
const RESULTS_COMPLAINT =
  /(?:more than \d+|too many) (?:results|logs)|response (?:size|is too (?:big|large))/i

const RANGE_COMPLAINT = new RegExp(
  String.raw`block range|range (?:is )?too (?:large|wide|big)|exceeds? (?:the )?(?:max(?:imum)? )?(?:block )?range|too many blocks|${RESULTS_COMPLAINT.source}`,
  "i",
)

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
 * Whether an endpoint refuses a log query outright, for a reason another
 * endpoint may not share. A refusal that names a range limit is a range
 * error instead, since a narrower range can succeed on the same endpoint.
 */
export function isLogQueryRefusedError(error: unknown): boolean {
  return (
    !isBlockRangeLimitError(error) && LOG_QUERY_REFUSED.test(errorText(error))
  )
}

/**
 * Checks whether an error says the endpoint doesn't serve the method at all,
 * as Rootstock's public node answers `eth_getLogs` with -32601, "the method
 * eth_getLogs does not exist/is not available". Note that a range complaint
 * is never one of these, even if it says "not supported", since a narrower
 * range can succeed on the same endpoint.
 */
export function isMethodNotFoundError(error: unknown): boolean {
  return (
    !isBlockRangeLimitError(error) &&
    (METHOD_NOT_FOUND_CODES.some((code) => hasCode(error, code)) ||
      METHOD_NOT_FOUND.test(errorText(error)))
  )
}

/**
 * The smallest block range log queries are halved down to when an endpoint
 * refuses a range without saying how wide a range it allows. A range under
 * twice this many blocks is no longer split. A range complaint about so few
 * blocks means the endpoint doesn't serve the query at all, so the provider
 * moves on to another endpoint instead.
 *
 * Scans run in 5000-block passes, and halving 5000 walks 2500, 1250, 625,
 * 313, 157, which clears the 500- and 1000-block caps common among public
 * endpoints. An advertised cap under twice this, such as the 10 blocks
 * Alchemy's free tier allows, would turn each pass into hundreds of queries.
 * It would also narrow the provider's other endpoints, since learned limits
 * are shared.
 */
export const MINIMUM_LOG_BLOCK_RANGE = 100

/**
 * The narrowest range a log query is still split at. See
 * {@link MINIMUM_LOG_BLOCK_RANGE}.
 */
const SMALLEST_SPLIT_RANGE = MINIMUM_LOG_BLOCK_RANGE * 2

/**
 * Returns the number of blocks an `eth_getLogs` request's filter spans, if
 * the filter names both ends by number. Tags such as "latest", block hashes
 * and reversed ranges give `undefined`.
 */
export function logQueryBlockCount(
  params: readonly unknown[],
): number | undefined {
  const [filter] = params
  if (typeof filter !== "object" || filter === null) {
    return undefined
  }
  const { fromBlock, toBlock } = filter as {
    fromBlock?: unknown
    toBlock?: unknown
  }
  const isNumber = (block: unknown): block is string | number =>
    (typeof block === "string" && /^0x[0-9a-f]+$/i.test(block)) ||
    (typeof block === "number" && Number.isSafeInteger(block))
  if (!isNumber(fromBlock) || !isNumber(toBlock)) {
    return undefined
  }
  const count = Number(BigInt(toBlock) - BigInt(fromBlock)) + 1
  return count > 0 ? count : undefined
}

/**
 * Checks whether a range complaint about a log query of `blockCount` blocks
 * means the endpoint won't serve it at any range. It does if the query was
 * already within the limit the complaint advertises, as when dRPC's free plan
 * refuses 157 blocks for being "over 10000 blocks". It also does if the
 * advertised limit is narrower than log queries are split to (see
 * {@link MINIMUM_LOG_BLOCK_RANGE}), or if a complaint naming no limit is about
 * a range too narrow to split.
 *
 * Note that a complaint suggesting a narrower range, or about how many logs
 * the query matched, is never a refusal, since it depends on the query.
 */
export function isLogRangeRefusal(
  error: unknown,
  blockCount: number | undefined,
): boolean {
  if (
    !isBlockRangeLimitError(error) ||
    suggestedBlockRange(error) !== undefined ||
    RESULTS_COMPLAINT.test(errorText(error))
  ) {
    return false
  }
  const advertised = advertisedBlockRangeLimit(error)
  if (advertised !== undefined) {
    return (
      advertised < SMALLEST_SPLIT_RANGE ||
      (blockCount !== undefined && blockCount <= advertised)
    )
  }
  return blockCount !== undefined && blockCount < SMALLEST_SPLIT_RANGE
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

/**
 * Thrown before a log query is made if the chain's provider can't take one
 * right now, either because the network is unreachable or because its
 * endpoints are cooling down after failures. Scans that hit this should stop
 * and pick up where they left off on a later pass, rather than splitting
 * their range into more and more queries that no endpoint is going to answer.
 */
export class LogScanPausedError extends Error {
  constructor(readonly chainID: string) {
    super(`chain ${chainID} can't take log queries right now`)
    this.name = "LogScanPausedError"
  }
}

/**
 * Checks whether a log query failed because it timed out, going by either
 * Ethers' `TIMEOUT` error code or the error's message. For a wide block
 * range, a timeout usually means the query matched more logs than the
 * endpoint could gather in time, so a narrower range is likely to succeed.
 */
export function isTimeoutError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const { code } = error as { code?: unknown }
    if (code === "TIMEOUT") return true
  }
  return /time(?:d)? ?out/i.test(errorText(error))
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
