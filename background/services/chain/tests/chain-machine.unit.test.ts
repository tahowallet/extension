import { describe, expect, it } from "bun:test"
import { createActor } from "xstate"
import type { RpcEndpoint } from "../../../networks"
import type SerialFallbackProvider from "../serial-fallback-provider"
import type { NetworkReachabilityState } from "../network-reachability"
import {
  ChainEmitted,
  ChainRemovedError,
  chainMachine,
  Reply,
} from "../chain-machine"

type Deferred = {
  promise: Promise<void>
  resolve: () => void
  reject: (error: unknown) => void
}

const deferred = (): Deferred => {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

type FakeProvider = {
  endpoints: RpcEndpoint[]
  isDestroyed: boolean
  destroy: () => void
  reportReachability: (status: NetworkReachabilityState) => void
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const STORED = [{ url: "https://stored.example" }]
const FIRST = [{ url: "https://first.example" }]
const SECOND = [{ url: "https://second.example" }]

function harness() {
  const providers: FakeProvider[] = []
  const verifications: {
    endpoints: RpcEndpoint[]
    signal: AbortSignal
    done: Deferred
  }[] = []
  const saves: { endpoints: RpcEndpoint[]; done: Deferred }[] = []
  const removals: Deferred[] = []
  const emitted: ChainEmitted[] = []

  const actor = createActor(chainMachine, {
    input: {
      chainID: "1",
      endpoints: STORED,
      dependencies: {
        createProvider: (_, endpoints, onReachabilityChange) => {
          const provider: FakeProvider = {
            endpoints,
            isDestroyed: false,
            destroy() {
              provider.isDestroyed = true
            },
            reportReachability: onReachabilityChange,
          }
          providers.push(provider)
          return provider as unknown as SerialFallbackProvider
        },
        verifyEndpoints: (_, endpoints, signal) => {
          const done = deferred()
          verifications.push({ endpoints, signal, done })
          return done.promise
        },
        saveEndpoints: (_, endpoints) => {
          const done = deferred()
          saves.push({ endpoints, done })
          return done.promise
        },
        removeChain: () => {
          const done = deferred()
          removals.push(done)
          return done.promise
        },
      },
    },
  })
  actor.on("*", (event) => emitted.push(event))
  actor.start()

  const state = () => actor.getSnapshot().value
  const current = () =>
    actor.getSnapshot().context.provider as unknown as FakeProvider | undefined

  const outcomes: string[] = []
  const reply = (name: string): Reply => ({
    resolve: () => outcomes.push(`${name}: resolved`),
    reject: (error) =>
      outcomes.push(`${name}: rejected ${(error as Error).message}`),
  })

  const update = (
    name: string,
    endpoints: RpcEndpoint[],
    verifyAndSave = true,
  ) =>
    actor.send({
      type: "UPDATE_ENDPOINTS",
      endpoints,
      verifyAndSave,
      reply: reply(name),
    })

  const remove = (name: string) =>
    actor.send({ type: "REMOVE_CHAIN", reply: reply(name) })

  const reach = (status: NetworkReachabilityState) =>
    actor.send({ type: "REACHABILITY_CHANGED", status })

  const emittedTypes = () =>
    emitted.map((event) =>
      event.type === "reachabilityChanged"
        ? `reachabilityChanged ${event.status}`
        : event.type,
    )

  return {
    actor,
    providers,
    verifications,
    saves,
    removals,
    emitted,
    emittedTypes,
    outcomes,
    state,
    current,
    update,
    remove,
    reach,
  }
}

describe("chainMachine", () => {
  describe("starting", () => {
    it("builds one provider from the stored endpoints and goes live as reachable", () => {
      const chain = harness()

      expect(chain.state()).toEqual({ Live: "Reachable" })
      expect(chain.providers).toHaveLength(1)
      expect(chain.current()?.endpoints).toEqual(STORED)
      expect(chain.emitted).toEqual([])
    })

    it("hears the provider's reachability reports", () => {
      const chain = harness()

      chain.current()?.reportReachability("unreachable")

      expect(chain.state()).toEqual({ Live: "Unreachable" })
    })
  })

  describe("in Live.Reachable", () => {
    it("moves to Unreachable and reports it", () => {
      const chain = harness()

      chain.reach("unreachable")

      expect(chain.state()).toEqual({ Live: "Unreachable" })
      expect(chain.emittedTypes()).toEqual(["reachabilityChanged unreachable"])
    })

    it("ignores a reachable report", () => {
      const chain = harness()

      chain.reach("reachable")

      expect(chain.state()).toEqual({ Live: "Reachable" })
      expect(chain.emitted).toEqual([])
    })

    it("starts verifying an update that needs checking", () => {
      const chain = harness()

      chain.update("first", FIRST)

      expect(chain.state()).toBe("VerifyingEndpoints")
      expect(chain.verifications.map(({ endpoints }) => endpoints)).toEqual([
        FIRST,
      ])
      expect(chain.saves).toHaveLength(0)
    })

    it("swaps straight away for an update that needs no checking", () => {
      const chain = harness()
      const original = chain.current()

      chain.update("first", FIRST, false)

      expect(chain.state()).toEqual({ Live: "Reachable" })
      expect(chain.verifications).toHaveLength(0)
      expect(chain.saves).toHaveLength(0)
      expect(original?.isDestroyed).toBe(true)
      expect(chain.current()?.endpoints).toEqual(FIRST)
      expect(chain.emittedTypes()).toEqual([
        "providerReplaced",
        "reachabilityChanged reachable",
      ])
      expect(chain.emitted[0]).toMatchObject({
        chainID: "1",
        provider: chain.current(),
        previousProvider: original,
      })
      expect(chain.outcomes).toEqual(["first: resolved"])
    })

    it("destroys the provider and deletes the chain on REMOVE_CHAIN", async () => {
      const chain = harness()
      const original = chain.current()

      chain.remove("removal")

      expect(chain.state()).toBe("RemovingChain")
      expect(original?.isDestroyed).toBe(true)
      expect(chain.current()).toBeUndefined()
      expect(chain.removals).toHaveLength(1)

      chain.removals[0].resolve()
      await flush()

      expect(chain.state()).toBe("Removed")
      expect(chain.actor.getSnapshot().status).toBe("done")
      expect(chain.outcomes).toEqual(["removal: resolved"])
      expect(chain.emittedTypes()).toEqual(["removed"])
    })
  })

  describe("in Live.Unreachable", () => {
    it("moves to Reachable and reports it", () => {
      const chain = harness()
      chain.reach("unreachable")

      chain.reach("reachable")

      expect(chain.state()).toEqual({ Live: "Reachable" })
      expect(chain.emittedTypes()).toEqual([
        "reachabilityChanged unreachable",
        "reachabilityChanged reachable",
      ])
    })

    it("ignores another unreachable report", () => {
      const chain = harness()
      chain.reach("unreachable")

      chain.reach("unreachable")

      expect(chain.emittedTypes()).toEqual(["reachabilityChanged unreachable"])
    })

    it("stays unreachable after a failed update", async () => {
      const chain = harness()
      chain.reach("unreachable")

      chain.update("first", FIRST)
      chain.verifications[0].done.reject(new Error("unreachable endpoint"))
      await flush()

      expect(chain.state()).toEqual({ Live: "Unreachable" })
      expect(chain.outcomes).toEqual(["first: rejected unreachable endpoint"])
    })

    it("becomes reachable with a new provider", async () => {
      const chain = harness()
      chain.reach("unreachable")

      chain.update("first", FIRST)
      chain.verifications[0].done.resolve()
      await flush()
      chain.saves[0].done.resolve()
      await flush()

      expect(chain.state()).toEqual({ Live: "Reachable" })
      expect(chain.emittedTypes()).toEqual([
        "reachabilityChanged unreachable",
        "providerReplaced",
        "reachabilityChanged reachable",
      ])
    })
  })

  describe("in VerifyingEndpoints", () => {
    it("saves the endpoints once they check out", async () => {
      const chain = harness()
      chain.update("first", FIRST)

      chain.verifications[0].done.resolve()
      await flush()

      expect(chain.state()).toBe("SavingEndpoints")
      expect(chain.saves.map(({ endpoints }) => endpoints)).toEqual([FIRST])
      expect(chain.outcomes).toEqual([])
    })

    it("goes back to Live without saving or swapping when a check fails", async () => {
      const chain = harness()
      const original = chain.current()
      chain.update("first", FIRST)

      chain.verifications[0].done.reject(new Error("chain mismatch"))
      await flush()

      expect(chain.state()).toEqual({ Live: "Reachable" })
      expect(chain.saves).toHaveLength(0)
      expect(chain.current()).toBe(original)
      expect(original?.isDestroyed).toBe(false)
      expect(chain.outcomes).toEqual(["first: rejected chain mismatch"])
      expect(chain.emitted).toEqual([])
    })

    it("restarts the check for a newer update and cancels the old one", async () => {
      const chain = harness()
      chain.update("first", FIRST)

      chain.update("second", SECOND)

      expect(chain.state()).toBe("VerifyingEndpoints")
      expect(chain.verifications[0].signal.aborted).toBe(true)
      expect(chain.verifications[1].endpoints).toEqual(SECOND)
      expect(chain.verifications[1].signal.aborted).toBe(false)

      // The cancelled check finishing changes nothing.
      chain.verifications[0].done.resolve()
      await flush()
      expect(chain.state()).toBe("VerifyingEndpoints")
      expect(chain.saves).toHaveLength(0)

      chain.verifications[1].done.resolve()
      await flush()
      chain.saves[0].done.resolve()
      await flush()

      expect(chain.saves.map(({ endpoints }) => endpoints)).toEqual([SECOND])
      expect(chain.current()?.endpoints).toEqual(SECOND)
      expect(chain.outcomes).toEqual(["first: resolved", "second: resolved"])
    })

    it("gives a cancelled update the outcome of the one that replaced it", async () => {
      const chain = harness()
      chain.update("first", FIRST)
      chain.update("second", SECOND)

      chain.verifications[1].done.reject(new Error("bad second endpoint"))
      await flush()

      expect(chain.outcomes).toEqual([
        "first: rejected bad second endpoint",
        "second: rejected bad second endpoint",
      ])
    })

    it("swaps straight away when a check-free update replaces the check", () => {
      const chain = harness()
      chain.update("first", FIRST)

      chain.update("second", SECOND, false)

      expect(chain.verifications[0].signal.aborted).toBe(true)
      expect(chain.state()).toEqual({ Live: "Reachable" })
      expect(chain.current()?.endpoints).toEqual(SECOND)
      expect(chain.outcomes).toEqual(["first: resolved", "second: resolved"])
    })

    it("cancels the check and rejects the update on REMOVE_CHAIN", async () => {
      const chain = harness()
      chain.update("first", FIRST)

      chain.remove("removal")

      expect(chain.verifications[0].signal.aborted).toBe(true)
      expect(chain.state()).toBe("RemovingChain")
      expect(chain.outcomes).toEqual(["first: rejected Chain 1 was removed"])

      chain.removals[0].resolve()
      await flush()
      expect(chain.outcomes).toEqual([
        "first: rejected Chain 1 was removed",
        "removal: resolved",
      ])
    })

    it("keeps track of reachability reports while checking", async () => {
      const chain = harness()
      chain.update("first", FIRST)

      chain.reach("unreachable")
      chain.verifications[0].done.reject(new Error("nope"))
      await flush()

      expect(chain.state()).toEqual({ Live: "Unreachable" })
      expect(chain.emittedTypes()).toEqual(["reachabilityChanged unreachable"])
    })
  })

  describe("in SavingEndpoints", () => {
    const savingHarness = async () => {
      const chain = harness()
      chain.update("first", FIRST)
      chain.verifications[0].done.resolve()
      await flush()
      return chain
    }

    it("swaps the provider once the save lands", async () => {
      const chain = await savingHarness()
      const original = chain.current()

      chain.saves[0].done.resolve()
      await flush()

      expect(chain.state()).toEqual({ Live: "Reachable" })
      expect(original?.isDestroyed).toBe(true)
      expect(chain.current()?.endpoints).toEqual(FIRST)
      expect(chain.providers).toHaveLength(2)
      expect(chain.outcomes).toEqual(["first: resolved"])
    })

    it("goes back to Live with the old provider when the save fails", async () => {
      const chain = await savingHarness()
      const original = chain.current()

      chain.saves[0].done.reject(new Error("quota exceeded"))
      await flush()

      expect(chain.state()).toEqual({ Live: "Reachable" })
      expect(chain.current()).toBe(original)
      expect(chain.outcomes).toEqual(["first: rejected quota exceeded"])
    })

    it("queues a newer update and runs it after the swap", async () => {
      const chain = await savingHarness()

      chain.update("second", SECOND)

      expect(chain.state()).toBe("SavingEndpoints")
      expect(chain.verifications).toHaveLength(1)

      chain.saves[0].done.resolve()
      await flush()

      expect(chain.state()).toBe("VerifyingEndpoints")
      expect(chain.current()?.endpoints).toEqual(FIRST)
      expect(chain.outcomes).toEqual(["first: resolved"])

      chain.verifications[1].done.resolve()
      await flush()
      chain.saves[1].done.resolve()
      await flush()

      expect(chain.current()?.endpoints).toEqual(SECOND)
      expect(chain.outcomes).toEqual(["first: resolved", "second: resolved"])
    })

    it("keeps only the latest of several queued updates", async () => {
      const chain = await savingHarness()
      const third = [{ url: "https://third.example" }]

      chain.update("second", SECOND)
      chain.update("third", third)
      chain.saves[0].done.resolve()
      await flush()

      expect(chain.verifications[1].endpoints).toEqual(third)

      chain.verifications[1].done.resolve()
      await flush()
      chain.saves[1].done.resolve()
      await flush()

      expect(chain.saves.map(({ endpoints }) => endpoints)).toEqual([
        FIRST,
        third,
      ])
      expect(chain.outcomes).toEqual([
        "first: resolved",
        "second: resolved",
        "third: resolved",
      ])
    })

    it("still runs a queued update after the save fails", async () => {
      const chain = await savingHarness()

      chain.update("second", SECOND)
      chain.saves[0].done.reject(new Error("quota exceeded"))
      await flush()

      expect(chain.state()).toBe("VerifyingEndpoints")
      expect(chain.verifications[1].endpoints).toEqual(SECOND)
    })

    it("removes the chain after the swap when asked to while saving", async () => {
      const chain = await savingHarness()

      chain.update("second", SECOND)
      chain.remove("removal")
      expect(chain.state()).toBe("SavingEndpoints")

      chain.saves[0].done.resolve()
      await flush()

      expect(chain.state()).toBe("RemovingChain")
      expect(chain.providers.every(({ isDestroyed }) => isDestroyed)).toBe(true)
      expect(chain.outcomes).toEqual([
        "first: resolved",
        "second: rejected Chain 1 was removed",
      ])
    })
  })

  describe("in RemovingChain", () => {
    it("rejects updates", () => {
      const chain = harness()
      chain.remove("removal")

      chain.update("first", FIRST)

      expect(chain.outcomes).toEqual(["first: rejected Chain 1 was removed"])
      expect(chain.verifications).toHaveLength(0)
    })

    it("settles a second removal with the first", async () => {
      const chain = harness()
      chain.remove("removal")
      chain.remove("again")

      chain.removals[0].resolve()
      await flush()

      expect(chain.removals).toHaveLength(1)
      expect(chain.outcomes).toEqual(["removal: resolved", "again: resolved"])
    })

    it("still finishes when deleting the rows fails", async () => {
      const chain = harness()
      chain.remove("removal")

      chain.removals[0].reject(new Error("db closed"))
      await flush()

      expect(chain.state()).toBe("Removed")
      expect(chain.outcomes).toEqual(["removal: rejected db closed"])
    })

    it("records reachability reports without reporting them as a live chain", () => {
      const chain = harness()
      chain.remove("removal")

      chain.reach("unreachable")

      expect(chain.state()).toBe("RemovingChain")
    })
  })

  describe("in Removed", () => {
    it("ignores everything", async () => {
      const chain = harness()
      chain.remove("removal")
      chain.removals[0].resolve()
      await flush()

      chain.update("first", FIRST)

      expect(chain.state()).toBe("Removed")
      expect(chain.verifications).toHaveLength(0)
    })
  })

  it("names the chain in its removal error", () => {
    expect(new ChainRemovedError("10").message).toBe("Chain 10 was removed")
  })
})
