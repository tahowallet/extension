/**
 * Methods that must never share an in-flight request: subscription ids are
 * per call, and signing and broadcasting have side effects or must answer
 * each caller separately.
 */
const NON_COALESCEABLE_METHODS = new Set([
  "eth_subscribe",
  "eth_unsubscribe",
  "eth_sendTransaction",
  "eth_sendRawTransaction",
  "eth_sign",
  "eth_signTransaction",
  "eth_signTypedData",
  "eth_signTypedData_v1",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  "personal_sign",
])

/**
 * A key for a request that is the same for equivalent JSON payloads. Not
 * meant to be parsed back.
 */
export function requestKey(method: string, params: unknown): string {
  return `${method}::${JSON.stringify(params, (_key, value) => {
    if (value === null) {
      return null
    }
    if (typeof value === "bigint") {
      return `${value}n`
    }
    if (typeof value === "string") {
      return value.toLowerCase()
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, (value as Record<string, unknown>)[key]]),
      )
    }
    return value
  })}`
}

type RecentAnswer = { result: unknown; answeredAt: number }

export type RequestCacheOptions = {
  /** Answers that never change, by method. */
  knownAnswers: { [method: string]: unknown }
  /** How long answers stay fresh, by method. */
  recentAnswerTtlMs: { [method: string]: number }
  now?: () => number
  /** Called when a request joins one already in flight. */
  onCoalesce?: () => void
}

/**
 * Answers what it can without the network: answers that never change,
 * recent answers for a short while, and requests already in flight.
 */
export default class RequestCache {
  readonly #recentAnswers = new Map<string, RecentAnswer>()

  readonly #inFlightRequests = new Map<string, Promise<unknown>>()

  readonly #now: () => number

  constructor(private readonly options: RequestCacheOptions) {
    this.#now = options.now ?? Date.now
  }

  hasKnownAnswer(method: string): boolean {
    return method in this.options.knownAnswers
  }

  getOrFetch(
    method: string,
    params: unknown[],
    fetch: () => Promise<unknown>,
  ): Promise<unknown> {
    if (this.hasKnownAnswer(method)) {
      return Promise.resolve(this.options.knownAnswers[method])
    }

    const key = requestKey(method, params)
    const recent = this.#freshAnswer(method, key)
    if (recent !== undefined) {
      return Promise.resolve(recent.result)
    }

    if (NON_COALESCEABLE_METHODS.has(method)) {
      return this.#fetchAndRemember(method, key, fetch)
    }

    const inFlight = this.#inFlightRequests.get(key)
    if (inFlight !== undefined) {
      this.options.onCoalesce?.()
      return inFlight
    }

    const flight = this.#fetchAndRemember(method, key, fetch)
    this.#inFlightRequests.set(key, flight)
    // then(cleanup, cleanup) rather than finally, so the rejection doesn't
    // escape unhandled on the cleanup chain.
    const cleanup = () => {
      this.#inFlightRequests.delete(key)
    }
    flight.then(cleanup, cleanup)
    return flight
  }

  /** Drops answers that are no longer fresh; returns how many. */
  dropStaleAnswers(): number {
    let dropped = 0
    this.#recentAnswers.forEach((answer, key) => {
      const method = key.split("::")[0]
      if (this.#freshAnswer(method, key) === undefined) {
        this.#recentAnswers.delete(key)
        dropped += 1
      }
    })
    return dropped
  }

  async #fetchAndRemember(
    method: string,
    key: string,
    fetch: () => Promise<unknown>,
  ): Promise<unknown> {
    const result = await fetch()
    if (method in this.options.recentAnswerTtlMs) {
      this.#recentAnswers.set(key, { result, answeredAt: this.#now() })
    }
    return result
  }

  #freshAnswer(method: string, key: string): RecentAnswer | undefined {
    const ttl = this.options.recentAnswerTtlMs[method]
    const answer = this.#recentAnswers.get(key)
    if (
      ttl === undefined ||
      answer === undefined ||
      answer.answeredAt + ttl <= this.#now()
    ) {
      return undefined
    }
    return answer
  }
}
