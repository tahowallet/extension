/**
 * Per-provider tracker that turns the {@link SerialFallbackProvider} walk's
 * outcomes into a single per-network verdict: can we reach this chain at all,
 * or can we not?
 *
 * Motivation: when every endpoint configured for a network stops answering,
 * the provider throws and every caller in `ChainService` logs and swallows the
 * error. Nothing downstream learns anything, so the UI keeps rendering the
 * last balances it saw — and a zero where it never had one — as though they
 * were current. This tracker is the missing signal.
 *
 * The verdict deliberately keys on the walk running out of endpoints rather
 * than on circuit breaker state. Breakers are per provider index and created
 * lazily, so an index that has never been used has no breaker and "every
 * breaker is open" is a condition that never actually arrives; on top of that,
 * three send paths — the custom-provider path, the Taho-managed (Boar) path,
 * and the capability-provider walk — bypass breakers entirely, so an outage
 * confined to one of them trips nothing. Walk exhaustion, by contrast, is
 * reached by exactly the paths that have nowhere left to go.
 *
 * Breaker state is not consulted at all, corroborating or otherwise. A breaker
 * only ever reaches `closed` by way of a half-open probe that answered, and
 * the walk records that same answer as a success on the very next line, so
 * there is nothing a breaker could tell us that we have not already been told
 * by the path that asked it.
 *
 * A single exhausted walk is not enough to call a network unreachable — one
 * timed-out batch of requests would flicker the UI, which is precisely what
 * this is meant to avoid. Two exhausted walks are required, and no success may
 * have landed for {@link NetworkReachabilityOptions.successFloorMs}. Since
 * walk failures also feed the breakers, whose own threshold is five failures
 * in a thirty-second window, "sustained" here compounds with a delay that is
 * already on the order of half a minute.
 *
 * As with the circuit breaker, state is held entirely in memory and a service
 * worker restart resets it. That is acceptable: whatever is still broken will
 * re-accumulate failures within a poll cycle or two, and whatever recovered in
 * the meantime should not be reported as down.
 */

export type NetworkReachabilityState = "reachable" | "unreachable"

export type NetworkReachabilityOptions = {
  /** Exhausted walks required, absent any success, to call it unreachable. */
  exhaustedWalkThreshold: number
  /** How long the last success must be in the past before we give up on it. */
  successFloorMs: number
}

/**
 * How long the last success has to be in the past, in seconds.
 *
 * Forty-five seconds unless something says otherwise, which is the value this
 * is designed around: long enough, on top of the breakers' own thirty-second
 * window, that nothing short of a genuinely dark chain reaches it. The e2e
 * build lowers it, because a suite that gates every pull request should not
 * spend most of a minute waiting out a timer whose behaviour is already
 * covered by unit tests. Nothing else should.
 */
const DEFAULT_SUCCESS_FLOOR_SECONDS = 45

const configuredFloorSeconds = Number(
  process.env.NETWORK_UNREACHABLE_FLOOR_SECONDS,
)

export const DEFAULT_NETWORK_REACHABILITY_OPTIONS: NetworkReachabilityOptions =
  {
    exhaustedWalkThreshold: 2,
    successFloorMs:
      (Number.isFinite(configuredFloorSeconds) && configuredFloorSeconds > 0
        ? configuredFloorSeconds
        : DEFAULT_SUCCESS_FLOOR_SECONDS) * 1000,
  }

/**
 * Callback invoked when the network's reachability changes, and only when it
 * changes; a network that stays unreachable across a hundred failed calls
 * reports once.
 */
export type NetworkReachabilityListener = (
  next: NetworkReachabilityState,
) => void

export class NetworkReachabilityTracker {
  private state: NetworkReachabilityState = "reachable"

  private exhaustedWalks = 0

  private lastSuccessAt: number

  private readonly options: NetworkReachabilityOptions

  constructor(
    options: Partial<NetworkReachabilityOptions> = {},
    private readonly onStateChange?: NetworkReachabilityListener,
    private readonly now: () => number = Date.now,
  ) {
    this.options = { ...DEFAULT_NETWORK_REACHABILITY_OPTIONS, ...options }
    // A provider that has never succeeded has also never failed, so treat its
    // construction as the last good moment. This starts the floor running from
    // startup rather than from the first failure, so a chain that is dark from
    // the moment the service worker wakes still has to stay dark for the whole
    // floor before we say so.
    this.lastSuccessAt = this.now()
  }

  getState(): NetworkReachabilityState {
    return this.state
  }

  /**
   * Record a successful send on any path — the walk, a custom provider, a
   * capability provider, or the Taho-managed endpoint. Any one of them proves
   * the chain is reachable, so this both clears the failure count and returns
   * the network to reachable immediately. Recovery is not rate-limited: the
   * user should not wait out a threshold to be told their wallet works again.
   */
  recordSuccess(): void {
    this.lastSuccessAt = this.now()
    this.exhaustedWalks = 0
    this.transitionTo("reachable")
  }

  /**
   * Record that a send ran out of providers to try. This is the signal the
   * verdict rests on; see the note above on why breaker state is not.
   */
  recordExhaustedWalk(): void {
    // Cap the count rather than letting it climb for the lifetime of a dark
    // chain; past the threshold its exact value carries no information.
    this.exhaustedWalks = Math.min(
      this.exhaustedWalks + 1,
      this.options.exhaustedWalkThreshold,
    )

    if (
      this.exhaustedWalks >= this.options.exhaustedWalkThreshold &&
      this.now() - this.lastSuccessAt >= this.options.successFloorMs
    ) {
      this.transitionTo("unreachable")
    }
  }

  private transitionTo(next: NetworkReachabilityState) {
    if (this.state === next) {
      return
    }
    this.state = next
    this.onStateChange?.(next)
  }
}
