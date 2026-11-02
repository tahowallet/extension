/** Where a request that failed for good was going, kept on its error. */
export type RpcErrorContext = {
  chainID: string
  method: string
  /** The label of the last endpoint tried, if any was. */
  endpoint?: string
}

type ErrorWithRpcContext = { rpcContext: RpcErrorContext }

/**
 * Attaches `context` to an error as `rpcContext`, leaving its message, code
 * and identity alone. The property is enumerable, so logged errors show it.
 *
 * Errors can be shared, such as one batch's failure rejecting every request
 * in it, so the first context attached stays.
 */
export function attachRpcContext(
  error: unknown,
  context: RpcErrorContext,
): void {
  if (
    typeof error !== "object" ||
    error === null ||
    !Object.isExtensible(error) ||
    "rpcContext" in error
  ) {
    return
  }
  Object.assign(error, { rpcContext: context })
}

export function rpcContextOf(error: unknown): RpcErrorContext | undefined {
  return typeof error === "object" && error !== null && "rpcContext" in error
    ? (error as ErrorWithRpcContext).rpcContext
    : undefined
}
