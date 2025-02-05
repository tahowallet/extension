/**
 * These are from geth, nethermind, and ankr
 */
const BATCH_LIMIT_REGEXP =
  /batch size (is )?too large|batch size limit exceeded|batch too large/i

/**
 * - WebSocket is already in CLOSING
 * We are reconnecting
 * - TIMEOUT
 * fetchJson timed out, we could retry but it's safer to just fail over
 * - NETWORK_ERROR
 * Any other network error, including no-network errors
 */
const NETWORK_ERROR_REGEXP =
  /WebSocket is already in CLOSING|TIMEOUT|NETWORK_ERROR/i

/**
 * - missing response
 * We might be disconnected due to network instability
 * - failed response
 * fetchJson default "fallback" error, generally thrown after 429s
 * - we can't execute this request
 * ankr rate limit hit / invalid response from some rpcs, generally ankr
 */
const RESPONSE_ERROR_REGEXP =
  /missing response|failed response|we can't execute this request/i

/**
 * - bad response
 * error on the endpoint provider's side
 * - bad result from backend
 * same as above, but comes from ethers trying to parse an invalid response
 */
const INVALID_RESPONSE_REGEXP = /bad response|bad result from backend/i

const RATE_LIMIT_REGEXP =
  /too many requests|call rate limit exhausted|exceeded the quota usage/i

const GAS_LIMIT_REGEXP = /out of gas/i

export type RPCErrorType =
  // Batch size too large
  | "batch_limit_exceeded"
  // Too many requests
  | "rate_limit_error"
  // Timeout and other network errors
  | "network_error"
  // Bad or missing response
  | "response_error"
  // Invalid result from RPC, can be retried
  | "invalid_response_error"
  // Request likely failed due to RPC gas limit, try on different provider
  | "eth_call_gas_error"
  // Uncaught, could be anything
  | "unknown_error"

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
      return "batch_limit_exceeded"
    case NETWORK_ERROR_REGEXP.test(error):
      return "network_error"
    case RATE_LIMIT_REGEXP.test(error):
      return "rate_limit_error"
    case RESPONSE_ERROR_REGEXP.test(error):
      return "response_error"
    case GAS_LIMIT_REGEXP.test(error) && method === "eth_call":
      return "eth_call_gas_error"
    case INVALID_RESPONSE_REGEXP.test(error):
      return "invalid_response_error"
    default:
      return "unknown_error"
  }
}
