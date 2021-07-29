// // Disabled while we decide how we want to move here.
// eslint-disable-next-line import/prefer-default-export
export const NETWORK_ERRORS = {
  // 405: 'RPC response not ok: 405 method not found',
  // 429: 'Request is being rate limited.',
  // 503:
  // 504:
  // 504:
  // internal:
  UNSUPORTED_NETWORK: "Currently Tally does not support this network",
  UNSUPORTED_TRANSPORT: "Currently Tally does not support this transport type",
  CONNECT_NOT_SUPPORTED:
    "The provided endpoint does not support socket connections",
  SOCKET_CLOSED: "Connection with node is no longer open",
}
