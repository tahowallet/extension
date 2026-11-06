import type { SparkSigner } from "@buildonspark/spark-sdk"

/**
 * Signer methods that handle seeds or recovery phrases. The internal signer
 * derives Spark keys itself before handing out a signer, and the SDK is
 * initialized with `signerWithPreExistingKeys`, so nothing outside the
 * internal signer has a reason to call these.
 */
const BLOCKED_METHODS: ReadonlySet<PropertyKey> = new Set<keyof SparkSigner>([
  "generateMnemonic",
  "mnemonicToSeed",
  "createSparkWalletFromSeed",
])

export class SparkSignerLockedError extends Error {
  constructor() {
    super("The Spark signer is locked; unlock Taho to use Spark.")
    this.name = "SparkSignerLockedError"
  }
}

/**
 * Wrap a Spark SDK signer so that every call goes through `resolveSigner`.
 *
 * `resolveSigner` returns the live signer while the internal signer is
 * unlocked and `undefined` once it locks (at which point the internal signer
 * has dropped the derived keys). Calls on a locked proxy throw, and so do
 * calls to the seed-handling methods in `BLOCKED_METHODS`. The proxy holds no
 * key material itself, so handing it to the Spark SDK keeps every signing
 * operation, and the lock that guards it, inside the internal signer.
 *
 * Sync methods (e.g. `getNonceForSelfCommitment`, `signTransactionIndex`)
 * stay sync: the wrapper forwards whatever the real method returns.
 */
export function createGatedSparkSigner(
  resolveSigner: () => SparkSigner | undefined,
): SparkSigner {
  return new Proxy({} as SparkSigner, {
    get(_target, property) {
      // Never look like a thenable: `await`ing a function that returns the
      // proxy probes `then`, and a function there would hijack the await.
      if (property === "then" || typeof property === "symbol") {
        return undefined
      }

      if (BLOCKED_METHODS.has(property)) {
        return () => {
          throw new Error(
            `Spark signer method ${String(property)} is not available outside the internal signer.`,
          )
        }
      }

      const current = resolveSigner()
      if (
        current !== undefined &&
        typeof Reflect.get(current, property, current) !== "function"
      ) {
        // Non-method members (and absent optional methods) read through
        // as-is, so SDK feature checks like `if (signer.x)` behave.
        return Reflect.get(current, property, current)
      }

      return (...args: unknown[]) => {
        // Resolve again at call time: the signer may have locked since the
        // method was looked up.
        const signer = resolveSigner()
        if (signer === undefined) {
          throw new SparkSignerLockedError()
        }
        const method: unknown = Reflect.get(signer, property, signer)
        if (typeof method !== "function") {
          throw new Error(`Unknown Spark signer method ${String(property)}.`)
        }
        return method.apply(signer, args)
      }
    },
  })
}
