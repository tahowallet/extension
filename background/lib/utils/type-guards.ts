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

/**
 * A type guard (ish) that will only successfully compile if the passed
 * parameter is `never`. Used for `switch` statement exhaustiveness checks.
 *
 * @example
 *    private async doSomethingWithASigner(signer: AccountSigner): Promise<string> {
 *      switch (signer.type) {
 *        case "ledger":
 *          return "Got a ledger!"
 *        case "keyring":
 *          return "Got a keyring!"
 *        default:
 *          return assertUnreachable(signer)
 *      }
 *    }
 */
export function assertUnreachable(x: never): never {
  throw new Error(`Didn't expect to get here with value: ${x}`)
}
