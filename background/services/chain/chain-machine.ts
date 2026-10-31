import {
  and,
  AnyActorRef,
  assign,
  emit,
  enqueueActions,
  fromPromise,
  raise,
  setup,
} from "xstate"
import type { RpcEndpoint } from "../../networks"
import type SerialFallbackProvider from "./serial-fallback-provider"
import type { NetworkReachabilityState } from "./network-reachability"

/** Settles a caller waiting on an endpoint update or a removal. */
export type Reply = {
  resolve: () => void
  reject: (error: unknown) => void
}

/** What a chain actor needs from the world outside it. */
export type ChainDependencies = {
  createProvider: (
    chainID: string,
    endpoints: RpcEndpoint[],
    onReachabilityChange: (status: NetworkReachabilityState) => void,
  ) => SerialFallbackProvider
  verifyEndpoints: (
    chainID: string,
    endpoints: RpcEndpoint[],
    signal: AbortSignal,
  ) => Promise<void>
  saveEndpoints: (chainID: string, endpoints: RpcEndpoint[]) => Promise<void>
  removeChain: (chainID: string) => Promise<void>
}

type EndpointUpdate = {
  endpoints: RpcEndpoint[]
  /** False when the endpoints are already saved and need no checking. */
  verifyAndSave: boolean
  replies: Reply[]
}

type ChainContext = {
  chainID: string
  dependencies: ChainDependencies
  endpoints: RpcEndpoint[]
  provider: SerialFallbackProvider | undefined
  reachability: NetworkReachabilityState
  update: EndpointUpdate | undefined
  queuedUpdate: EndpointUpdate | undefined
  removalReplies: Reply[]
}

export type ChainEvent =
  | {
      type: "UPDATE_ENDPOINTS"
      endpoints: RpcEndpoint[]
      verifyAndSave: boolean
      reply: Reply
    }
  | { type: "REMOVE_CHAIN"; reply: Reply }
  | {
      type: "REACHABILITY_CHANGED"
      status: NetworkReachabilityState
      /** The provider reporting, so reports from a retired one are ignored. */
      provider: SerialFallbackProvider
    }
  | { type: "START_QUEUED_UPDATE" }
  | { type: "START_QUEUED_REMOVAL" }

export type ChainEmitted =
  | {
      type: "providerReplaced"
      chainID: string
      provider: SerialFallbackProvider
      previousProvider: SerialFallbackProvider | undefined
    }
  | {
      type: "reachabilityChanged"
      chainID: string
      status: NetworkReachabilityState
    }
  | { type: "removed"; chainID: string }

export type ChainInput = {
  chainID: string
  endpoints: RpcEndpoint[]
  dependencies: ChainDependencies
}

/** Builds a provider whose reachability reports name it. */
function createReportingProvider(
  context: ChainContext,
  self: AnyActorRef,
  endpoints: RpcEndpoint[],
): SerialFallbackProvider {
  const provider = context.dependencies.createProvider(
    context.chainID,
    endpoints,
    (status) => self.send({ type: "REACHABILITY_CHANGED", status, provider }),
  )
  return provider
}

const settle = (replies: Reply[], error?: unknown) =>
  replies.forEach((reply) =>
    error === undefined ? reply.resolve() : reply.reject(error),
  )

export class ChainRemovedError extends Error {
  constructor(chainID: string) {
    super(`Chain ${chainID} was removed`)
  }
}

/**
 * One chain's provider and endpoint list. Endpoint updates are handled one at
 * a time: a newer update cancels a check still in flight, and waits for one
 * that is already saving.
 */
export const chainMachine = setup({
  types: {} as {
    context: ChainContext
    events: ChainEvent
    input: ChainInput
    emitted: ChainEmitted
  },
  actors: {
    verifyEndpoints: fromPromise<
      void,
      { context: ChainContext; endpoints: RpcEndpoint[] }
    >(({ input: { context, endpoints }, signal }) =>
      context.dependencies.verifyEndpoints(context.chainID, endpoints, signal),
    ),
    saveEndpoints: fromPromise<
      void,
      { context: ChainContext; endpoints: RpcEndpoint[] }
    >(({ input: { context, endpoints } }) =>
      context.dependencies.saveEndpoints(context.chainID, endpoints),
    ),
    removeChain: fromPromise<void, { context: ChainContext }>(
      ({ input: { context } }) =>
        context.dependencies.removeChain(context.chainID),
    ),
  },
  guards: {
    isUnreachable: ({ context }) => context.reachability === "unreachable",
    isFromCurrentProvider: ({ context, event }) =>
      event.type === "REACHABILITY_CHANGED" &&
      event.provider === context.provider,
    changesReachability: ({ context, event }) =>
      event.type === "REACHABILITY_CHANGED" &&
      event.status !== context.reachability,
    reportsUnreachable: ({ event }) =>
      event.type === "REACHABILITY_CHANGED" && event.status === "unreachable",
    reportsReachable: ({ event }) =>
      event.type === "REACHABILITY_CHANGED" && event.status === "reachable",
    skipsVerification: ({ event }) =>
      event.type === "UPDATE_ENDPOINTS" && !event.verifyAndSave,
    queuedUpdateSkipsVerification: ({ context }) =>
      context.queuedUpdate !== undefined && !context.queuedUpdate.verifyAndSave,
  },
  actions: {
    buildProvider: assign({
      provider: ({ context, self }) =>
        createReportingProvider(context, self, context.endpoints),
    }),
    recordReachability: enqueueActions(({ context, event, enqueue }) => {
      if (event.type !== "REACHABILITY_CHANGED") {
        return
      }
      enqueue.assign({ reachability: event.status })
      enqueue.emit({
        type: "reachabilityChanged",
        chainID: context.chainID,
        status: event.status,
      })
    }),
    startUpdate: assign({
      update: ({ event }) =>
        event.type === "UPDATE_ENDPOINTS"
          ? {
              endpoints: event.endpoints,
              verifyAndSave: event.verifyAndSave,
              replies: [event.reply],
            }
          : undefined,
    }),
    /** The newer update takes over the replies of the one it cancels. */
    supersedeUpdate: assign({
      update: ({ context, event }) =>
        event.type === "UPDATE_ENDPOINTS"
          ? {
              endpoints: event.endpoints,
              verifyAndSave: event.verifyAndSave,
              replies: [...(context.update?.replies ?? []), event.reply],
            }
          : context.update,
    }),
    queueUpdate: assign({
      queuedUpdate: ({ context, event }) =>
        event.type === "UPDATE_ENDPOINTS"
          ? {
              endpoints: event.endpoints,
              // A queued check-free update can't absorb one that needs
              // checking, so the stricter of the two wins.
              verifyAndSave:
                event.verifyAndSave ||
                (context.queuedUpdate?.verifyAndSave ?? false),
              replies: [...(context.queuedUpdate?.replies ?? []), event.reply],
            }
          : context.queuedUpdate,
    }),
    takeQueuedUpdate: assign({
      update: ({ context }) => context.queuedUpdate,
      queuedUpdate: undefined,
    }),
    queueRemoval: assign({
      removalReplies: ({ context, event }) =>
        event.type === "REMOVE_CHAIN"
          ? [...context.removalReplies, event.reply]
          : context.removalReplies,
    }),
    replayQueued: enqueueActions(({ context, enqueue }) => {
      if (context.removalReplies.length > 0) {
        enqueue(raise({ type: "START_QUEUED_REMOVAL" }))
      } else if (context.queuedUpdate !== undefined) {
        enqueue(raise({ type: "START_QUEUED_UPDATE" }))
      }
    }),
    failUpdate: enqueueActions(({ context, event, enqueue }) => {
      const error =
        "error" in event ? event.error : new ChainRemovedError(context.chainID)
      settle(context.update?.replies ?? [], error)
      enqueue.assign({ update: undefined })
    }),
    swapProvider: enqueueActions(({ context, self, enqueue }) => {
      const endpoints = context.update?.endpoints ?? context.endpoints
      const previousProvider = context.provider
      const provider = createReportingProvider(context, self, endpoints)
      previousProvider?.destroy()

      enqueue.assign({
        endpoints,
        provider,
        reachability: "reachable",
        update: undefined,
      })
      enqueue.emit({
        type: "providerReplaced",
        chainID: context.chainID,
        provider,
        previousProvider,
      })
      // The new provider hasn't failed anything yet.
      enqueue.emit({
        type: "reachabilityChanged",
        chainID: context.chainID,
        status: "reachable",
      })
      settle(context.update?.replies ?? [])
    }),
    destroyProvider: enqueueActions(({ context, enqueue }) => {
      context.provider?.destroy()
      enqueue.assign({ provider: undefined })
    }),
    rejectQueued: enqueueActions(({ context, enqueue }) => {
      settle(
        context.queuedUpdate?.replies ?? [],
        new ChainRemovedError(context.chainID),
      )
      enqueue.assign({ queuedUpdate: undefined })
    }),
    rejectUpdateRequest: ({ context, event }) => {
      if (event.type === "UPDATE_ENDPOINTS") {
        event.reply.reject(new ChainRemovedError(context.chainID))
      }
    },
    finishRemoval: enqueueActions(({ context, event, enqueue }) => {
      settle(context.removalReplies, "error" in event ? event.error : undefined)
      enqueue.assign({ removalReplies: [] })
      enqueue(emit({ type: "removed", chainID: context.chainID }))
    }),
  },
}).createMachine({
  id: "chain",
  context: ({ input }) => ({
    chainID: input.chainID,
    dependencies: input.dependencies,
    endpoints: input.endpoints,
    provider: undefined,
    reachability: "reachable",
    update: undefined,
    queuedUpdate: undefined,
    removalReplies: [],
  }),
  initial: "BuildingProvider",
  on: {
    REACHABILITY_CHANGED: {
      guard: and(["isFromCurrentProvider", "changesReachability"]),
      actions: "recordReachability",
    },
  },
  states: {
    BuildingProvider: {
      entry: "buildProvider",
      always: "Live",
    },
    Live: {
      initial: "RestoringReachability",
      entry: "replayQueued",
      states: {
        // Keeps the verdict across a failed update; only a new provider
        // starts out reachable.
        RestoringReachability: {
          always: [
            { guard: "isUnreachable", target: "Unreachable" },
            { target: "Reachable" },
          ],
        },
        Reachable: {
          on: {
            REACHABILITY_CHANGED: [
              {
                guard: and(["isFromCurrentProvider", "reportsUnreachable"]),
                target: "Unreachable",
                actions: "recordReachability",
              },
              // Already reachable; nothing to report.
              {},
            ],
          },
        },
        Unreachable: {
          on: {
            REACHABILITY_CHANGED: [
              {
                guard: and(["isFromCurrentProvider", "reportsReachable"]),
                target: "Reachable",
                actions: "recordReachability",
              },
              {},
            ],
          },
        },
      },
      on: {
        UPDATE_ENDPOINTS: [
          {
            guard: "skipsVerification",
            target: "SwappingProvider",
            actions: "startUpdate",
          },
          { target: "VerifyingEndpoints", actions: "startUpdate" },
        ],
        START_QUEUED_UPDATE: [
          {
            guard: "queuedUpdateSkipsVerification",
            target: "SwappingProvider",
            actions: "takeQueuedUpdate",
          },
          { target: "VerifyingEndpoints", actions: "takeQueuedUpdate" },
        ],
        REMOVE_CHAIN: { target: "RemovingChain", actions: "queueRemoval" },
        START_QUEUED_REMOVAL: "RemovingChain",
      },
    },
    VerifyingEndpoints: {
      invoke: {
        src: "verifyEndpoints",
        input: ({ context }) => ({
          context,
          endpoints: context.update?.endpoints ?? [],
        }),
        onDone: "SavingEndpoints",
        onError: { target: "Live", actions: "failUpdate" },
      },
      on: {
        UPDATE_ENDPOINTS: [
          {
            guard: "skipsVerification",
            target: "SwappingProvider",
            actions: "supersedeUpdate",
          },
          {
            target: "VerifyingEndpoints",
            reenter: true,
            actions: "supersedeUpdate",
          },
        ],
        REMOVE_CHAIN: {
          target: "RemovingChain",
          actions: ["failUpdate", "queueRemoval"],
        },
      },
    },
    SavingEndpoints: {
      invoke: {
        src: "saveEndpoints",
        input: ({ context }) => ({
          context,
          endpoints: context.update?.endpoints ?? [],
        }),
        onDone: "SwappingProvider",
        onError: { target: "Live", actions: "failUpdate" },
      },
      on: {
        UPDATE_ENDPOINTS: { actions: "queueUpdate" },
        REMOVE_CHAIN: { actions: "queueRemoval" },
      },
    },
    SwappingProvider: {
      entry: "swapProvider",
      always: "Live",
    },
    RemovingChain: {
      entry: ["destroyProvider", "rejectQueued"],
      invoke: {
        src: "removeChain",
        input: ({ context }) => ({ context }),
        onDone: "Removed",
        onError: "Removed",
      },
      on: {
        UPDATE_ENDPOINTS: { actions: "rejectUpdateRequest" },
        REMOVE_CHAIN: { actions: "queueRemoval" },
      },
      exit: "finishRemoval",
    },
    Removed: {
      type: "final",
    },
  },
})
