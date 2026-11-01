import { describe, expect, it } from "bun:test"
import { JsonRpcProvider } from "@ethersproject/providers"
import { createActor, SimulatedClock } from "xstate"
import * as sinon from "sinon"
import { endpointPoolMachine, PoolEvent } from "../endpoint-pool-machine"
import Endpoint from "../endpoint"
import EndpointPool from "../endpoint-pool"

const RECOVERY_MS = 10_000
const RECOVERY_INTERVALS_MS = [RECOVERY_MS, 30_000, 120_000, 600_000]
const STABLE_MS = 300_000

function harness(size = 3) {
  const clock = new SimulatedClock()
  const preferred: number[] = []
  const actor = createActor(endpointPoolMachine, {
    input: {
      size,
      recoveryIntervalsMs: RECOVERY_INTERVALS_MS,
      stablePeriodMs: STABLE_MS,
    },
    clock,
  })
  actor.on("preferredEndpointChanged", ({ index }) => preferred.push(index))
  actor.start()

  const send = (type: PoolEvent["type"], index: number) =>
    actor.send({ type, index })
  const state = () => actor.getSnapshot().value
  const preferredIndex = () => actor.getSnapshot().context.preferredIndex

  return { actor, clock, preferred, send, state, preferredIndex }
}

describe("endpointPoolMachine", () => {
  it("starts on the primary with every endpoint available", () => {
    const pool = harness()

    expect(pool.state()).toBe("UsingPrimary")
    expect(pool.preferredIndex()).toBe(0)
    expect(pool.actor.getSnapshot().context.available).toEqual([
      true,
      true,
      true,
    ])
    expect(pool.preferred).toEqual([])
  })

  describe("in UsingPrimary", () => {
    it("moves to the next available endpoint when the primary becomes unavailable", () => {
      const pool = harness()

      pool.send("ENDPOINT_UNAVAILABLE", 0)

      expect(pool.state()).toBe("UsingFallback")
      expect(pool.preferredIndex()).toBe(1)
      expect(pool.preferred).toEqual([1])
    })

    it("skips unavailable endpoints when choosing a fallback", () => {
      const pool = harness()
      pool.send("ENDPOINT_UNAVAILABLE", 1)

      pool.send("ENDPOINT_UNAVAILABLE", 0)

      expect(pool.preferredIndex()).toBe(2)
      expect(pool.preferred).toEqual([2])
    })

    it("stays on the primary when another endpoint becomes unavailable", () => {
      const pool = harness()

      pool.send("ENDPOINT_UNAVAILABLE", 2)

      expect(pool.state()).toBe("UsingPrimary")
      expect(pool.preferred).toEqual([])
    })

    it("has no endpoint ready when the last available one goes", () => {
      const pool = harness()
      pool.send("ENDPOINT_UNAVAILABLE", 1)
      pool.send("ENDPOINT_UNAVAILABLE", 2)

      pool.send("ENDPOINT_UNAVAILABLE", 0)

      expect(pool.state()).toBe("NoEndpointReady")
      expect(pool.preferred).toEqual([])
    })

    it("moves to an endpoint a request had to fail over to", () => {
      const pool = harness()

      pool.send("REQUEST_SUCCEEDED", 2)

      expect(pool.state()).toBe("UsingFallback")
      expect(pool.preferred).toEqual([2])
    })

    it("ignores a success on the primary and a ready report", () => {
      const pool = harness()

      pool.send("REQUEST_SUCCEEDED", 0)
      pool.send("ENDPOINT_READY", 1)

      expect(pool.state()).toBe("UsingPrimary")
      expect(pool.preferred).toEqual([])
    })

    it("does not schedule recovery", () => {
      const pool = harness()

      pool.clock.increment(RECOVERY_MS * 3)

      expect(pool.state()).toBe("UsingPrimary")
    })
  })

  describe("in UsingFallback", () => {
    const onFallback = () => {
      const pool = harness()
      pool.send("ENDPOINT_UNAVAILABLE", 0)
      return pool
    }

    it("goes back to the primary when it is ready again", () => {
      const pool = onFallback()

      pool.send("ENDPOINT_READY", 0)

      expect(pool.state()).toBe("UsingPrimary")
      expect(pool.preferred).toEqual([1, 0])
    })

    it("goes back to the primary when a request succeeds on it", () => {
      const pool = onFallback()

      pool.send("REQUEST_SUCCEEDED", 0)

      expect(pool.state()).toBe("UsingPrimary")
      expect(pool.preferred).toEqual([1, 0])
    })

    it("moves on when the preferred fallback becomes unavailable", () => {
      const pool = onFallback()

      pool.send("ENDPOINT_UNAVAILABLE", 1)

      expect(pool.state()).toBe("UsingFallback")
      expect(pool.preferredIndex()).toBe(2)
      expect(pool.preferred).toEqual([1, 2])
    })

    it("goes back to an available primary when the preferred fallback becomes unavailable", () => {
      const pool = harness()
      pool.send("REQUEST_SUCCEEDED", 1)

      pool.send("ENDPOINT_UNAVAILABLE", 1)

      expect(pool.state()).toBe("UsingPrimary")
      expect(pool.preferred).toEqual([1, 0])
    })

    it("keeps its preference when another fallback becomes unavailable", () => {
      const pool = onFallback()

      pool.send("ENDPOINT_UNAVAILABLE", 2)

      expect(pool.preferredIndex()).toBe(1)
      expect(pool.preferred).toEqual([1])
    })

    it("has no endpoint ready when the last available one goes", () => {
      const pool = onFallback()
      pool.send("ENDPOINT_UNAVAILABLE", 2)

      pool.send("ENDPOINT_UNAVAILABLE", 1)

      expect(pool.state()).toBe("NoEndpointReady")
    })

    it("follows a request that succeeded on another fallback", () => {
      const pool = onFallback()

      pool.send("REQUEST_SUCCEEDED", 2)

      expect(pool.preferredIndex()).toBe(2)
      expect(pool.preferred).toEqual([1, 2])
    })

    it("ignores a fallback becoming ready", () => {
      const pool = onFallback()

      pool.send("ENDPOINT_READY", 2)

      expect(pool.preferredIndex()).toBe(1)
      expect(pool.preferred).toEqual([1])
    })

    it("tries the primary again once the recovery interval is up, if it is available", () => {
      const pool = harness()
      pool.send("REQUEST_SUCCEEDED", 1)

      pool.clock.increment(RECOVERY_MS - 1)
      expect(pool.state()).toBe("UsingFallback")

      pool.clock.increment(1)
      expect(pool.state()).toBe("UsingPrimary")
      expect(pool.preferred).toEqual([1, 0])
    })

    it("keeps waiting while the primary is unavailable", () => {
      const pool = onFallback()

      pool.clock.increment(RECOVERY_MS * 3)
      expect(pool.state()).toBe("UsingFallback")

      pool.send("ENDPOINT_READY", 0)
      expect(pool.state()).toBe("UsingPrimary")
    })

    it("stops the recovery timer once it has left", () => {
      const pool = harness()
      pool.send("REQUEST_SUCCEEDED", 1)
      pool.send("REQUEST_SUCCEEDED", 0)
      pool.send("ENDPOINT_UNAVAILABLE", 0)
      pool.send("ENDPOINT_UNAVAILABLE", 1)
      pool.send("ENDPOINT_UNAVAILABLE", 2)

      pool.clock.increment(RECOVERY_MS * 2)

      expect(pool.state()).toBe("NoEndpointReady")
    })
  })

  describe("in NoEndpointReady", () => {
    const withNoneReady = () => {
      const pool = harness()
      pool.send("ENDPOINT_UNAVAILABLE", 0)
      pool.send("ENDPOINT_UNAVAILABLE", 1)
      pool.send("ENDPOINT_UNAVAILABLE", 2)
      return pool
    }

    it("goes to the primary when it becomes ready", () => {
      const pool = withNoneReady()

      pool.send("ENDPOINT_READY", 0)

      expect(pool.state()).toBe("UsingPrimary")
      expect(pool.preferredIndex()).toBe(0)
    })

    it("goes to a fallback when it becomes ready", () => {
      const pool = withNoneReady()

      pool.send("ENDPOINT_READY", 2)

      expect(pool.state()).toBe("UsingFallback")
      expect(pool.preferredIndex()).toBe(2)
    })

    it("takes a success as readiness", () => {
      const pool = withNoneReady()

      pool.send("REQUEST_SUCCEEDED", 0)

      expect(pool.state()).toBe("UsingPrimary")
    })

    it("follows a success on a fallback", () => {
      const pool = withNoneReady()

      pool.send("REQUEST_SUCCEEDED", 1)

      expect(pool.state()).toBe("UsingFallback")
      expect(pool.preferredIndex()).toBe(1)
    })

    it("ignores further unavailability", () => {
      const pool = withNoneReady()

      pool.send("ENDPOINT_UNAVAILABLE", 1)

      expect(pool.state()).toBe("NoEndpointReady")
    })
  })

  describe("with a primary it keeps leaving", () => {
    // A request fails over off the primary, as Avalanche's did every minute.
    const failOver = (pool: ReturnType<typeof harness>) =>
      pool.send("REQUEST_SUCCEEDED", 1)

    it("waits longer each time before going back, up to the longest wait", () => {
      const pool = harness()

      RECOVERY_INTERVALS_MS.concat([600_000]).forEach((wait) => {
        failOver(pool)
        pool.clock.increment(wait - 1)
        expect(pool.state()).toBe("UsingFallback")
        pool.clock.increment(1)
        expect(pool.state()).toBe("UsingPrimary")
        pool.clock.increment(60_000)
      })

      expect(pool.preferred).toEqual([1, 0, 1, 0, 1, 0, 1, 0, 1, 0])
    })

    it("forgets its failovers once it has stayed on the primary for the stable period", () => {
      const pool = harness()
      failOver(pool)
      pool.clock.increment(RECOVERY_MS)
      failOver(pool)
      pool.clock.increment(30_000)
      expect(pool.state()).toBe("UsingPrimary")

      pool.clock.increment(STABLE_MS)
      failOver(pool)
      pool.clock.increment(RECOVERY_MS)

      expect(pool.state()).toBe("UsingPrimary")
    })

    it("counts a failover that comes just before the stable period is up", () => {
      const pool = harness()
      failOver(pool)
      pool.clock.increment(RECOVERY_MS)
      pool.clock.increment(STABLE_MS - 1)

      failOver(pool)
      pool.clock.increment(RECOVERY_MS)

      expect(pool.state()).toBe("UsingFallback")
    })

    it("doesn't cut a longer wait short when the primary is ready again", () => {
      const pool = harness()
      pool.send("ENDPOINT_UNAVAILABLE", 0)
      pool.send("ENDPOINT_READY", 0)
      pool.send("ENDPOINT_UNAVAILABLE", 0)

      pool.send("ENDPOINT_READY", 0)
      expect(pool.state()).toBe("UsingFallback")

      pool.clock.increment(30_000)
      expect(pool.state()).toBe("UsingPrimary")
      expect(pool.preferred).toEqual([1, 0, 1, 0])
    })

    it("still goes back at once when a request had to come round to the primary", () => {
      const pool = harness()
      failOver(pool)
      pool.clock.increment(RECOVERY_MS)
      failOver(pool)

      pool.send("REQUEST_SUCCEEDED", 0)

      expect(pool.state()).toBe("UsingPrimary")
    })

    it("still goes back at once when its fallback becomes unavailable", () => {
      const pool = harness()
      failOver(pool)
      pool.clock.increment(RECOVERY_MS)
      failOver(pool)

      pool.send("ENDPOINT_UNAVAILABLE", 1)

      expect(pool.state()).toBe("UsingPrimary")
    })

    it("goes to the primary when it is the first endpoint ready, however long the wait", () => {
      const pool = harness()
      failOver(pool)
      pool.clock.increment(RECOVERY_MS)
      ;[0, 1, 2].forEach((index) => pool.send("ENDPOINT_UNAVAILABLE", index))

      pool.send("ENDPOINT_READY", 0)

      expect(pool.state()).toBe("UsingPrimary")
    })

    it("keeps the longer wait while the primary stays unavailable", () => {
      const pool = harness()
      failOver(pool)
      pool.clock.increment(RECOVERY_MS)
      pool.send("ENDPOINT_UNAVAILABLE", 0)

      pool.clock.increment(30_000)
      expect(pool.state()).toBe("UsingFallback")
      pool.send("ENDPOINT_READY", 0)
      pool.clock.increment(29_999)
      expect(pool.state()).toBe("UsingFallback")
      pool.clock.increment(1)

      expect(pool.state()).toBe("UsingPrimary")
    })
  })

  it("works with a single endpoint", () => {
    const pool = harness(1)

    pool.send("ENDPOINT_UNAVAILABLE", 0)
    expect(pool.state()).toBe("NoEndpointReady")

    pool.send("ENDPOINT_READY", 0)
    expect(pool.state()).toBe("UsingPrimary")
    expect(pool.preferred).toEqual([])
  })
})

describe("EndpointPool", () => {
  const OPTIONS = {
    failureThreshold: 1,
    initialCooldownMs: 1_000,
  }

  const pollingTransport = () =>
    Object.assign(Object.create(JsonRpcProvider.prototype), {
      send: sinon.stub().resolves("0x1"),
      removeAllListeners: sinon.stub(),
    }) as JsonRpcProvider

  const poolOf = (size: number) => {
    const clock = new SimulatedClock()
    const endpoints = Array.from(
      { length: size },
      () =>
        new Endpoint(
          { kind: "standard", createTransport: pollingTransport },
          { clock, options: OPTIONS },
        ),
    )
    const pool = new EndpointPool("standard", endpoints, { clock })
    return { pool, endpoints, clock }
  }

  it("moves subscriptions far less often when its primary flaps", () => {
    const { pool, endpoints, clock } = poolOf(2)
    const changes: Endpoint[] = []
    pool.onPreferredEndpointChanged((endpoint) => changes.push(endpoint))

    // For 30 minutes, a request fails over off the primary every minute it's
    // preferred.
    for (let second = 0; second < 30 * 60; second += 1) {
      if (second % 60 === 0 && pool.preferredIndex === 0) {
        pool.recordSuccess(endpoints[1])
      }
      clock.increment(1_000)
    }

    // Without backing off, that was a move there and back every minute: 60.
    // Now it's back after 10 s, 30 s, 2 min, then 10 min each time, with
    // failovers at 0, 1, 2, 4, 14 and 24 minutes.
    expect(changes).toHaveLength(11)
    expect(pool.preferredIndex).toBe(1)
  })

  it("orders endpoints from the preferred one, wrapping around", () => {
    const { pool, endpoints } = poolOf(3)

    expect(pool.endpointsInTryOrder()).toEqual(endpoints)

    pool.recordSuccess(endpoints[1])

    expect(pool.preferredIndex).toBe(1)
    expect(pool.preferredEndpoint).toBe(endpoints[1])
    expect(pool.endpointsInTryOrder()).toEqual([
      endpoints[1],
      endpoints[2],
      endpoints[0],
    ])
  })

  it("leaves out endpoints that are cooling down, and moves off them", () => {
    const { pool, endpoints } = poolOf(3)
    const changes: Endpoint[] = []
    pool.onPreferredEndpointChanged((endpoint) => changes.push(endpoint))
    endpoints[0].transport

    pool.recordFailure(endpoints[0])

    expect(endpoints[0].status).toBe("CoolingDown")
    expect(pool.endpointsInTryOrder()).toEqual([endpoints[1], endpoints[2]])
    expect(changes).toEqual([endpoints[1]])
  })

  it("follows the primary back once its probe answers", async () => {
    const { pool, endpoints, clock } = poolOf(2)
    const changes: Endpoint[] = []
    pool.onPreferredEndpointChanged((endpoint) => changes.push(endpoint))
    endpoints[0].transport

    pool.recordFailure(endpoints[0])
    clock.increment(1_000)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(endpoints[0].status).toBe("Ready")
    expect(pool.preferredIndex).toBe(0)
    expect(changes).toEqual([endpoints[1], endpoints[0]])
  })

  it("knows about endpoints that were unavailable before it", () => {
    const clock = new SimulatedClock()
    const endpoints = [0, 1].map(
      () =>
        new Endpoint(
          { kind: "standard", createTransport: pollingTransport },
          { clock, options: OPTIONS },
        ),
    )
    endpoints[0].transport
    endpoints[0].recordFailure()

    const pool = new EndpointPool("standard", endpoints, { clock })

    expect(pool.preferredIndex).toBe(1)
  })

  it("stops following its endpoints once disposed", () => {
    const { pool, endpoints } = poolOf(2)
    const changes: Endpoint[] = []
    pool.onPreferredEndpointChanged((endpoint) => changes.push(endpoint))

    pool.dispose()
    pool.recordFailure(endpoints[0])

    expect(changes).toEqual([])
  })

  it("lets a listener stop listening", () => {
    const { pool, endpoints } = poolOf(2)
    const changes: Endpoint[] = []
    const stop = pool.onPreferredEndpointChanged((endpoint) =>
      changes.push(endpoint),
    )

    stop()
    pool.recordSuccess(endpoints[1])

    expect(changes).toEqual([])
  })
})
