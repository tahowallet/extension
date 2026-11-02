import { and, assign, emit, enqueueActions, not, setup } from "xstate"

type PoolContext = {
  /** Whether each endpoint, by index, can take requests. */
  available: boolean[]
  preferredIndex: number
  recoveryIntervalsMs: readonly number[]
  stablePeriodMs: number
  /** Times the pool left its primary without staying on it for a while. */
  failoversFromPrimary: number
}

export type PoolEvent =
  | { type: "ENDPOINT_READY"; index: number }
  | { type: "ENDPOINT_UNAVAILABLE"; index: number }
  | { type: "REQUEST_SUCCEEDED"; index: number }

export type PoolEmitted = { type: "preferredEndpointChanged"; index: number }

export type PoolInput = {
  size: number
  /**
   * How long to wait before checking whether the primary can take over
   * again, by how many times in a row the pool has left it: the first wait
   * after the first failover, the second after the second, and so on, the
   * last repeating.
   */
  recoveryIntervalsMs: readonly number[]
  /** How long the pool stays on its primary before failovers are forgotten. */
  stablePeriodMs: number
}

/** The first available endpoint after `index`, wrapping around. */
function nextAvailable(available: boolean[], after: number): number {
  for (let offset = 1; offset <= available.length; offset += 1) {
    const index = (after + offset) % available.length
    if (available[index]) {
      return index
    }
  }
  return -1
}

const withAvailability = (
  available: boolean[],
  event: PoolEvent,
): boolean[] => {
  if (event.type === "REQUEST_SUCCEEDED" || event.type === "ENDPOINT_READY") {
    return available.map((value, index) => value || index === event.index)
  }
  return available.map((value, index) => value && index !== event.index)
}

/** How long a pool off its primary waits before checking on it again. */
export function recoveryIntervalMs({
  recoveryIntervalsMs,
  failoversFromPrimary,
}: Pick<PoolContext, "recoveryIntervalsMs" | "failoversFromPrimary">): number {
  const step = Math.min(
    Math.max(failoversFromPrimary - 1, 0),
    recoveryIntervalsMs.length - 1,
  )
  return recoveryIntervalsMs[step]
}

/**
 * Which of a pool's endpoints requests should start with. The pool moves off
 * the primary when it becomes unavailable, or when a request had to fail over
 * to succeed, and moves back once the primary can take requests again.
 *
 * A primary the pool keeps leaving gets longer and longer to prove itself:
 * each failover that follows a return to it before the stable period is up
 * lengthens the wait before the pool checks on it again, and while that
 * wait is longer than the first, the primary becoming ready doesn't cut it
 * short.
 */
export const endpointPoolMachine = setup({
  types: {} as {
    context: PoolContext
    events: PoolEvent
    input: PoolInput
    emitted: PoolEmitted
  },
  delays: {
    recoveryInterval: ({ context }) => recoveryIntervalMs(context),
    stablePeriod: ({ context }) => context.stablePeriodMs,
  },
  guards: {
    isPrimary: ({ event }) => "index" in event && event.index === 0,
    isPreferred: ({ context, event }) =>
      "index" in event && event.index === context.preferredIndex,
    isAnotherEndpoint: ({ context, event }) =>
      "index" in event && event.index !== context.preferredIndex,
    leavesNoneAvailable: ({ context, event }) =>
      withAvailability(context.available, event).every((value) => !value),
    primaryIsAvailable: ({ context }) => context.available[0] === true,
    holdingOffPrimary: ({ context }) => context.failoversFromPrimary > 1,
  },
  actions: {
    trackAvailability: assign({
      available: ({ context, event }) =>
        withAvailability(context.available, event),
    }),
    countFailover: assign({
      failoversFromPrimary: ({ context }) => context.failoversFromPrimary + 1,
    }),
    forgetFailovers: assign({ failoversFromPrimary: 0 }),
    preferPrimary: enqueueActions(({ context, enqueue }) => {
      if (context.preferredIndex !== 0) {
        enqueue.assign({ preferredIndex: 0 })
        enqueue(emit({ type: "preferredEndpointChanged", index: 0 }))
      }
    }),
    preferEventEndpoint: enqueueActions(({ context, event, enqueue }) => {
      if (context.preferredIndex !== event.index) {
        enqueue.assign({ preferredIndex: event.index })
        enqueue(emit({ type: "preferredEndpointChanged", index: event.index }))
      }
    }),
    preferNextAvailable: enqueueActions(({ context, enqueue }) => {
      const index = nextAvailable(context.available, context.preferredIndex)
      if (index >= 0 && index !== context.preferredIndex) {
        enqueue.assign({ preferredIndex: index })
        enqueue(emit({ type: "preferredEndpointChanged", index }))
      }
    }),
  },
}).createMachine({
  id: "endpointPool",
  context: ({ input }) => ({
    available: Array.from({ length: input.size }, () => true),
    preferredIndex: 0,
    recoveryIntervalsMs: input.recoveryIntervalsMs,
    stablePeriodMs: input.stablePeriodMs,
    failoversFromPrimary: 0,
  }),
  initial: "UsingPrimary",
  states: {
    UsingPrimary: {
      entry: "preferPrimary",
      // Every way out of the primary is a failover.
      exit: "countFailover",
      after: {
        stablePeriod: { actions: "forgetFailovers" },
      },
      on: {
        ENDPOINT_UNAVAILABLE: [
          {
            guard: "leavesNoneAvailable",
            target: "NoEndpointReady",
            actions: "trackAvailability",
          },
          {
            guard: "isPrimary",
            target: "UsingFallback",
            actions: ["trackAvailability", "preferNextAvailable"],
          },
          { actions: "trackAvailability" },
        ],
        ENDPOINT_READY: { actions: "trackAvailability" },
        REQUEST_SUCCEEDED: [
          // A request that succeeded elsewhere failed over to get there.
          {
            guard: "isAnotherEndpoint",
            target: "UsingFallback",
            actions: ["trackAvailability", "preferEventEndpoint"],
          },
          { actions: "trackAvailability" },
        ],
      },
    },
    UsingFallback: {
      after: {
        recoveryInterval: [
          { guard: "primaryIsAvailable", target: "UsingPrimary" },
          { target: "UsingFallback", reenter: true },
        ],
      },
      on: {
        ENDPOINT_READY: [
          {
            guard: and(["isPrimary", not("holdingOffPrimary")]),
            target: "UsingPrimary",
            actions: "trackAvailability",
          },
          { actions: "trackAvailability" },
        ],
        ENDPOINT_UNAVAILABLE: [
          {
            guard: "leavesNoneAvailable",
            target: "NoEndpointReady",
            actions: "trackAvailability",
          },
          {
            guard: and(["isPreferred", "primaryIsAvailable"]),
            target: "UsingPrimary",
            actions: "trackAvailability",
          },
          {
            guard: "isPreferred",
            actions: ["trackAvailability", "preferNextAvailable"],
          },
          { actions: "trackAvailability" },
        ],
        REQUEST_SUCCEEDED: [
          // The fallback failed and the walk came round to the primary.
          {
            guard: "isPrimary",
            target: "UsingPrimary",
            actions: "trackAvailability",
          },
          { actions: ["trackAvailability", "preferEventEndpoint"] },
        ],
      },
    },
    NoEndpointReady: {
      on: {
        ENDPOINT_READY: [
          {
            guard: "isPrimary",
            target: "UsingPrimary",
            actions: "trackAvailability",
          },
          {
            target: "UsingFallback",
            actions: ["trackAvailability", "preferEventEndpoint"],
          },
        ],
        REQUEST_SUCCEEDED: [
          {
            guard: "isPrimary",
            target: "UsingPrimary",
            actions: "trackAvailability",
          },
          {
            target: "UsingFallback",
            actions: ["trackAvailability", "preferEventEndpoint"],
          },
        ],
        ENDPOINT_UNAVAILABLE: { actions: "trackAvailability" },
      },
    },
  },
})
