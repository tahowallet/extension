import { describe, expect, it } from "bun:test"
import { ETHEREUM, MINUTE, OPTIMISM } from "../../../constants"
import {
  MEMPOOL_MISSING_TRANSACTION_GRACE_MS,
  MISSING_TRANSACTION_GRACE_MS,
  nextPendingTransactionState,
  PendingTransactionEffect,
  PendingTransactionEvent,
  pendingTransactionSnapshot,
  PendingTransactionState,
  pendingTransactionStateFor,
  TRANSACTION_CHECK_LIFETIME_MS,
} from "../pending-transaction-machine"

const T0 = 1_800_000_000_000
// Base isn't built in; it has no public mempool, like Optimism.
const BASE_CHAIN_ID = "8453"

const at = (
  state: PendingTransactionState,
  {
    chainID = OPTIMISM.chainID,
    missingSince,
  }: { chainID?: string; missingSince?: number } = {},
) => pendingTransactionSnapshot(state, { chainID, firstSeen: T0, missingSince })

/** Runs events in order, collecting every effect asked for. */
function run(start: ReturnType<typeof at>, events: PendingTransactionEvent[]) {
  let snapshot = start
  const effects: string[] = []
  events.forEach((event) => {
    const next = nextPendingTransactionState(snapshot, event)
    snapshot = next.snapshot
    effects.push(...next.effects)
  })
  return {
    state: String(snapshot.value),
    context: snapshot.context,
    effects,
    done: snapshot.status === "done",
  }
}

const ALL_EVENTS: PendingTransactionEvent[] = [
  { type: "LOOKUP_DUE" },
  { type: "FOUND_IN_MEMPOOL", now: T0 },
  { type: "FOUND_IN_BLOCK", now: T0 },
  { type: "NOT_FOUND", now: T0 },
  { type: "LOOKUP_FAILED", now: T0 },
  { type: "RECEIPT_ARRIVED" },
  { type: "RECHECK_DUE" },
  { type: "RECEIPT_SAVED" },
  { type: "RECEIPT_MISSING", now: T0 },
]

describe("pendingTransactionMachine", () => {
  describe("transitions", () => {
    it.each<
      [
        PendingTransactionState,
        PendingTransactionEvent["type"],
        string,
        PendingTransactionEffect[],
      ]
    >([
      ["Queued", "LOOKUP_DUE", "LookingUp", []],
      [
        "LookingUp",
        "FOUND_IN_MEMPOOL",
        "InMempool",
        ["saveFound", "observeNonce", "watchForReceipt"],
      ],
      [
        "LookingUp",
        "FOUND_IN_BLOCK",
        "InBlock",
        ["saveFound", "fetchBlockAndReceipt"],
      ],
      ["LookingUp", "NOT_FOUND", "Queued", ["persistMissingSince", "requeue"]],
      ["LookingUp", "LOOKUP_FAILED", "Queued", ["requeue"]],
      ["InMempool", "RECEIPT_ARRIVED", "InBlock", ["fetchBlockAndReceipt"]],
      ["InMempool", "RECHECK_DUE", "Queued", []],
      ["InBlock", "RECEIPT_SAVED", "Confirmed", ["unwatch", "dequeue"]],
      ["InBlock", "RECEIPT_MISSING", "Queued", ["requeue"]],
    ])("%s --%s--> %s", (from, type, to, effects) => {
      const event = ALL_EVENTS.find((candidate) => candidate.type === type)!
      const result = run(at(from), [event])

      expect(result.state).toBe(to)
      expect(
        result.effects.filter((effect) => effect !== "clearMissingSince"),
      ).toEqual(effects)
    })

    const handled: Record<string, string[]> = {
      Queued: ["LOOKUP_DUE"],
      LookingUp: [
        "FOUND_IN_MEMPOOL",
        "FOUND_IN_BLOCK",
        "NOT_FOUND",
        "LOOKUP_FAILED",
      ],
      InMempool: ["RECEIPT_ARRIVED", "RECHECK_DUE"],
      InBlock: ["RECEIPT_SAVED", "RECEIPT_MISSING"],
      Confirmed: [],
      Dropped: [],
      Expired: [],
    }

    Object.entries(handled).forEach(([state, events]) => {
      ALL_EVENTS.filter(({ type }) => !events.includes(type)).forEach(
        (event) => {
          it(`ignores ${event.type} in ${state}`, () => {
            const result = run(at(state as PendingTransactionState), [event])

            expect(result.state).toBe(state)
            expect(result.effects).toEqual([])
          })
        },
      )
    })

    it.each(["Confirmed", "Dropped", "Expired"] as const)(
      "treats %s as final",
      (state) => {
        expect(at(state).status).toBe("done")
      },
    )
  })

  describe("missing transactions", () => {
    it("starts the grace period at the first miss and keeps it", () => {
      const first = run(at("Queued"), [
        { type: "LOOKUP_DUE" },
        { type: "NOT_FOUND", now: T0 },
      ])
      expect(first.context.missingSince).toBe(T0)

      const second = run(at("Queued", { missingSince: T0 }), [
        { type: "LOOKUP_DUE" },
        { type: "NOT_FOUND", now: T0 + MINUTE },
      ])
      expect(second.state).toBe("Queued")
      expect(second.context.missingSince).toBe(T0)
    })

    it.each([
      [
        "without a public mempool",
        OPTIMISM.chainID,
        MISSING_TRANSACTION_GRACE_MS,
        2 * MINUTE,
      ],
      [
        "with one",
        ETHEREUM.chainID,
        MEMPOOL_MISSING_TRANSACTION_GRACE_MS,
        15 * MINUTE,
      ],
    ])(
      "on a chain %s, keeps waiting just inside the grace and drops just past it",
      (_, chainID, grace, expected) => {
        expect(grace).toBe(expected)
        const miss = (now: number) =>
          run(at("Queued", { chainID, missingSince: T0 }), [
            { type: "LOOKUP_DUE" },
            { type: "NOT_FOUND", now },
          ])

        const inside = miss(T0 + grace)
        expect(inside.state).toBe("Queued")
        expect(inside.effects).toEqual(["persistMissingSince", "requeue"])

        const past = miss(T0 + grace + 1)
        expect(past.state).toBe("Dropped")
        expect(past.effects).toEqual([
          "markDropped",
          "releaseNonce",
          "unwatch",
          "dequeue",
        ])
      },
    )

    it("drops a miss past the lookup lifetime even inside the grace", () => {
      const result = run(at("Queued"), [
        { type: "LOOKUP_DUE" },
        { type: "NOT_FOUND", now: T0 + TRANSACTION_CHECK_LIFETIME_MS + 1 },
      ])

      expect(result.state).toBe("Dropped")
    })

    it("releases the nonce only on entering Dropped, and only once", () => {
      const misses: PendingTransactionEvent[] = [0, 1, 2].flatMap((minute) => [
        { type: "LOOKUP_DUE" },
        { type: "NOT_FOUND", now: T0 + minute * MINUTE + 1 },
      ])
      const result = run(at("Queued"), [
        ...misses,
        { type: "LOOKUP_DUE" },
        { type: "NOT_FOUND", now: T0 + 10 * MINUTE },
      ])

      expect(result.state).toBe("Dropped")
      expect(
        result.effects.filter((effect) => effect === "releaseNonce"),
      ).toHaveLength(1)
      expect(result.effects.indexOf("releaseNonce")).toBe(
        result.effects.lastIndexOf("releaseNonce"),
      )
    })

    it("goes back to the mempool when a missing transaction turns up there", () => {
      const result = run(at("Queued", { missingSince: T0 }), [
        { type: "LOOKUP_DUE" },
        { type: "FOUND_IN_MEMPOOL", now: T0 + MINUTE },
      ])

      expect(result.state).toBe("InMempool")
      expect(result.context.missingSince).toBeUndefined()
      expect(result.effects).toContain("clearMissingSince")
      expect(result.effects).not.toContain("releaseNonce")
    })

    it("goes on to a block when a missing transaction turns up mined", () => {
      const result = run(at("Queued", { missingSince: T0 }), [
        { type: "LOOKUP_DUE" },
        { type: "FOUND_IN_BLOCK", now: T0 + MINUTE },
      ])

      expect(result.state).toBe("InBlock")
      expect(result.effects).toContain("clearMissingSince")
    })

    // 2026-10-29: a Base transaction was marked dropped after one null from
    // getTransaction, although it had mined.
    it("confirms a Base transaction that is missing once and then mined", () => {
      const result = run(at("Queued", { chainID: BASE_CHAIN_ID }), [
        { type: "LOOKUP_DUE" },
        { type: "NOT_FOUND", now: T0 },
        { type: "LOOKUP_DUE" },
        { type: "FOUND_IN_BLOCK", now: T0 + 4_000 },
        { type: "RECEIPT_SAVED" },
      ])

      expect(result.state).toBe("Confirmed")
      expect(result.effects).not.toContain("markDropped")
      expect(result.effects).not.toContain("releaseNonce")
    })
  })

  describe("failed lookups", () => {
    it("retries until the lifetime is up, and expires after", () => {
      const fail = (now: number) =>
        run(at("Queued"), [
          { type: "LOOKUP_DUE" },
          { type: "LOOKUP_FAILED", now },
        ])

      expect(fail(T0 + TRANSACTION_CHECK_LIFETIME_MS).state).toBe("Queued")
      const expired = fail(T0 + TRANSACTION_CHECK_LIFETIME_MS + 1)
      expect(expired.state).toBe("Expired")
      expect(expired.effects).toEqual(["markExpired", "unwatch", "dequeue"])
    })
  })

  describe("missing receipts", () => {
    it("looks again for a receipt until the lifetime is up", () => {
      const missing = (now: number) =>
        run(at("InBlock"), [{ type: "RECEIPT_MISSING", now }])

      expect(missing(T0 + TRANSACTION_CHECK_LIFETIME_MS).state).toBe("Queued")
      const late = missing(T0 + TRANSACTION_CHECK_LIFETIME_MS + 1)
      expect(late.state).toBe("InBlock")
      expect(late.effects).toEqual([])
    })
  })

  describe("rebuilding from a stored row", () => {
    it.each<
      [
        string,
        Parameters<typeof pendingTransactionStateFor>[0],
        PendingTransactionState,
      ]
    >([
      ["no row", null, "Queued"],
      [
        "a locally saved broadcast",
        { blockHash: null, dataSource: "local" },
        "Queued",
      ],
      [
        "a transaction seen in the mempool",
        { blockHash: null, dataSource: "generic-rpc" },
        "InMempool",
      ],
      [
        "one seen by Boar",
        { blockHash: null, dataSource: "boar" },
        "InMempool",
      ],
      [
        "one missing mid-grace",
        { blockHash: null, dataSource: "boar", missingSince: T0 },
        "Queued",
      ],
      ["one mined without a receipt", { blockHash: "0xabc" }, "InBlock"],
      ["one confirmed", { blockHash: "0xabc", status: 1 }, "Confirmed"],
      ["one reverted", { blockHash: "0xabc", status: 0 }, "Confirmed"],
      [
        "one dropped",
        { blockHash: null, status: 0, missingSince: T0 },
        "Dropped",
      ],
      ["one expired", { blockHash: null, status: 0 }, "Expired"],
    ])("reads %s", (_, row, state) => {
      expect(pendingTransactionStateFor(row)).toBe(state)
    })

    it("picks up mid-grace after a service worker restart", () => {
      // The worker restarted a minute after the first miss; the row kept it.
      const state = pendingTransactionStateFor({
        blockHash: null,
        dataSource: "local",
        missingSince: T0,
      })
      const resumed = at(state, { missingSince: T0 })

      expect(
        run(resumed, [
          { type: "LOOKUP_DUE" },
          { type: "NOT_FOUND", now: T0 + MINUTE },
        ]).state,
      ).toBe("Queued")
      expect(
        run(resumed, [
          { type: "LOOKUP_DUE" },
          { type: "NOT_FOUND", now: T0 + 2 * MINUTE + 1 },
        ]).state,
      ).toBe("Dropped")
    })

    it("rechecks a transaction it last saw in the mempool", () => {
      const result = run(
        at(pendingTransactionStateFor({ blockHash: null, dataSource: "boar" })),
        [{ type: "RECHECK_DUE" }, { type: "LOOKUP_DUE" }],
      )

      expect(result.state).toBe("LookingUp")
    })
  })
})
