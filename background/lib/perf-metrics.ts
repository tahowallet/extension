/**
 * Process-wide collector for performance counters that describe the health
 * of RPC traffic and the redux store.
 *
 * Counters are intentionally flat and additive so that producers (e.g. the
 * chain provider, the redux store middleware) can call into this module
 * without coordinating locks. A periodic consumer (the analytics service)
 * takes a snapshot, which atomically hands back the accumulated values and
 * resets the window so the next interval starts clean.
 *
 * The collector holds counters in memory only. Losing them on service-worker
 * restart is acceptable: what matters is the aggregate shape we see over
 * hours, not individual data points.
 */
import { RPCErrorType } from "../services/chain/errors"

/**
 * Histogram bucket upper bounds in milliseconds. A duration is recorded in
 * the first bucket whose upper bound is >= the duration; anything larger
 * goes in the overflow bucket.
 */
const DURATION_BUCKETS_MS = [50, 200, 500, 1000, 2000, 5000, 10_000] as const

type DurationBucketLabel =
  | `le_${(typeof DURATION_BUCKETS_MS)[number]}`
  | "overflow"

/**
 * The full set of failure categories we want to distinguish in analytics,
 * mirroring {@link RPCErrorType} but including a bucket for bookkeeping
 * misses (e.g. single-flight followers inheriting a rejection).
 */
export type RequestFailureCategory = RPCErrorType | "aborted"

type ProviderCounters = {
  requestsSent: number
  requestsSucceeded: number
  requestsFailed: Record<RequestFailureCategory, number>
  singleFlightCoalesces: number
  reconnectAttempts: number
  reconnectSuccesses: number
  reconnectFailures: number
  circuitBreakerOpens: number
  circuitBreakerHalfOpens: number
  circuitBreakerCloses: number
  durationHistogramMs: Record<DurationBucketLabel, number>
}

type ChainCounters = {
  providers: Map<number, ProviderCounters>
}

export type PerfMetricsSnapshot = {
  windowStartedAt: number
  takenAt: number
  chains: Record<
    string,
    {
      providers: Array<
        {
          providerIndex: number
        } & Omit<ProviderCounters, "durationHistogramMs"> & {
            durationHistogramMs: Record<DurationBucketLabel, number>
          }
      >
    }
  >
}

function freshFailureCounters(): Record<RequestFailureCategory, number> {
  return {
    "batch-limit-exceeded": 0,
    "rate-limit-error": 0,
    "network-error": 0,
    "response-error": 0,
    "invalid-response-error": 0,
    "eth-call-gas-error": 0,
    "unknown-error": 0,
    aborted: 0,
  }
}

function freshDurationHistogram(): Record<DurationBucketLabel, number> {
  const histogram = { overflow: 0 } as Record<DurationBucketLabel, number>
  DURATION_BUCKETS_MS.forEach((bound) => {
    histogram[`le_${bound}`] = 0
  })
  return histogram
}

function freshProviderCounters(): ProviderCounters {
  return {
    requestsSent: 0,
    requestsSucceeded: 0,
    requestsFailed: freshFailureCounters(),
    singleFlightCoalesces: 0,
    reconnectAttempts: 0,
    reconnectSuccesses: 0,
    reconnectFailures: 0,
    circuitBreakerOpens: 0,
    circuitBreakerHalfOpens: 0,
    circuitBreakerCloses: 0,
    durationHistogramMs: freshDurationHistogram(),
  }
}

let chains: Map<string, ChainCounters> = new Map()
let windowStartedAt: number = Date.now()

function providerBucket(
  chainID: string,
  providerIndex: number,
): ProviderCounters {
  let chain = chains.get(chainID)
  if (!chain) {
    chain = { providers: new Map() }
    chains.set(chainID, chain)
  }

  let provider = chain.providers.get(providerIndex)
  if (!provider) {
    provider = freshProviderCounters()
    chain.providers.set(providerIndex, provider)
  }
  return provider
}

function bucketForDuration(durationMs: number): DurationBucketLabel {
  // eslint-disable-next-line no-restricted-syntax
  for (const bound of DURATION_BUCKETS_MS) {
    if (durationMs <= bound) {
      return `le_${bound}`
    }
  }
  return "overflow"
}

export function recordRequestSent(
  chainID: string,
  providerIndex: number,
): void {
  providerBucket(chainID, providerIndex).requestsSent += 1
}

export function recordRequestSucceeded(
  chainID: string,
  providerIndex: number,
  durationMs: number,
): void {
  const provider = providerBucket(chainID, providerIndex)
  provider.requestsSucceeded += 1
  provider.durationHistogramMs[bucketForDuration(durationMs)] += 1
}

export function recordRequestFailed(
  chainID: string,
  providerIndex: number,
  category: RequestFailureCategory,
): void {
  providerBucket(chainID, providerIndex).requestsFailed[category] += 1
}

export function recordSingleFlightCoalesce(
  chainID: string,
  providerIndex: number,
): void {
  providerBucket(chainID, providerIndex).singleFlightCoalesces += 1
}

export function recordReconnectAttempt(
  chainID: string,
  providerIndex: number,
): void {
  providerBucket(chainID, providerIndex).reconnectAttempts += 1
}

export function recordReconnectSucceeded(
  chainID: string,
  providerIndex: number,
): void {
  providerBucket(chainID, providerIndex).reconnectSuccesses += 1
}

export function recordReconnectFailed(
  chainID: string,
  providerIndex: number,
): void {
  providerBucket(chainID, providerIndex).reconnectFailures += 1
}

export type CircuitBreakerState = "closed" | "open" | "half-open"

export function recordCircuitBreakerTransition(
  chainID: string,
  providerIndex: number,
  nextState: CircuitBreakerState,
): void {
  const provider = providerBucket(chainID, providerIndex)
  switch (nextState) {
    case "open":
      provider.circuitBreakerOpens += 1
      break
    case "half-open":
      provider.circuitBreakerHalfOpens += 1
      break
    case "closed":
      provider.circuitBreakerCloses += 1
      break
    default:
      break
  }
}

/**
 * Atomically take a snapshot of the current window and reset the counters.
 * The returned snapshot is safe to serialize and send to analytics; callers
 * must not mutate it, and subsequent calls to `record*` accumulate into a
 * fresh window.
 */
export function snapshotAndReset(): PerfMetricsSnapshot {
  const takenAt = Date.now()
  const snapshot: PerfMetricsSnapshot = {
    windowStartedAt,
    takenAt,
    chains: {},
  }

  chains.forEach((chain, chainID) => {
    const providers = Array.from(chain.providers.entries())
      .sort(([a], [b]) => a - b)
      .map(([providerIndex, counters]) => ({
        providerIndex,
        ...counters,
      }))

    if (providers.length > 0) {
      snapshot.chains[chainID] = { providers }
    }
  })

  chains = new Map()
  windowStartedAt = takenAt

  return snapshot
}

/**
 * Test-only reset. Production code should call `snapshotAndReset` instead;
 * resetting without taking the snapshot discards data silently.
 */
export function resetForTests(): void {
  chains = new Map()
  windowStartedAt = Date.now()
}
