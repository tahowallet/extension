import { describe, expect, it } from "bun:test"
import { ETHEREUM, OPTIMISM } from "../../../constants"
import type { EVMNetwork } from "../../../networks"
import NonceAllocator from "../nonce-allocator"
import type SerialFallbackProvider from "../serial-fallback-provider"
import {
  createAnyEVMTransaction,
  createLegacyTransactionRequest,
} from "../../../tests/factories"

const allocatorWithChainCount = (count: number) =>
  new NonceAllocator(
    () =>
      ({
        getTransactionCount: async () => count,
      }) as unknown as SerialFallbackProvider,
  )

const request = (network: EVMNetwork = ETHEREUM) =>
  createLegacyTransactionRequest({
    network,
    chainID: network.chainID,
    nonce: undefined,
  })

describe("NonceAllocator", () => {
  it("leaves a nonce that is already set", async () => {
    const allocator = allocatorWithChainCount(10)
    const withNonce = { ...request(), nonce: 3 }

    await expect(allocator.allocateNonce(withNonce)).resolves.toBe(withNonce)
  })

  it("uses the chain's count on chains without a mempool", async () => {
    const allocator = allocatorWithChainCount(10)

    const { nonce } = await allocator.allocateNonce(request(OPTIMISM))

    expect(nonce).toBe(10)
    expect(allocator.highestKnownNonce[OPTIMISM.chainID]).toBeUndefined()
  })

  it("allocates past pending nonces on chains with a mempool", async () => {
    const allocator = allocatorWithChainCount(10)
    const transaction = request()

    const first = await allocator.allocateNonce(transaction)
    const second = await allocator.allocateNonce(transaction)

    expect([first.nonce, second.nonce]).toEqual([10, 11])
  })

  it("makes a released nonce available again, along with everything after it", async () => {
    const allocator = allocatorWithChainCount(10)
    const transaction = request()
    const first = await allocator.allocateNonce(transaction)
    await allocator.allocateNonce(transaction)
    await allocator.allocateNonce(transaction)

    allocator.releaseNonce(first)

    expect((await allocator.allocateNonce(transaction)).nonce).toBe(10)
  })

  it("raises the highest known nonce to one seen pending", async () => {
    const allocator = allocatorWithChainCount(10)
    const transaction = request()
    await allocator.allocateNonce(transaction)

    allocator.observeNonce(
      createAnyEVMTransaction({
        from: transaction.from,
        network: ETHEREUM,
        nonce: 20,
      }),
    )

    expect((await allocator.allocateNonce(transaction)).nonce).toBe(21)
  })

  it("ignores a pending nonce for an address it doesn't track", () => {
    const allocator = allocatorWithChainCount(10)

    allocator.observeNonce(
      createAnyEVMTransaction({ network: ETHEREUM, nonce: 20 }),
    )

    expect(allocator.highestKnownNonce).toEqual({})
  })
})
