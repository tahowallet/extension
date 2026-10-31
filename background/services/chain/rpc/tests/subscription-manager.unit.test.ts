import { describe, expect, it } from "bun:test"
import { EventEmitter } from "events"
import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers"
import { SimulatedClock } from "xstate"
import * as sinon from "sinon"
import Endpoint from "../endpoint"
import SubscriptionManager from "../subscription-manager"
import logger from "../../../../lib/logger"

const OPEN = 1

/** A transport whose listeners are plain emitter listeners. */
function fakeTransport(webSocket = false, readyState = OPEN) {
  const emitter = new EventEmitter()
  const base = Object.create(
    (webSocket ? WebSocketProvider : JsonRpcProvider).prototype,
  )
  const socket = Object.assign(new EventTarget(), { readyState })
  return Object.assign(base, {
    emitter,
    _websocket: socket,
    send: sinon.stub().resolves("0x1"),
    on: (event: string, listener: () => void) => emitter.on(event, listener),
    once: (event: string, listener: () => void) =>
      emitter.once(event, listener),
    off: (event: string, listener?: () => void) =>
      listener === undefined
        ? emitter.removeAllListeners(event)
        : emitter.off(event, listener),
    removeAllListeners: sinon.stub(),
    destroy: sinon.stub().callsFake(() => {
      socket.readyState = 3
      socket.dispatchEvent(new Event("close"))
    }),
    _subscribe: sinon.stub().resolves(),
  }) as JsonRpcProvider & {
    emitter: EventEmitter
    _subscribe: sinon.SinonStub
    destroy: sinon.SinonStub
  }
}

type FakeTransport = ReturnType<typeof fakeTransport>

function endpointOf(webSocket = false, readyState = OPEN) {
  const transports: FakeTransport[] = []
  const clock = new SimulatedClock()
  const endpoint = new Endpoint(
    {
      kind: "standard",
      createTransport: () => {
        const transport = fakeTransport(webSocket, readyState)
        transports.push(transport)
        return transport
      },
    },
    { clock },
  )
  return { endpoint, transports, clock }
}

const count = (transport: FakeTransport, event = "block") =>
  transport.emitter.listenerCount(event)

describe("SubscriptionManager", () => {
  it("attaches listeners to its endpoint's transport", () => {
    const { endpoint, transports } = endpointOf()
    const manager = new SubscriptionManager(endpoint)
    const listener = sinon.spy()

    manager.on("block", listener)
    transports[0].emitter.emit("block", 1)

    expect(listener.calledWith(1)).toBe(true)
  })

  it("moves listeners to a new endpoint without dropping or duplicating them", async () => {
    const first = endpointOf()
    const second = endpointOf()
    const manager = new SubscriptionManager(first.endpoint)
    const listener = sinon.spy()
    manager.on("block", listener)

    await manager.moveTo(second.endpoint)
    await manager.moveTo(first.endpoint)
    await manager.moveTo(second.endpoint)

    expect(count(first.transports[0])).toBe(0)
    expect(count(second.transports[0])).toBe(1)
    second.transports[0].emitter.emit("block", 2)
    first.transports[0].emitter.emit("block", 3)
    expect(listener.args).toEqual([[2]])
    expect(manager.endpoint).toBe(second.endpoint)
  })

  it("runs overlapping moves in order", async () => {
    const endpoints = [endpointOf(), endpointOf(), endpointOf()]
    const manager = new SubscriptionManager(endpoints[0].endpoint)
    manager.on("block", () => {})

    await Promise.all([
      manager.moveTo(endpoints[1].endpoint),
      manager.moveTo(endpoints[2].endpoint),
    ])

    expect(endpoints.map(({ transports }) => count(transports[0]))).toEqual([
      0, 0, 1,
    ])
  })

  it("forgets a once listener after it fires, so it isn't moved", async () => {
    const first = endpointOf()
    const second = endpointOf()
    const manager = new SubscriptionManager(first.endpoint)
    const listener = sinon.spy()
    manager.once("block", listener)

    first.transports[0].emitter.emit("block", 1)
    await manager.moveTo(second.endpoint)
    second.transports[0].emitter.emit("block", 2)

    expect(listener.args).toEqual([[1]])
    expect(count(second.transports[0])).toBe(0)
  })

  it("moves a once listener that hasn't fired", async () => {
    const first = endpointOf()
    const second = endpointOf()
    const manager = new SubscriptionManager(first.endpoint)
    const listener = sinon.spy()
    manager.once("block", listener)

    await manager.moveTo(second.endpoint)
    second.transports[0].emitter.emit("block", 2)
    second.transports[0].emitter.emit("block", 3)

    expect(listener.args).toEqual([[2]])
  })

  it("removes one listener, or every listener for an event", () => {
    const { endpoint, transports } = endpointOf()
    const manager = new SubscriptionManager(endpoint)
    const kept = sinon.spy()
    const removed = sinon.spy()
    manager.on("block", kept)
    manager.once("block", removed)

    manager.off("block", removed)
    transports[0].emitter.emit("block", 1)
    expect(kept.called).toBe(true)
    expect(removed.called).toBe(false)

    manager.off("block")
    expect(count(transports[0])).toBe(0)
  })

  it("keeps WebSocket subscriptions for a WebSocket endpoint", async () => {
    const polling = endpointOf()
    const socket = endpointOf(true)
    const manager = new SubscriptionManager(polling.endpoint)
    const handler = () => {}

    await manager.subscribe("tag", ["alchemy_pendingTransactions"], handler)
    await manager.moveTo(socket.endpoint)

    expect(socket.transports[0]._subscribe.args).toEqual([
      ["tag", ["alchemy_pendingTransactions"], handler],
    ])
  })

  it("moves listeners and other subscriptions past one the endpoint refuses", async () => {
    const first = endpointOf(true)
    const refusing = endpointOf(true)
    const third = endpointOf(true)
    const manager = new SubscriptionManager(first.endpoint)
    const listener = sinon.spy()
    const kept = () => {}
    manager.on("block", listener)
    await manager.subscribe("refused", [], () => {})
    await manager.subscribe("kept", [], kept)
    refusing.endpoint.transport
    refusing.transports[0]._subscribe
      .withArgs("refused")
      .rejects(new Error("alchemy_pendingTransactions is unsupported"))

    await expect(manager.moveTo(refusing.endpoint)).resolves.toBe(true)
    refusing.transports[0].emitter.emit("block", 1)
    expect(listener.args).toEqual([[1]])
    expect(refusing.transports[0]._subscribe.calledWith("kept", [], kept)).toBe(
      true,
    )

    await expect(manager.moveTo(third.endpoint)).resolves.toBe(true)
    expect(count(third.transports[0])).toBe(1)
    expect(third.transports[0]._subscribe.callCount).toBe(2)
  })

  it("keeps moving after a move that throws", async () => {
    const first = endpointOf()
    const broken = endpointOf()
    const third = endpointOf()
    const manager = new SubscriptionManager(first.endpoint)
    manager.on("block", () => {})
    broken.endpoint.transport
    broken.transports[0].on = () => {
      throw new Error("broken transport")
    }

    await expect(manager.moveTo(broken.endpoint)).resolves.toBe(false)
    await expect(manager.moveTo(third.endpoint)).resolves.toBe(true)

    expect(count(third.transports[0])).toBe(1)
  })

  it("forgets a subscription the endpoint refuses at first", async () => {
    const first = endpointOf(true)
    const second = endpointOf(true)
    const manager = new SubscriptionManager(first.endpoint)
    first.transports[0]._subscribe.rejects(new Error("unsupported"))

    await expect(manager.subscribe("refused", [], () => {})).rejects.toThrow(
      "unsupported",
    )
    await manager.moveTo(second.endpoint)

    expect(second.transports[0]._subscribe.called).toBe(false)
  })

  it("closes the socket it leaves, so its subscriptions stop", async () => {
    const socket = endpointOf(true)
    const polling = endpointOf()
    const manager = new SubscriptionManager(socket.endpoint)

    await manager.moveTo(polling.endpoint)

    expect(socket.transports[0].destroy.called).toBe(true)
  })

  it("follows its endpoint onto a new socket", async () => {
    const socket = endpointOf(true)
    const manager = new SubscriptionManager(socket.endpoint)
    const handler = () => {}
    await manager.subscribe("tag", [], handler)
    manager.on("block", () => {})

    socket.transports[0].destroy()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(socket.transports).toHaveLength(2)
    expect(socket.transports[1]._subscribe.calledWith("tag", [], handler)).toBe(
      true,
    )
    expect(count(socket.transports[1])).toBe(1)
  })

  it("reports a move to an endpoint that never becomes ready", async () => {
    const first = endpointOf()
    const second = endpointOf()
    const moves: boolean[] = []
    const manager = new SubscriptionManager(first.endpoint, {
      onMoved: (_, moved) => moves.push(moved),
    })
    second.endpoint.dispose()

    await expect(manager.moveTo(second.endpoint)).resolves.toBe(false)
    expect(moves).toEqual([false])
  })

  it("finishes a failed move once the endpoint becomes ready", async () => {
    const first = endpointOf()
    const second = endpointOf()
    const manager = new SubscriptionManager(first.endpoint)
    const listener = sinon.spy()
    manager.on("block", listener)
    second.endpoint.transport
    for (let i = 0; i < 5; i += 1) second.endpoint.recordFailure()

    await expect(manager.moveTo(second.endpoint)).resolves.toBe(false)
    second.clock.increment(15_000)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(second.endpoint.status).toBe("Ready")
    second.transports[0].emitter.emit("block", 1)
    expect(listener.args).toEqual([[1]])
  })

  it("stops a move quietly when cleared while it waits", async () => {
    const first = endpointOf()
    const connecting = endpointOf(true, 0)
    const moves: boolean[] = []
    const errors = sinon.stub(logger, "error")
    const manager = new SubscriptionManager(first.endpoint, {
      onMoved: (_, moved) => moves.push(moved),
    })
    manager.on("block", () => {})

    const move = manager.moveTo(connecting.endpoint)
    await Promise.resolve()
    connecting.endpoint.dispose()
    manager.clear()

    try {
      await expect(move).resolves.toBe(false)
      expect(moves).toEqual([])
      expect(errors.called).toBe(false)
    } finally {
      errors.restore()
    }
  })

  it("detaches and forgets everything when cleared, and moves no more", async () => {
    const first = endpointOf()
    const second = endpointOf()
    const manager = new SubscriptionManager(first.endpoint)
    manager.on("block", () => {})

    manager.clear()
    await expect(manager.moveTo(second.endpoint)).resolves.toBe(false)

    expect(count(first.transports[0])).toBe(0)
    expect(second.transports).toHaveLength(0)
  })
})
