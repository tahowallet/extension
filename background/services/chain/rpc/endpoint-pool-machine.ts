import { and, assign, emit, enqueueActions, setup } from "xstate"

type PoolContext = {
  /** Whether each endpoint, by index, can take requests. */
  available: boolean[]
  preferredIndex: number
  recoveryIntervalMs: number
}

export type PoolEvent =
  | { type: "ENDPOINT_READY"; index: number }
  | { type: "ENDPOINT_UNAVAILABLE"; index: number }
  | { type: "REQUEST_SUCCEEDED"; index: number }

export type PoolEmitted = { type: "preferredEndpointChanged"; index: number }

export type PoolInput = {
  size: number
  /** How often to check whether the primary can take over again. */
  recoveryIntervalMs: number
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

/**
 * Which of a pool's endpoints requests should start with. The pool moves off
 * the primary when it becomes unavailable, or when a request had to fail over
 * to succeed, and moves back once the primary can take requests again.
 */
export const endpointPoolMachine = setup({
  types: {} as {
    context: PoolContext
    events: PoolEvent
    input: PoolInput
    emitted: PoolEmitted
  },
  delays: {
    recoveryInterval: ({ context }) => context.recoveryIntervalMs,
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
  },
  actions: {
    trackAvailability: assign({
      available: ({ context, event }) =>
        withAvailability(context.available, event),
    }),
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
    recoveryIntervalMs: input.recoveryIntervalMs,
  }),
  initial: "UsingPrimary",
  states: {
    UsingPrimary: {
      entry: "preferPrimary",
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
            guard: "isPrimary",
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
