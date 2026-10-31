import { assign, setup, SnapshotFrom, transition } from "xstate"
import { CHAINS_WITH_MEMPOOL, HOUR, MINUTE } from "../../constants"
import type { UNIXTime } from "../../types"

/**
 * How long a transaction can go unseen before it counts as dropped. A
 * sequencer includes or rejects a transaction within a block or two; a public
 * mempool needs time to propagate and lagging endpoints time to catch up.
 */
export const MISSING_TRANSACTION_GRACE_MS = 2 * MINUTE
export const MEMPOOL_MISSING_TRANSACTION_GRACE_MS = 15 * MINUTE

/** How long to keep retrying lookups that fail outright. */
export const TRANSACTION_CHECK_LIFETIME_MS = 10 * HOUR

export const missingTransactionGraceMs = (chainID: string): number =>
  CHAINS_WITH_MEMPOOL.has(chainID)
    ? MEMPOOL_MISSING_TRANSACTION_GRACE_MS
    : MISSING_TRANSACTION_GRACE_MS

export type PendingTransactionContext = {
  chainID: string
  firstSeen: UNIXTime
  /** When lookups started finding nothing, while they still do. */
  missingSince?: UNIXTime
  /** When the latest lookup finished. */
  checkedAt?: UNIXTime
}

export type PendingTransactionEvent =
  | { type: "LOOKUP_DUE" }
  | { type: "FOUND_IN_MEMPOOL"; now: UNIXTime }
  | { type: "FOUND_IN_BLOCK"; now: UNIXTime }
  | { type: "NOT_FOUND"; now: UNIXTime }
  | { type: "LOOKUP_FAILED"; now: UNIXTime }
  | { type: "RECEIPT_ARRIVED" }
  | { type: "RECHECK_DUE" }
  | { type: "RECEIPT_SAVED" }
  | { type: "RECEIPT_MISSING"; now: UNIXTime }

export type PendingTransactionState =
  | "Queued"
  | "LookingUp"
  | "InMempool"
  | "InBlock"
  | "MissingFromChain"
  | "Confirmed"
  | "Dropped"
  | "Expired"

/**
 * The effects a transition asks for, which the transaction tracker carries
 * out. The machine itself does nothing but decide.
 */
export type PendingTransactionEffect =
  | "saveFound"
  | "persistMissingSince"
  | "clearMissingSince"
  | "requeue"
  | "observeNonce"
  | "watchForReceipt"
  | "fetchBlockAndReceipt"
  | "dequeue"
  | "markDropped"
  | "releaseNonce"
  | "unwatch"
  | "markExpired"

const effect = () => {}

/**
 * The lifecycle of a transaction being looked up, run as a pure transition
 * function over state kept in IndexedDB rather than as live actors, so it
 * survives service worker restarts.
 */
export const pendingTransactionMachine = setup({
  types: {} as {
    context: PendingTransactionContext
    events: PendingTransactionEvent
    input: PendingTransactionContext
  },
  guards: {
    pastGraceOrLifetime: ({ context }) => {
      const now = context.checkedAt ?? 0
      const missingFor = now - (context.missingSince ?? now)
      return (
        missingFor > missingTransactionGraceMs(context.chainID) ||
        now > context.firstSeen + TRANSACTION_CHECK_LIFETIME_MS
      )
    },
    withinLifetime: ({ context, event }) =>
      "now" in event &&
      event.now <= context.firstSeen + TRANSACTION_CHECK_LIFETIME_MS,
    wasMissing: ({ context }) => context.missingSince !== undefined,
  },
  actions: {
    saveFound: effect,
    persistMissingSince: effect,
    clearMissingSince: effect,
    requeue: effect,
    observeNonce: effect,
    watchForReceipt: effect,
    fetchBlockAndReceipt: effect,
    dequeue: effect,
    markDropped: effect,
    releaseNonce: effect,
    unwatch: effect,
    markExpired: effect,
    recordMiss: assign({
      missingSince: ({ context, event }) =>
        context.missingSince ?? ("now" in event ? event.now : undefined),
      checkedAt: ({ event }) => ("now" in event ? event.now : undefined),
    }),
    recordFound: assign({
      missingSince: undefined,
      checkedAt: ({ event }) => ("now" in event ? event.now : undefined),
    }),
  },
}).createMachine({
  id: "pendingTransaction",
  context: ({ input }) => input,
  initial: "Queued",
  states: {
    Queued: {
      on: { LOOKUP_DUE: "LookingUp" },
    },
    LookingUp: {
      on: {
        FOUND_IN_MEMPOOL: {
          target: "InMempool",
          actions: [
            { type: "clearMissingSince" },
            "recordFound",
            { type: "saveFound" },
          ],
        },
        FOUND_IN_BLOCK: {
          target: "InBlock",
          actions: [
            { type: "clearMissingSince" },
            "recordFound",
            { type: "saveFound" },
          ],
        },
        NOT_FOUND: { target: "MissingFromChain", actions: "recordMiss" },
        LOOKUP_FAILED: [
          {
            guard: "withinLifetime",
            target: "Queued",
            actions: { type: "requeue" },
          },
          { target: "Expired" },
        ],
      },
    },
    MissingFromChain: {
      always: [
        { guard: "pastGraceOrLifetime", target: "Dropped" },
        {
          target: "Queued",
          actions: [{ type: "persistMissingSince" }, { type: "requeue" }],
        },
      ],
    },
    InMempool: {
      entry: [{ type: "observeNonce" }, { type: "watchForReceipt" }],
      on: {
        RECEIPT_ARRIVED: "InBlock",
        RECHECK_DUE: "Queued",
      },
    },
    InBlock: {
      entry: { type: "fetchBlockAndReceipt" },
      on: {
        RECEIPT_SAVED: "Confirmed",
        // Endpoints can know a transaction's block before its receipt.
        RECEIPT_MISSING: {
          guard: "withinLifetime",
          target: "Queued",
          actions: { type: "requeue" },
        },
      },
    },
    Confirmed: {
      type: "final",
      entry: [{ type: "unwatch" }, { type: "dequeue" }],
    },
    Dropped: {
      type: "final",
      entry: [
        { type: "markDropped" },
        { type: "releaseNonce" },
        { type: "unwatch" },
        { type: "dequeue" },
      ],
    },
    Expired: {
      type: "final",
      entry: [{ type: "markExpired" }, { type: "dequeue" }],
    },
  },
})

export type PendingTransactionSnapshot = SnapshotFrom<
  typeof pendingTransactionMachine
>

/** Rebuilds a transaction's lookup state from what is stored. */
export function pendingTransactionSnapshot(
  state: PendingTransactionState,
  context: PendingTransactionContext,
): PendingTransactionSnapshot {
  return pendingTransactionMachine.resolveState({ value: state, context })
}

/** What the stored row says about where a transaction is in its lifecycle. */
export function pendingTransactionStateFor(
  row:
    | {
        status?: number
        blockHash?: string | null
        dataSource?: string
        missingSince?: UNIXTime
      }
    | null
    | undefined,
): PendingTransactionState {
  if (row === null || row === undefined) {
    return "Queued"
  }
  if ("status" in row && row.status !== undefined) {
    if (row.blockHash) {
      return "Confirmed"
    }
    return row.missingSince === undefined ? "Expired" : "Dropped"
  }
  if (row.blockHash) {
    return "InBlock"
  }
  if (row.missingSince !== undefined) {
    return "Queued"
  }
  return row.dataSource === "local" || row.dataSource === undefined
    ? "Queued"
    : "InMempool"
}

/**
 * Applies an event, returning the next snapshot and the effects to carry
 * out, in order.
 */
export function nextPendingTransactionState(
  snapshot: PendingTransactionSnapshot,
  event: PendingTransactionEvent,
): {
  snapshot: PendingTransactionSnapshot
  effects: PendingTransactionEffect[]
} {
  const [next, actions] = transition(pendingTransactionMachine, snapshot, event)
  return {
    snapshot: next,
    effects: actions
      .map(({ type }) => type)
      .filter(
        (type): type is PendingTransactionEffect =>
          !type.startsWith("xstate.") &&
          type !== "recordMiss" &&
          type !== "recordFound",
      ),
  }
}
