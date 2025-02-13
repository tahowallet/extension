/**
 *  Batch request issues
 *
 *  These are typically due to length or size in bytes of the payload and match
 *  errors from geth, nethermind, and ankr
 */
const BATCH_LIMIT_REGEXP =
  /batch size (is )?too large|batch size limit exceeded|batch too large/i

/**
 *  Network related issues
 *
 * - `WebSocket is already in CLOSING`:
 *   We are reconnecting
 *
 * - `TIMEOUT`:
 *   fetchJson timed out, we could retry but it's safer to just fail over
 *
 * - `NETWORK_ERROR`:
 *   Any other network error, including no-network errors
 */
const NETWORK_ERROR_REGEXP =
  /WebSocket is already in CLOSING|TIMEOUT|NETWORK_ERROR/i

/**
 *  Response errors from the remote RPC
 *
 * - `missing response`:
 *   We might be disconnected due to network instability
 *
 * - `failed response`:
 *   fetchJson default "fallback" error, generally thrown after 429s
 *
 * - `we can't execute this request`:
 *   Ankr rate limit hit / invalid response from some rpcs, generally ankr
 */
const RESPONSE_ERROR_REGEXP =
  /missing response|failed response|we can't execute this request/i

/**
 *  Invalid responses that could be retried on
 *
 * - `bad response`:
 *   Error on the endpoint provider's side
 *
 * - `bad result from backend`:
 *   Same as above, but comes from ethers trying to parse an invalid response
 */
const INVALID_RESPONSE_REGEXP = /bad response|bad result from backend/i

const RATE_LIMIT_REGEXP =
  /too many requests|call rate limit exhausted|exceeded the quota usage/i

const GAS_LIMIT_REGEXP = /out of gas/i

export type RPCErrorType =
  // Batch size too large
  | "batch-limit-exceeded"
  // Too many requests
  | "rate-limit-error"
  // Timeout and other network errors
  | "network-error"
  // Bad or missing response
  | "response-error"
  // Invalid result from RPC, can be retried
  | "invalid-response-error"
  // Request likely failed due to RPC gas limit, try on different provider
  | "eth-call-gas-error"
  // Uncaught, could be anything
  | "unknown-error"

/**
 * 
 * Attempts to identify the type of RPC error based on the error message and method used.
 *
 * This function categorizes various RPC errors such as batch size limits, network errors,
 * rate limits, invalid responses, and gas limit issues. It uses regular expressions to
 * match known error patterns from different RPC providers (e.g., Geth, Nethermind, Ankr).

 * @param error The error message
 * @param method RPC method called
 */
export const getErrorType = (error: string, method: string): RPCErrorType => {
  /**
   * Note: We can't use ether's generic SERVER_ERROR because it's also
   * used for invalid responses from the server, which we can retry on
   */

  switch (true) {
    case BATCH_LIMIT_REGEXP.test(error):
      return "batch-limit-exceeded"
    case NETWORK_ERROR_REGEXP.test(error):
      return "network-error"
    case RATE_LIMIT_REGEXP.test(error):
      return "rate-limit-error"
    case RESPONSE_ERROR_REGEXP.test(error):
      return "response-error"
    case GAS_LIMIT_REGEXP.test(error) && method === "eth_call":
      return "eth-call-gas-error"
    case INVALID_RESPONSE_REGEXP.test(error):
      return "invalid-response-error"
    default:
      return "unknown-error"
  }
}
