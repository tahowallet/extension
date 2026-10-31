import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers"
import { assign, fromCallback, fromPromise, setup } from "xstate"

export type EndpointHealthOptions = {
  /** Failures within the window that start a cooldown. */
  failureThreshold: number
  failureWindowMs: number
  initialCooldownMs: number
  maxCooldownMs: number
  /** Applied to the cooldown each time a probe fails. */
  cooldownBackoffMultiplier: number
  /** How long a WebSocket gets to open. */
  socketOpenTimeoutMs: number
  /** How long a probe, including opening its socket, gets to answer. */
  probeTimeoutMs: number
}

export const DEFAULT_ENDPOINT_HEALTH_OPTIONS: EndpointHealthOptions = {
  failureThreshold: 5,
  failureWindowMs: 30_000,
  initialCooldownMs: 15_000,
  maxCooldownMs: 2 * 60_000,
  cooldownBackoffMultiplier: 2,
  socketOpenTimeoutMs: 10_000,
  probeTimeoutMs: 20_000,
}

const SOCKET_OPEN = 1

export const isWebSocketTransport = (
  transport: JsonRpcProvider | undefined,
): transport is WebSocketProvider => transport instanceof WebSocketProvider

const isOpenSocket = (transport: JsonRpcProvider | undefined) =>
  !isWebSocketTransport(transport) ||
  transport.websocket.readyState === SOCKET_OPEN

/**
 * Drops a transport's listeners, which drive Ethers' polling loop, and closes
 * its socket if it has one.
 */
export function teardownTransport(transport: JsonRpcProvider | undefined) {
  if (transport === undefined) {
    return
  }
  transport.removeAllListeners()
  if (isWebSocketTransport(transport)) {
    transport.destroy()
  }
}

type EndpointContext = {
  createTransport: () => JsonRpcProvider
  transport: JsonRpcProvider | undefined
  options: EndpointHealthOptions
  now: () => number
  failureTimestamps: number[]
  cooldownMs: number
}

export type EndpointEvent =
  | { type: "FIRST_USE" }
  | { type: "SOCKET_OPENED"; transport?: JsonRpcProvider }
  | { type: "SOCKET_CLOSED"; transport?: JsonRpcProvider }
  | { type: "REQUEST_SUCCEEDED" }
  | { type: "REQUEST_FAILED" }
  | { type: "DISPOSE" }

export type EndpointInput = {
  createTransport: () => JsonRpcProvider
  options?: Partial<EndpointHealthOptions>
  now?: () => number
}

type ObservableSocket = {
  readyState: number
  addEventListener?: (type: string, listener: () => void) => void
  removeEventListener?: (type: string, listener: () => void) => void
}

/**
 * Resolves once a WebSocket transport is open; plain transports already are.
 * The caller times it out.
 */
function socketOpened(
  transport: JsonRpcProvider,
  signal: AbortSignal,
): Promise<void> {
  if (isOpenSocket(transport)) {
    return Promise.resolve()
  }
  const socket = (transport as WebSocketProvider)
    .websocket as unknown as ObservableSocket
  if (socket.readyState > SOCKET_OPEN) {
    return Promise.reject(new Error("Socket is closed"))
  }

  return new Promise((resolve, reject) => {
    const settle = (error?: Error) => {
      socket.removeEventListener?.("open", opened)
      socket.removeEventListener?.("close", closed)
      socket.removeEventListener?.("error", closed)
      signal.removeEventListener("abort", cancelled)
      if (error === undefined) {
        resolve()
      } else {
        reject(error)
      }
    }
    const opened = () => settle()
    const closed = () => settle(new Error("Socket closed while opening"))
    const cancelled = () => settle(new Error("Probe cancelled"))
    socket.addEventListener?.("open", opened)
    socket.addEventListener?.("close", closed)
    socket.addEventListener?.("error", closed)
    signal.addEventListener("abort", cancelled, { once: true })
  })
}

/** Sends SOCKET_OPENED or SOCKET_CLOSED as the socket does. */
const watchSocket = fromCallback<
  EndpointEvent,
  { transport: JsonRpcProvider | undefined }
>(({ input: { transport }, sendBack }) => {
  if (!isWebSocketTransport(transport)) {
    return undefined
  }

  const socket = transport.websocket as unknown as ObservableSocket
  const opened = () => sendBack({ type: "SOCKET_OPENED", transport })
  const closed = () => sendBack({ type: "SOCKET_CLOSED", transport })

  if (socket.readyState === SOCKET_OPEN) {
    opened()
  } else if (socket.readyState > SOCKET_OPEN) {
    closed()
  }

  socket.addEventListener?.("open", opened)
  socket.addEventListener?.("close", closed)
  socket.addEventListener?.("error", closed)

  return () => {
    socket.removeEventListener?.("open", opened)
    socket.removeEventListener?.("close", closed)
    socket.removeEventListener?.("error", closed)
  }
})

/**
 * One RPC endpoint's transport and health: lazy construction, the WebSocket
 * lifecycle, and the cooldown after repeated failures. A cooling-down
 * endpoint probes itself once the cooldown is over.
 */
export const endpointMachine = setup({
  types: {} as {
    context: EndpointContext
    events: EndpointEvent
    input: EndpointInput
  },
  actors: {
    watchSocket,
    probe: fromPromise<void, { context: EndpointContext }>(
      async ({ input: { context }, signal }) => {
        const { transport } = context
        if (transport === undefined) {
          throw new Error("No transport to probe")
        }
        await socketOpened(transport, signal)
        await transport.send("eth_blockNumber", [])
        if (signal.aborted) {
          throw new Error("Probe cancelled")
        }
      },
    ),
  },
  delays: {
    cooldown: ({ context }) => context.cooldownMs,
    socketOpenTimeout: ({ context }) => context.options.socketOpenTimeoutMs,
    probeTimeout: ({ context }) => context.options.probeTimeoutMs,
  },
  guards: {
    /** Ignores news from a socket that has since been replaced. */
    isCurrentSocket: ({ context, event }) =>
      !("transport" in event) ||
      event.transport === undefined ||
      event.transport === context.transport,
    usesWebSocket: ({ context }) => isWebSocketTransport(context.transport),
    reachesThreshold: ({ context }) => {
      const windowStart = context.now() - context.options.failureWindowMs
      return (
        context.failureTimestamps.filter((t) => t >= windowStart).length + 1 >=
        context.options.failureThreshold
      )
    },
  },
  actions: {
    buildTransport: assign({
      transport: ({ context }) => context.createTransport(),
    }),
    /** WebSocket transports can't reopen once closed, so they're replaced. */
    replaceClosedSocket: assign({
      transport: ({ context: { transport, createTransport } }) => {
        if (
          !isWebSocketTransport(transport) ||
          transport.websocket.readyState <= SOCKET_OPEN
        ) {
          return transport
        }
        teardownTransport(transport)
        return createTransport()
      },
    }),
    teardownTransport: assign({
      transport: ({ context }) => {
        teardownTransport(context.transport)
        return undefined
      },
    }),
    recordFailure: assign({
      failureTimestamps: ({ context }) => {
        const now = context.now()
        const windowStart = now - context.options.failureWindowMs
        return [
          ...context.failureTimestamps.filter((t) => t >= windowStart),
          now,
        ]
      },
    }),
    clearFailures: assign({ failureTimestamps: [] }),
    startCooldown: assign({
      failureTimestamps: [],
      cooldownMs: ({ context }) => context.options.initialCooldownMs,
    }),
    extendCooldown: assign({
      cooldownMs: ({ context }) =>
        Math.min(
          context.cooldownMs * context.options.cooldownBackoffMultiplier,
          context.options.maxCooldownMs,
        ),
    }),
    resetCooldown: assign({
      failureTimestamps: [],
      cooldownMs: ({ context }) => context.options.initialCooldownMs,
    }),
  },
}).createMachine({
  id: "endpoint",
  context: ({ input }) => {
    const options = { ...DEFAULT_ENDPOINT_HEALTH_OPTIONS, ...input.options }
    return {
      createTransport: input.createTransport,
      transport: undefined,
      options,
      now: input.now ?? Date.now,
      failureTimestamps: [],
      cooldownMs: options.initialCooldownMs,
    }
  },
  initial: "Unbuilt",
  on: {
    DISPOSE: ".Disposed",
  },
  states: {
    Unbuilt: {
      on: {
        FIRST_USE: { target: "Building", actions: "buildTransport" },
      },
    },
    Building: {
      always: [
        { guard: "usesWebSocket", target: "Connecting" },
        { target: "Ready" },
      ],
    },
    Connecting: {
      invoke: {
        src: "watchSocket",
        input: ({ context }) => ({ transport: context.transport }),
      },
      after: {
        socketOpenTimeout: { target: "CoolingDown", actions: "startCooldown" },
      },
      on: {
        SOCKET_OPENED: { guard: "isCurrentSocket", target: "Ready" },
        SOCKET_CLOSED: {
          guard: "isCurrentSocket",
          target: "CoolingDown",
          actions: "startCooldown",
        },
      },
    },
    Ready: {
      invoke: {
        src: "watchSocket",
        input: ({ context }) => ({ transport: context.transport }),
      },
      on: {
        REQUEST_SUCCEEDED: { actions: "clearFailures" },
        REQUEST_FAILED: [
          {
            guard: "reachesThreshold",
            target: "CoolingDown",
            actions: "startCooldown",
          },
          { actions: "recordFailure" },
        ],
        // Socket transports are replaced before the new state watches them.
        SOCKET_CLOSED: {
          guard: "isCurrentSocket",
          target: "Connecting",
          actions: "replaceClosedSocket",
        },
      },
    },
    CoolingDown: {
      after: {
        cooldown: { target: "Probing", actions: "replaceClosedSocket" },
      },
    },
    Probing: {
      invoke: [
        {
          src: "probe",
          input: ({ context }) => ({ context }),
          onDone: { target: "Ready", actions: "resetCooldown" },
          onError: { target: "CoolingDown", actions: "extendCooldown" },
        },
        {
          // Ethers never settles a request on a socket that closes under it.
          src: "watchSocket",
          input: ({ context }) => ({ transport: context.transport }),
        },
      ],
      after: {
        probeTimeout: { target: "CoolingDown", actions: "extendCooldown" },
      },
      on: {
        REQUEST_SUCCEEDED: { target: "Ready", actions: "resetCooldown" },
        SOCKET_CLOSED: {
          guard: "isCurrentSocket",
          target: "CoolingDown",
          actions: "extendCooldown",
        },
      },
    },
    Disposed: {
      type: "final",
      entry: "teardownTransport",
    },
  },
})

export type EndpointStatus =
  | "Unbuilt"
  | "Connecting"
  | "Ready"
  | "CoolingDown"
  | "Probing"
  | "Disposed"
