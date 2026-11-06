import type { SparkSigner } from "@buildonspark/spark-sdk"
import { createGatedSparkSigner, SparkSignerLockedError } from "../spark-signer"

function fakeSigner(): SparkSigner {
  return {
    getIdentityPublicKey: async () => new Uint8Array([2, 1]),
    getNonceForSelfCommitment: () => undefined,
    mnemonicToSeed: async () => new Uint8Array(64),
  } as unknown as SparkSigner
}

describe("gated Spark signer", () => {
  it("forwards calls while unlocked", async () => {
    const real = fakeSigner()
    const gated = createGatedSparkSigner(() => real)
    expect(await gated.getIdentityPublicKey()).toEqual(new Uint8Array([2, 1]))
  })

  it("keeps sync methods sync", () => {
    const gated = createGatedSparkSigner(() => fakeSigner())
    expect(gated.getNonceForSelfCommitment({} as never)).toBeUndefined()
  })

  it("throws once the internal signer has locked", async () => {
    let real: SparkSigner | undefined = fakeSigner()
    const gated = createGatedSparkSigner(() => real)
    // Look the method up before locking, as the SDK might.
    const { getIdentityPublicKey } = gated
    real = undefined
    expect(() => getIdentityPublicKey()).toThrow(SparkSignerLockedError)
  })

  it("blocks seed-handling methods", () => {
    const gated = createGatedSparkSigner(() => fakeSigner())
    expect(() => gated.mnemonicToSeed("abandon")).toThrow(/not available/)
  })

  it("is not mistaken for a promise", async () => {
    const gated = createGatedSparkSigner(() => fakeSigner())
    const resolved = await Promise.resolve(gated)
    expect(resolved).toBe(gated)
  })
})
