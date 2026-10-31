import { describe, expect, it } from "bun:test"
import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers"
import { createActor, SimulatedClock } from "xstate"
import * as sinon from "sinon"
import { endpointMachine, EndpointEvent } from "../endpoint-machine"
import Endpoint, { BreakerTransition } from "../endpoint"

const CONNECTING = 0
const OPEN = 1
const CLOSED = 3

class FakeSocket extends EventTarget {
  readyState = CONNECTING

  open() {
    this.readyState = OPEN
    this.dispatchEvent(new Event("open"))
  }

  close() {
    this.readyState = CLOSED
    this.dispatchEvent(new Event("close"))
  }

  fail() {
    this.readyState = CLOSED
    this.dispatchEvent(new Event("error"))
  }
}

type FakeTransport = JsonRpcProvider & {
  send: sinon.SinonStub
  removeAllListeners: sinon.SinonStub
  destroy?: sinon.SinonStub
  websocket?: FakeSocket
  _websocket?: FakeSocket
}

const pollingTransport = (): FakeTransport =>
  Object.assign(Object.create(JsonRpcProvider.prototype), {
    send: sinon.stub().resolves("0x1"),
    removeAllListeners: sinon.stub(),
  })

const socketTransport = (readyState = CONNECTING): FakeTransport =>
  Object.assign(Object.create(WebSocketProvider.prototype), {
    send: sinon.stub().resolves("0x1"),
    removeAllListeners: sinon.stub(),
    destroy: sinon.stub(),
    _websocket: Object.assign(new FakeSocket(), { readyState }),
  })

const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve()
  }
}

const OPTIONS = {
  failureThreshold: 5,
  failureWindowMs: 30_000,
  initialCooldownMs: 15_000,
  maxCooldownMs: 120_000,
  cooldownBackoffMultiplier: 2,
  socketOpenTimeoutMs: 10_000,
  probeTimeoutMs: 20_000,
}

function harness(makeTransport: () => FakeTransport = pollingTransport) {
  const clock = new SimulatedClock()
  const transports: FakeTransport[] = []
  const actor = createActor(endpointMachine, {
    input: {
      createTransport: () => {
        const transport = makeTransport()
        transports.push(transport)
        return transport
      },
      options: OPTIONS,
      now: () => clock.now(),
    },
    clock,
  })
  actor.start()

  const send = (event: EndpointEvent) => actor.send(event)
  const state = () => actor.getSnapshot().value
  const fail = (times: number) => {
    for (let i = 0; i < times; i += 1) {
      send({ type: "REQUEST_FAILED" })
    }
  }
  const coolDown = () => {
    send({ type: "FIRST_USE" })
    fail(5)
  }

  return { actor, clock, transports, send, state, fail, coolDown }
}

describe("endpointMachine", () => {
  describe("in Unbuilt", () => {
    it("builds nothing until first use", () => {
      const endpoint = harness()

      expect(endpoint.state()).toBe("Unbuilt")
      expect(endpoint.transports).toHaveLength(0)
    })

    it("builds a polling transport and becomes ready on first use", () => {
      const endpoint = harness()

      endpoint.send({ type: "FIRST_USE" })

      expect(endpoint.state()).toBe("Ready")
      expect(endpoint.transports).toHaveLength(1)
    })

    it("builds a WebSocket transport and waits for it to connect", () => {
      const endpoint = harness(() => socketTransport())

      endpoint.send({ type: "FIRST_USE" })

      expect(endpoint.state()).toBe("Connecting")
    })

    it("goes straight to ready for a socket that is already open", () => {
      const endpoint = harness(() => socketTransport(OPEN))

      endpoint.send({ type: "FIRST_USE" })

      expect(endpoint.state()).toBe("Ready")
    })

    it.each<EndpointEvent["type"]>([
      "REQUEST_FAILED",
      "REQUEST_SUCCEEDED",
      "SOCKET_OPENED",
      "SOCKET_CLOSED",
    ])("ignores %s", (type) => {
      const endpoint = harness()

      endpoint.send({ type } as EndpointEvent)

      expect(endpoint.state()).toBe("Unbuilt")
      expect(endpoint.transports).toHaveLength(0)
    })

    it("is disposed without ever building a transport", () => {
      const endpoint = harness()

      endpoint.send({ type: "DISPOSE" })

      expect(endpoint.state()).toBe("Disposed")
      expect(endpoint.actor.getSnapshot().status).toBe("done")
      expect(endpoint.transports).toHaveLength(0)
    })
  })

  describe("in Connecting", () => {
    it("becomes ready once the socket opens", () => {
      const endpoint = harness(() => socketTransport())
      endpoint.send({ type: "FIRST_USE" })

      endpoint.transports[0].websocket?.open()

      expect(endpoint.state()).toBe("Ready")
    })

    it.each(["close", "fail"] as const)(
      "cools down when the socket %ss before opening",
      (outcome) => {
        const endpoint = harness(() => socketTransport())
        endpoint.send({ type: "FIRST_USE" })

        endpoint.transports[0].websocket?.[outcome]()

        expect(endpoint.state()).toBe("CoolingDown")
      },
    )

    it("cools down when the socket takes too long to open", () => {
      const endpoint = harness(() => socketTransport())
      endpoint.send({ type: "FIRST_USE" })

      endpoint.clock.increment(9_999)
      expect(endpoint.state()).toBe("Connecting")

      endpoint.clock.increment(1)
      expect(endpoint.state()).toBe("CoolingDown")
    })

    it("probes with a new socket after one that never opened", () => {
      const endpoint = harness(() => socketTransport())
      endpoint.send({ type: "FIRST_USE" })
      const [stuck] = endpoint.transports

      endpoint.clock.increment(10_000)
      endpoint.clock.increment(15_000)

      expect(endpoint.state()).toBe("Probing")
      expect(endpoint.transports).toHaveLength(2)
      expect(stuck.destroy?.called).toBe(true)
    })

    it("cancels the open timeout when the socket opens", () => {
      const endpoint = harness(() => socketTransport())
      endpoint.send({ type: "FIRST_USE" })

      endpoint.transports[0].websocket?.open()
      endpoint.clock.increment(10_000)

      expect(endpoint.state()).toBe("Ready")
    })

    it.each<EndpointEvent["type"]>(["REQUEST_FAILED", "REQUEST_SUCCEEDED"])(
      "ignores %s",
      (type) => {
        const endpoint = harness(() => socketTransport())
        endpoint.send({ type: "FIRST_USE" })

        endpoint.send({ type } as EndpointEvent)

        expect(endpoint.state()).toBe("Connecting")
      },
    )

    it("closes the socket and stops listening to it when disposed", () => {
      const endpoint = harness(() => socketTransport())
      endpoint.send({ type: "FIRST_USE" })
      const [transport] = endpoint.transports

      endpoint.send({ type: "DISPOSE" })
      transport.websocket?.open()
      endpoint.clock.increment(10_000)

      expect(endpoint.state()).toBe("Disposed")
      expect(transport.destroy?.called).toBe(true)
      expect(transport.removeAllListeners.called).toBe(true)
    })
  })

  describe("in Ready", () => {
    it("stays ready below the failure threshold", () => {
      const endpoint = harness()
      endpoint.send({ type: "FIRST_USE" })

      endpoint.fail(4)

      expect(endpoint.state()).toBe("Ready")
    })

    it("cools down on reaching the failure threshold", () => {
      const endpoint = harness()
      endpoint.send({ type: "FIRST_USE" })

      endpoint.fail(5)

      expect(endpoint.state()).toBe("CoolingDown")
    })

    it("forgets failures after a success", () => {
      const endpoint = harness()
      endpoint.send({ type: "FIRST_USE" })

      endpoint.fail(4)
      endpoint.send({ type: "REQUEST_SUCCEEDED" })
      endpoint.fail(4)

      expect(endpoint.state()).toBe("Ready")
    })

    it("counts a failure exactly one window old", () => {
      const endpoint = harness()
      endpoint.send({ type: "FIRST_USE" })

      endpoint.fail(1)
      endpoint.clock.increment(30_000)
      endpoint.fail(4)

      expect(endpoint.state()).toBe("CoolingDown")
    })

    it("drops a failure older than the window", () => {
      const endpoint = harness()
      endpoint.send({ type: "FIRST_USE" })

      endpoint.fail(1)
      endpoint.clock.increment(30_001)
      endpoint.fail(4)

      expect(endpoint.state()).toBe("Ready")
    })

    it("reconnects with a new socket when the socket closes", () => {
      let built = 0
      const endpoint = harness(() => {
        built += 1
        return socketTransport(built === 1 ? OPEN : CONNECTING)
      })
      endpoint.send({ type: "FIRST_USE" })
      const [first] = endpoint.transports

      first.websocket?.close()

      expect(endpoint.state()).toBe("Connecting")
      expect(endpoint.transports).toHaveLength(2)
      expect(first.destroy?.called).toBe(true)

      endpoint.transports[1].websocket?.open()
      expect(endpoint.state()).toBe("Ready")
    })

    it("stops listening to a socket it has replaced", () => {
      let built = 0
      const endpoint = harness(() => {
        built += 1
        return socketTransport(built === 1 ? OPEN : CONNECTING)
      })
      endpoint.send({ type: "FIRST_USE" })
      const [first] = endpoint.transports
      first.websocket?.close()
      endpoint.transports[1].websocket?.open()

      first.websocket?.close()

      expect(endpoint.state()).toBe("Ready")
      expect(endpoint.transports).toHaveLength(2)
    })

    it("ignores SOCKET_OPENED and FIRST_USE", () => {
      const endpoint = harness()
      endpoint.send({ type: "FIRST_USE" })

      endpoint.send({ type: "SOCKET_OPENED" })
      endpoint.send({ type: "FIRST_USE" })

      expect(endpoint.state()).toBe("Ready")
      expect(endpoint.transports).toHaveLength(1)
    })
  })

  describe("in CoolingDown", () => {
    it("probes once the cooldown is over, and not a moment before", async () => {
      const endpoint = harness()
      endpoint.coolDown()

      endpoint.clock.increment(14_999)
      expect(endpoint.state()).toBe("CoolingDown")

      endpoint.clock.increment(1)
      expect(endpoint.state()).toBe("Probing")
      await flush()
      expect(
        endpoint.transports[0].send.calledWith("eth_blockNumber", []),
      ).toBe(true)
    })

    it("ignores stray failures without extending the cooldown", () => {
      const endpoint = harness()
      endpoint.coolDown()

      endpoint.clock.increment(10_000)
      endpoint.fail(10)
      endpoint.clock.increment(5_000)

      expect(endpoint.state()).toBe("Probing")
    })

    it.each<EndpointEvent["type"]>([
      "REQUEST_SUCCEEDED",
      "SOCKET_OPENED",
      "SOCKET_CLOSED",
      "FIRST_USE",
    ])("ignores %s", (type) => {
      const endpoint = harness()
      endpoint.coolDown()

      endpoint.send({ type } as EndpointEvent)

      expect(endpoint.state()).toBe("CoolingDown")
    })

    it("cancels the cooldown timer when disposed", () => {
      const endpoint = harness()
      endpoint.coolDown()

      endpoint.send({ type: "DISPOSE" })
      endpoint.clock.increment(15_000)

      expect(endpoint.state()).toBe("Disposed")
      expect(endpoint.transports[0].send.called).toBe(false)
    })
  })

  describe("in Probing", () => {
    it("becomes ready when the probe answers, with the cooldown reset", async () => {
      const endpoint = harness()
      endpoint.coolDown()
      endpoint.transports[0].send.rejects(new Error("NETWORK_ERROR"))
      endpoint.clock.increment(15_000)
      await flush()
      // Probe failed: the next cooldown is 30 seconds.
      endpoint.transports[0].send.resolves("0x2")
      endpoint.clock.increment(30_000)
      await flush()

      expect(endpoint.state()).toBe("Ready")

      endpoint.fail(5)
      endpoint.clock.increment(14_999)
      expect(endpoint.state()).toBe("CoolingDown")
      endpoint.clock.increment(1)
      expect(endpoint.state()).toBe("Probing")
    })

    it("cools down for twice as long when the probe fails", async () => {
      const endpoint = harness()
      endpoint.coolDown()
      endpoint.transports[0].send.rejects(new Error("NETWORK_ERROR"))
      endpoint.clock.increment(15_000)
      await flush()

      expect(endpoint.state()).toBe("CoolingDown")
      endpoint.clock.increment(29_999)
      expect(endpoint.state()).toBe("CoolingDown")
      endpoint.clock.increment(1)
      expect(endpoint.state()).toBe("Probing")
    })

    it("caps the cooldown", async () => {
      const endpoint = harness()
      endpoint.coolDown()
      endpoint.transports[0].send.rejects(new Error("NETWORK_ERROR"))

      // 15s, then 30s, 60s, 120s, and 120s again.
      for (const cooldown of [15_000, 30_000, 60_000, 120_000, 120_000]) {
        expect(endpoint.state()).toBe("CoolingDown")
        endpoint.clock.increment(cooldown - 1)
        expect(endpoint.state()).toBe("CoolingDown")
        endpoint.clock.increment(1)
        expect(endpoint.state()).toBe("Probing")
        // oxlint-disable-next-line no-await-in-loop
        await flush()
      }
    })

    it("becomes ready when a request in flight succeeds", () => {
      const endpoint = harness()
      endpoint.coolDown()
      endpoint.transports[0].send.returns(new Promise(() => {}))
      endpoint.clock.increment(15_000)

      endpoint.send({ type: "REQUEST_SUCCEEDED" })

      expect(endpoint.state()).toBe("Ready")
    })

    it("ignores failures while the probe is out", () => {
      const endpoint = harness()
      endpoint.coolDown()
      endpoint.transports[0].send.returns(new Promise(() => {}))
      endpoint.clock.increment(15_000)

      endpoint.fail(10)

      expect(endpoint.state()).toBe("Probing")
    })

    it("ignores a probe that answers after the endpoint was disposed", async () => {
      const endpoint = harness()
      endpoint.coolDown()
      let answer: (value: string) => void = () => {}
      endpoint.transports[0].send.returns(
        new Promise((resolve) => {
          answer = resolve
        }),
      )
      endpoint.clock.increment(15_000)

      endpoint.send({ type: "DISPOSE" })
      answer("0x3")
      await flush()

      expect(endpoint.state()).toBe("Disposed")
      expect(endpoint.transports).toHaveLength(1)
      expect(endpoint.transports[0].removeAllListeners.called).toBe(true)
    })

    it("cools down for longer when the probe doesn't answer in time", () => {
      const endpoint = harness()
      endpoint.coolDown()
      endpoint.transports[0].send.returns(new Promise(() => {}))
      endpoint.clock.increment(15_000)

      endpoint.clock.increment(19_999)
      expect(endpoint.state()).toBe("Probing")
      endpoint.clock.increment(1)
      expect(endpoint.state()).toBe("CoolingDown")
      endpoint.clock.increment(30_000)
      expect(endpoint.state()).toBe("Probing")
    })

    it("cools down for longer when the socket closes under the probe", () => {
      const endpoint = harness(() => socketTransport(OPEN))
      endpoint.coolDown()
      endpoint.transports[0].send.returns(new Promise(() => {}))
      endpoint.clock.increment(15_000)
      expect(endpoint.state()).toBe("Probing")

      endpoint.transports[0].websocket?.close()

      expect(endpoint.state()).toBe("CoolingDown")
      endpoint.clock.increment(29_999)
      expect(endpoint.state()).toBe("CoolingDown")
      endpoint.clock.increment(1)
      expect(endpoint.state()).toBe("Probing")
    })

    it("gives a replacement socket until the probe timeout to open", async () => {
      let built = 0
      const endpoint = harness(() => {
        built += 1
        return socketTransport(built === 1 ? OPEN : CONNECTING)
      })
      endpoint.send({ type: "FIRST_USE" })
      endpoint.fail(5)
      endpoint.transports[0].websocket!.readyState = CLOSED
      endpoint.clock.increment(15_000)
      await flush()

      expect(endpoint.transports).toHaveLength(2)
      endpoint.clock.increment(19_999)
      expect(endpoint.state()).toBe("Probing")
      endpoint.clock.increment(1)
      expect(endpoint.state()).toBe("CoolingDown")
    })

    it("replaces a closed socket and waits for it to open before probing", async () => {
      const endpoint = harness(() => socketTransport(OPEN))
      endpoint.send({ type: "FIRST_USE" })
      endpoint.fail(5)
      endpoint.transports[0].websocket!.readyState = CLOSED

      endpoint.clock.increment(15_000)

      expect(endpoint.state()).toBe("Probing")
      expect(endpoint.transports).toHaveLength(2)
      expect(endpoint.transports[1].send.called).toBe(false)

      endpoint.transports[1].websocket?.open()
      await flush()

      expect(endpoint.transports[1].send.calledWith("eth_blockNumber")).toBe(
        true,
      )
      expect(endpoint.state()).toBe("Ready")
    })
  })

  describe("in Disposed", () => {
    it("tears down the transport once and ignores everything after", () => {
      const endpoint = harness()
      endpoint.send({ type: "FIRST_USE" })

      endpoint.send({ type: "DISPOSE" })
      endpoint.send({ type: "FIRST_USE" })
      endpoint.fail(5)
      endpoint.clock.increment(60_000)

      expect(endpoint.state()).toBe("Disposed")
      expect(endpoint.transports).toHaveLength(1)
      expect(endpoint.transports[0].removeAllListeners.callCount).toBe(1)
    })
  })
})

describe("Endpoint", () => {
  const endpointWith = (makeTransport: () => FakeTransport) => {
    const clock = new SimulatedClock()
    const transitions: BreakerTransition[] = []
    const transports: FakeTransport[] = []
    const endpoint = new Endpoint(
      {
        kind: "standard",
        createTransport: () => {
          const transport = makeTransport()
          transports.push(transport)
          return transport
        },
      },
      {
        clock,
        options: OPTIONS,
        onBreakerTransition: (next) => transitions.push(next),
      },
    )
    return { endpoint, clock, transitions, transports }
  }

  it("is available while unbuilt, connecting, or ready, and not otherwise", async () => {
    const { endpoint, clock, transports } = endpointWith(() =>
      socketTransport(),
    )
    expect([endpoint.status, endpoint.isAvailable]).toEqual(["Unbuilt", true])

    endpoint.transport
    expect([endpoint.status, endpoint.isAvailable]).toEqual([
      "Connecting",
      true,
    ])

    transports[0].websocket?.open()
    expect([endpoint.status, endpoint.isAvailable]).toEqual(["Ready", true])

    for (let i = 0; i < 5; i += 1) endpoint.recordFailure()
    expect([endpoint.status, endpoint.isAvailable]).toEqual([
      "CoolingDown",
      false,
    ])

    transports[0].send.returns(new Promise(() => {}))
    clock.increment(15_000)
    expect([endpoint.status, endpoint.isAvailable]).toEqual(["Probing", false])

    endpoint.dispose()
    expect([endpoint.status, endpoint.isAvailable]).toEqual(["Disposed", false])
    expect(endpoint.isDisposed).toBe(true)
  })

  it("reports cooldowns as breaker transitions", async () => {
    const { endpoint, clock, transitions } = endpointWith(pollingTransport)
    endpoint.transport

    for (let i = 0; i < 5; i += 1) endpoint.recordFailure()
    clock.increment(15_000)
    await flush()

    expect(transitions).toEqual(["open", "half-open", "closed"])
  })

  it("builds nothing after it is disposed", () => {
    const { endpoint, transports } = endpointWith(pollingTransport)

    endpoint.dispose()

    expect(() => endpoint.transport).toThrow("Endpoint has been disposed")
    expect(transports).toHaveLength(0)
    expect(endpoint.builtTransport).toBeUndefined()
  })

  it("waits for a connecting socket before sending", async () => {
    const { endpoint, transports } = endpointWith(() => socketTransport())

    const sent = endpoint.send("eth_call", [])
    expect(transports[0].send.called).toBe(false)

    transports[0].websocket?.open()

    await expect(sent).resolves.toBe("0x1")
    expect(transports[0].send.calledWith("eth_call", [])).toBe(true)
  })

  it("sends straight away when ready", () => {
    const { endpoint, transports } = endpointWith(pollingTransport)

    endpoint.send("eth_call", [])

    expect(transports[0].send.calledWith("eth_call", [])).toBe(true)
  })

  it("fails a wait that ends in a cooldown or a disposal", async () => {
    const closing = endpointWith(() => socketTransport())
    const cooled = closing.endpoint.whenReady()
    closing.transports[0].websocket?.close()
    await expect(cooled).rejects.toThrow("NETWORK_ERROR")

    const disposing = endpointWith(() => socketTransport())
    const disposed = disposing.endpoint.whenReady()
    disposing.endpoint.dispose()
    await expect(disposed).rejects.toThrow("Endpoint has been disposed")
  })

  it("exposes its configuration", () => {
    const endpoint = new Endpoint({
      kind: "managed",
      capabilities: ["alchemy_"],
      createTransport: pollingTransport,
    })

    expect(endpoint.kind).toBe("managed")
    expect(endpoint.capabilities).toEqual(["alchemy_"])
    expect(
      new Endpoint({ kind: "standard", createTransport: pollingTransport })
        .capabilities,
    ).toEqual([])
  })
})
