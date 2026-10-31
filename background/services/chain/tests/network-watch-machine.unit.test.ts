import { describe, expect, it } from "bun:test"
import { createActor, SimulatedClock } from "xstate"
import {
  networkWatchMachine,
  NetworkWatchEvent,
} from "../network-watch-machine"

const INTERVAL = 15_000

function harness({ idle = false } = {}) {
  const clock = new SimulatedClock()
  const polls: string[] = []
  const state = { idle }
  const actor = createActor(
    networkWatchMachine.provide({
      actions: {
        pollLatestBlock: () => polls.push("block"),
        pollGasPrices: () => polls.push("gas"),
      },
    }),
    {
      clock,
      input: {
        chainID: "1",
        gasPollIntervalMs: INTERVAL,
        isIdle: () => state.idle,
      },
    },
  )
  actor.start()
  const send = (event: NetworkWatchEvent) => actor.send(event)
  const value = () => actor.getSnapshot().value
  return { actor, clock, polls, state, send, value }
}

const unreachable: NetworkWatchEvent = {
  type: "REACHABILITY_CHANGED",
  status: "unreachable",
}
const reachable: NetworkWatchEvent = {
  type: "REACHABILITY_CHANGED",
  status: "reachable",
}

describe("networkWatchMachine", () => {
  describe("in NotWatching", () => {
    it("starts polling a network in use, reading its latest block and gas", () => {
      const watch = harness()

      watch.send({ type: "START_WATCHING" })

      expect(watch.value()).toBe("Polling")
      expect(watch.polls).toEqual(["block", "gas"])
    })

    it("starts idle on a network nobody is using, reading only its block", () => {
      const watch = harness({ idle: true })

      watch.send({ type: "START_WATCHING" })

      expect(watch.value()).toBe("Idle")
      expect(watch.polls).toEqual(["block"])
    })

    it.each<NetworkWatchEvent>([
      { type: "USER_ACTIVITY" },
      { type: "PROVIDER_REPLACED" },
      unreachable,
      reachable,
      { type: "STOP_WATCHING" },
    ])("ignores %p", (event) => {
      const watch = harness()

      watch.send(event)
      watch.clock.increment(INTERVAL * 4)

      expect(watch.value()).toBe("NotWatching")
      expect(watch.polls).toEqual([])
    })
  })

  describe("in Polling", () => {
    const polling = () => {
      const watch = harness()
      watch.send({ type: "START_WATCHING" })
      watch.polls.length = 0
      return watch
    }

    it("polls gas on one timer, once per interval", () => {
      const watch = polling()

      watch.clock.increment(INTERVAL - 1)
      expect(watch.polls).toEqual([])

      watch.clock.increment(1)
      expect(watch.polls).toEqual(["gas"])

      ;[1, 2, 3].forEach(() => watch.clock.increment(INTERVAL))
      expect(watch.polls).toEqual(["gas", "gas", "gas", "gas"])
    })

    it("goes idle at the next tick once nobody is using the network", () => {
      const watch = polling()
      watch.state.idle = true

      watch.clock.increment(INTERVAL)

      expect(watch.value()).toBe("Idle")
      expect(watch.polls).toEqual([])
    })

    it("pauses when the chain becomes unreachable, cancelling its timer", () => {
      const watch = polling()

      watch.send(unreachable)
      watch.clock.increment(INTERVAL * 4)

      expect(watch.value()).toBe("PausedWhileUnreachable")
      expect(watch.polls).toEqual([])
    })

    it("reads a fresh block and gas when the provider is replaced", () => {
      const watch = polling()

      watch.send({ type: "PROVIDER_REPLACED" })

      expect(watch.polls).toEqual(["block", "gas"])
    })

    it("ignores START_WATCHING", () => {
      const watch = polling()

      watch.send({ type: "START_WATCHING" })

      expect(watch.value()).toBe("Polling")
      expect(watch.polls).toEqual([])
    })

    it("ignores activity and reachable reports", () => {
      const watch = polling()

      watch.send({ type: "USER_ACTIVITY" })
      watch.send(reachable)

      expect(watch.value()).toBe("Polling")
      expect(watch.polls).toEqual([])
    })

    it("stops, timer and all, when told to", () => {
      const watch = polling()

      watch.send({ type: "STOP_WATCHING" })
      watch.clock.increment(INTERVAL * 4)

      expect(watch.value()).toBe("NotWatching")
      expect(watch.polls).toEqual([])
    })
  })

  describe("in Idle", () => {
    const idle = () => {
      const watch = harness({ idle: true })
      watch.send({ type: "START_WATCHING" })
      watch.polls.length = 0
      return watch
    }

    it("never polls gas on its own", () => {
      const watch = idle()

      watch.clock.increment(INTERVAL * 10)

      expect(watch.polls).toEqual([])
    })

    it("resumes polling, at once, on activity", () => {
      const watch = idle()
      watch.state.idle = false

      watch.send({ type: "USER_ACTIVITY" })

      expect(watch.value()).toBe("Polling")
      expect(watch.polls).toEqual(["gas"])
    })

    it("polls on activity even while isIdle still says idle, and goes idle again at the next tick", () => {
      const watch = idle()

      watch.send({ type: "USER_ACTIVITY" })
      expect(watch.value()).toBe("Polling")
      expect(watch.polls).toEqual(["gas"])

      watch.clock.increment(INTERVAL)
      expect(watch.value()).toBe("Idle")
      expect(watch.polls).toEqual(["gas"])
    })

    it("ignores START_WATCHING", () => {
      const watch = idle()

      watch.send({ type: "START_WATCHING" })

      expect(watch.value()).toBe("Idle")
      expect(watch.polls).toEqual([])
    })

    it("reads only a fresh block when the provider is replaced", () => {
      const watch = idle()

      watch.send({ type: "PROVIDER_REPLACED" })

      expect(watch.polls).toEqual(["block"])
    })

    it("pauses when the chain becomes unreachable", () => {
      const watch = idle()

      watch.send(unreachable)

      expect(watch.value()).toBe("PausedWhileUnreachable")
    })

    it("stops when told to", () => {
      const watch = idle()

      watch.send({ type: "STOP_WATCHING" })

      expect(watch.value()).toBe("NotWatching")
    })
  })

  describe("in PausedWhileUnreachable", () => {
    const paused = ({ idle = false } = {}) => {
      const watch = harness({ idle })
      watch.send({ type: "START_WATCHING" })
      watch.send(unreachable)
      watch.polls.length = 0
      return watch
    }

    it("resumes polling once the chain is reachable", () => {
      const watch = paused()

      watch.send(reachable)

      expect(watch.value()).toBe("Polling")
      expect(watch.polls).toEqual(["gas"])
    })

    it("goes idle instead if nobody is using the network", () => {
      const watch = paused({ idle: true })

      watch.send(reachable)

      expect(watch.value()).toBe("Idle")
      expect(watch.polls).toEqual([])
    })

    it("ignores activity and further unreachable reports", () => {
      const watch = paused()

      watch.send({ type: "USER_ACTIVITY" })
      watch.send(unreachable)
      watch.clock.increment(INTERVAL * 4)

      expect(watch.value()).toBe("PausedWhileUnreachable")
      expect(watch.polls).toEqual([])
    })

    it("reads a fresh block when the provider is replaced", () => {
      const watch = paused()

      watch.send({ type: "PROVIDER_REPLACED" })

      expect(watch.polls).toEqual(["block"])
    })

    it("stops when told to", () => {
      const watch = paused()

      watch.send({ type: "STOP_WATCHING" })

      expect(watch.value()).toBe("NotWatching")
    })
  })
})
