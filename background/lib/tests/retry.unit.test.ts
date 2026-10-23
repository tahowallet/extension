import { retryWithBackoff } from "../retry"

describe("retryWithBackoff", () => {
  it("returns the first successful result without retrying", async () => {
    const operation = jest.fn(async () => "ok")

    await expect(retryWithBackoff(operation)).resolves.toBe("ok")
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it("retries failures until an attempt succeeds", async () => {
    let calls = 0
    const operation = jest.fn(async (attempt: number) => {
      calls += 1
      if (calls < 3) {
        throw new Error(`failure ${attempt}`)
      }
      return attempt
    })

    await expect(
      retryWithBackoff(operation, { maxAttempts: 3, initialDelayMs: 1 }),
    ).resolves.toBe(3)
    expect(operation).toHaveBeenCalledTimes(3)
  })

  it("rethrows the last error once attempts run out", async () => {
    const operation = jest.fn(async (attempt: number) => {
      throw new Error(`failure ${attempt}`)
    })

    await expect(
      retryWithBackoff(operation, { maxAttempts: 2, initialDelayMs: 1 }),
    ).rejects.toThrow("failure 2")
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it("stops retrying when shouldRetry rejects the error", async () => {
    const operation = jest.fn(async () => {
      throw new Error("permanent")
    })
    const shouldRetry = jest.fn(() => false)

    await expect(
      retryWithBackoff(operation, { initialDelayMs: 1, shouldRetry }),
    ).rejects.toThrow("permanent")
    expect(operation).toHaveBeenCalledTimes(1)
    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1)
  })

  it("doubles the delay between attempts", async () => {
    const attemptTimes: number[] = []
    const operation = jest.fn(async () => {
      attemptTimes.push(performance.now())
      throw new Error("failure")
    })

    await expect(
      retryWithBackoff(operation, { maxAttempts: 3, initialDelayMs: 20 }),
    ).rejects.toThrow("failure")

    const [first, second, third] = attemptTimes
    // Allow some scheduling slack below the nominal 20ms and 40ms waits.
    expect(second - first).toBeGreaterThanOrEqual(15)
    expect(third - second).toBeGreaterThanOrEqual(35)
  })
})
