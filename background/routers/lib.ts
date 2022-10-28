// TODO: Remove any where possible...
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Runtime, runtime } from "webextension-polyfill"
import Emittery from "emittery"
import Main from "../main"

type OptionalPropertyNames<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never
}[keyof T]

type SpreadProperties<L, R, K extends keyof L & keyof R> = {
  [P in K]: L[P] | Exclude<R[P], undefined>
}

type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

type SpreadTwo<L, R> = Id<
  Pick<L, Exclude<keyof L, keyof R>> &
    Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>> &
    Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>> &
    SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Spread<A extends readonly [...any]> = A extends [infer L, ...infer R]
  ? SpreadTwo<L, Spread<R>>
  : unknown

export const getDefaultTransport = (): Transport => {
  let reqId = 0

  const listeners = new Map<
    number,
    [resolve: (value?: unknown) => void, reject: (error?: unknown) => void]
  >()

  const port = runtime.connect({ name: "tally-rpc" })

  // TODO: add default msg type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMessages = (msg: any) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [resolve, reject] = listeners.get(msg.id)!
    if (msg.error) reject(msg.data)
    else resolve(msg.data)
  }

  port.onMessage.addListener(handleMessages)

  return {
    handleRequest: async (path, params = []) => {
      const request = { id: reqId, path, params }

      reqId += 1

      return new Promise((resolve, reject) => {
        listeners.set(request.id, [resolve, reject])

        port.postMessage(request)
      })
    },
  }
}

export const getDefaultBackgroundTransport = (): BackgroundTransport => {
  const validOrigins = new Set(
    ["popup.html", "tab.html"].map((origin) => runtime.getURL(origin))
  )

  let connection: Runtime.Port | null = null
  const emitter = new Emittery()

  runtime.onConnect.addListener((port) => {
    if (validOrigins.has(port.sender?.url ?? "") && port.name === "tally-rpc") {
      connection = port

      port.onMessage.addListener((message) => emitter.emit("message", message))
    }
  })

  return {
    send: async (message) => {
      if (!connection) throw new Error("No connection!")
      connection.postMessage(message)
    },
    addMsgHandler: (callback) => emitter.on("message", callback),
  }
}

export const routeCreatorFactory = <Dependencies>(): typeof createRoute => {
  const createRoute = <RouteHandler>(
    factory: (deps: Dependencies) => RouteHandler
  ): Route<typeof factory> => {
    return { callback: factory }
  }

  return createRoute
}

type Route<Fn> = { callback: Fn }

export const createRouter = <P extends string, R extends Record<string, any>>(
  prefix: P,
  routes: R
): { [k in keyof R & string as `${P}/${k}`]: R[k] } => {
  const result = Object.fromEntries(
    Object.entries(routes).map(([key, value]) => [`${prefix}/${key}`, value])
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result as any // TODO: Types
}

export const combineRouters = <RoutersMap extends Record<string, any>[]>(
  ...map: [...RoutersMap]
): Spread<RoutersMap> => {
  return Object.assign({}, ...Object.values(map))
}

type Transport = {
  handleRequest: (path: string, params?: unknown[]) => Promise<any>
}

export const buildRequestSender = <Routes extends Record<string, Route<any>>>(
  options: {
    transport?: Transport
  } = {}
): typeof sendRequest => {
  const { transport = getDefaultTransport() } = options

  type UnwrappedPromise<T> = T extends Promise<infer Return> ? Return : T

  const sendRequest = async <M extends keyof Routes & string>(
    path: M,
    params: Parameters<ReturnType<Routes[M]["callback"]>>
  ): Promise<
    UnwrappedPromise<ReturnType<ReturnType<Routes[M]["callback"]>>>
  > => {
    return transport.handleRequest(path, params)
  }

  return sendRequest
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BackgroundTransport<M = any> = {
  send: (message: M) => Promise<void>
  addMsgHandler: (callback: (message: M) => Promise<void>) => void
}

export const configureBackend = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Routes extends Record<string, Route<any>>,
  Deps
>(options: {
  injectedDependencies?: Deps
  transport?: BackgroundTransport
  routes: Routes
}): void => {
  const {
    transport = getDefaultBackgroundTransport(),
    injectedDependencies = {},
    routes,
  } = options

  const handleIncomingMessages = async (msg: {
    id: string
    path: string
    params: any[]
  }): Promise<void> => {
    const { id, path, params } = msg

    const handler = routes[path].callback(injectedDependencies)
    try {
      const result = await handler(...params)
      transport.send({ id, data: result })
    } catch (error) {
      transport.send({ id, data: error, error: true })
    }
  }

  transport.addMsgHandler(handleIncomingMessages)
}

export const createRoute = routeCreatorFactory<{ main: Main }>()
