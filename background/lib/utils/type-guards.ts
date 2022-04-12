// A set of type guards for external packages. Type guards for package-specific
// types should generally live alongside those types.

/**
 * A type guard that can be used to filter to only fulfilled promises in a
 * `Promise.allSettled` result list.
 */
export function isFulfilledPromise<T>(
  settledResult: PromiseSettledResult<T>
): settledResult is PromiseFulfilledResult<T> {
  return settledResult.status === "fulfilled"
}

/**
 * A type guard that can be used to filter to only results that are not
 * `undefined` in a list that might be `undefined`.
 */
export function isDefined<T>(input: T | undefined): input is T {
  return input !== undefined
}
