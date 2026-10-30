import { setup } from "xstate"

export type NetworkWatchContext = {
  chainID: string
  gasPollIntervalMs: number
  /** Whether nobody has used the network lately. */
  isIdle: (chainID: string) => boolean
}

export type NetworkWatchEvent =
  | { type: "START_WATCHING" }
  | { type: "STOP_WATCHING" }
  | { type: "USER_ACTIVITY" }
  | { type: "REACHABILITY_CHANGED"; status: "reachable" | "unreachable" }
  | { type: "PROVIDER_REPLACED" }

export type NetworkWatchInput = NetworkWatchContext

/**
 * One watched network: whether its latest block and gas prices are being
 * polled. Gas is polled on one timer, only while the network is in use and
 * reachable.
 */
export const networkWatchMachine = setup({
  types: {} as {
    context: NetworkWatchContext
    events: NetworkWatchEvent
    input: NetworkWatchInput
  },
  actions: {
    pollLatestBlock: () => {},
    pollGasPrices: () => {},
  },
  delays: {
    gasPollInterval: ({ context }) => context.gasPollIntervalMs,
  },
  guards: {
    isIdle: ({ context }) => context.isIdle(context.chainID),
    reportsUnreachable: ({ event }) =>
      event.type === "REACHABILITY_CHANGED" && event.status === "unreachable",
    reportsReachable: ({ event }) =>
      event.type === "REACHABILITY_CHANGED" && event.status === "reachable",
  },
}).createMachine({
  id: "networkWatch",
  context: ({ input }) => input,
  initial: "NotWatching",
  on: {
    STOP_WATCHING: ".NotWatching",
  },
  states: {
    NotWatching: {
      on: {
        START_WATCHING: [
          {
            guard: "isIdle",
            target: "Idle",
            actions: "pollLatestBlock",
          },
          { target: "Polling", actions: "pollLatestBlock" },
        ],
      },
    },
    Polling: {
      entry: "pollGasPrices",
      after: {
        gasPollInterval: [
          { guard: "isIdle", target: "Idle" },
          { target: "Polling", reenter: true },
        ],
      },
      on: {
        REACHABILITY_CHANGED: {
          guard: "reportsUnreachable",
          target: "PausedWhileUnreachable",
        },
        PROVIDER_REPLACED: { actions: ["pollLatestBlock", "pollGasPrices"] },
      },
    },
    Idle: {
      on: {
        USER_ACTIVITY: "Polling",
        REACHABILITY_CHANGED: {
          guard: "reportsUnreachable",
          target: "PausedWhileUnreachable",
        },
        PROVIDER_REPLACED: { actions: "pollLatestBlock" },
      },
    },
    PausedWhileUnreachable: {
      on: {
        PROVIDER_REPLACED: { actions: "pollLatestBlock" },
        REACHABILITY_CHANGED: [
          {
            guard: ({ event, context }) =>
              event.status === "reachable" && context.isIdle(context.chainID),
            target: "Idle",
          },
          { guard: "reportsReachable", target: "Polling" },
        ],
      },
    },
  },
})
