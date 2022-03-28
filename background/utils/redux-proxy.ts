import { Action, AnyAction, Middleware, Observable, Store } from "redux"
import { runtime } from "webextension-polyfill"

interface StoreConnectMessage {
  type: "store-connect"
  port: MessagePort
}

interface DispatchRequest {
  type: "dispatch"
  nonce: number
  action: AnyAction
}

type DispatchResult =
  | {
      type: "success"
      payload: unknown
    }
  | {
      type: "error"
      error: unknown
    }

interface DispatchResponse {
  type: "dispatch-response"
  nonce: number
  result: DispatchResult
}

interface StateUpdateMessage {
  type: "state-update"
  state: unknown
}

type Response = StateUpdateMessage | DispatchResponse

const broadcastChannel = new BroadcastChannel("tally-state-update")

function buildStateUpdateMessage(state: unknown): StateUpdateMessage {
  return { type: "state-update", state }
}

function subscribeAndHandleStoreUpdates(store: Store) {
  let state = store.getState()

  return store.subscribe(() => {
    if (store.getState() === state) return
    state = store.getState()
    broadcastChannel.postMessage(buildStateUpdateMessage(state))
  })
}

function sendInitialState(port: MessagePort, state: unknown) {
  port.postMessage(buildStateUpdateMessage(state))
}

function dispatchToStore(store: Store, action: AnyAction) {
  return Promise.resolve(store.dispatch(action)).then(
    ({ payload }): DispatchResult => ({ type: "success", payload }),
    (error): DispatchResult => ({ type: "error", error })
  )
}

function registerDispatchHandler(store: Store, port: MessagePort) {
  async function handle(data: DispatchRequest) {
    const { action, nonce } = data

    const result = await dispatchToStore(store, action)

    const message: DispatchResponse = {
      type: "dispatch-response",
      nonce,
      result,
    }
    port.postMessage(message)
  }

  port.addEventListener(
    "message",
    ({ data }: MessageEvent<DispatchRequest>) => {
      if (data.type !== "dispatch") return

      handle(data)
    }
  )

  // Notice we are never invoking `removeEventListener`.
  // When the client disconnects, `port` should be GC'd, together with its event listeners.
}

function handleClientConnection(port: MessagePort, store: Store) {
  sendInitialState(port, store.getState())
  registerDispatchHandler(store, port)
  port.start()
}

function subscribeAndHandleClientConnections(store: Store) {
  const handle = ({ data }: MessageEvent<StoreConnectMessage>) => {
    if (data.type !== "store-connect") return
    const { port } = data

    handleClientConnection(port, store)
  }

  window.addEventListener("message", handle)

  return () => {
    window.removeEventListener("message", handle)
  }
}

export function serveStoreToClients(store: Store): () => void {
  const unsubscribeFromStoreUpdates = subscribeAndHandleStoreUpdates(store)
  const unsubscribeFromClientConnections =
    subscribeAndHandleClientConnections(store)

  return () => {
    unsubscribeFromClientConnections()
    unsubscribeFromStoreUpdates()
  }
}

async function createConnectionToServer() {
  const { port1: localPort, port2: remotePort } = new MessageChannel()

  const storeConnectMessage: StoreConnectMessage = {
    type: "store-connect",
    port: remotePort,
  }

  const backgroundPage = await runtime.getBackgroundPage()

  backgroundPage.postMessage(storeConnectMessage, "*", [remotePort])

  return localPort
}

function subscribeToRemoteState(callback: (newState: unknown) => void) {
  const handle = ({ data }: MessageEvent<StateUpdateMessage>) => {
    if (data.type !== "state-update") return
    callback(data.state)
  }

  broadcastChannel.addEventListener("message", handle)

  return () => {
    broadcastChannel.removeEventListener("message", handle)
  }
}

function startAndWaitForInitialRemoteState(port: MessagePort): unknown {
  return new Promise((resolve) => {
    const handle = ({ data }: MessageEvent<Response>) => {
      if (data.type !== "state-update") return
      resolve(data.state)
      port.removeEventListener("message", handle)
    }

    port.addEventListener("message", handle)
    port.start()
  })
}

function waitForDispatchResult(nonce: number, port: MessagePort) {
  return new Promise<unknown>((resolve, reject) => {
    function handle({ data }: MessageEvent<Response>) {
      if (data.type === "dispatch-response" && data.nonce === nonce) {
        if (data.result.type === "success") {
          resolve(data.result.payload)
        } else {
          reject(data.result.error)
        }

        port.removeEventListener("message", handle)
      }
    }

    port.addEventListener("message", handle)
  })
}

async function dispatchRemoteAction<T>(
  action: Action<T>,
  nonce: number,
  port: MessagePort
) {
  const message: DispatchRequest = { type: "dispatch", action, nonce }
  port.postMessage(message)

  return waitForDispatchResult(nonce, port)
}

function createRemoteDispatchFunction(port: MessagePort) {
  let nextDispatchNonce = 0

  return <T>(action: Action<T>) => {
    const nonce = nextDispatchNonce
    nextDispatchNonce += 1
    return dispatchRemoteAction<T>(action, nonce, port) as never // Work around imprecise typing
  }
}

function wrapStoreAsObservable(store: Store): Observable<unknown> {
  return {
    subscribe(listener) {
      const unsubscribe = store.subscribe(() => {
        listener.next?.(store.getState())
      })
      return { unsubscribe }
    },
    [Symbol.observable]() {
      return this
    },
  }
}

interface ProxyStore extends Store {
  close: () => void
}

function createProxyStore({
  dispatch,
  getState,
  unsubscribe,
}: {
  dispatch: <T>(action: Action<T>) => T
  getState: () => unknown
  unsubscribe: () => void
}): ProxyStore {
  return {
    dispatch<T>(action: Action<T>) {
      return dispatch(action)
    },
    getState() {
      return getState()
    },
    replaceReducer() {
      throw new Error(`unsupported`)
    },
    subscribe(listener) {
      return subscribeToRemoteState(listener)
    },
    close() {
      unsubscribe()
    },
    [Symbol.observable]() {
      return wrapStoreAsObservable(this)
    },
  }
}

/**
 * Creates and returns a new proxy store. This is a redux store
 * that works like any redux store, except that its contents and actions are
 * proxied to and from the master background store created when the API package
 * is first imported.
 *
 * The returned Promise resolves once the proxy store is ready and hydrated
 * with the current background store data.
 */
export async function connectToRemoteStore(): Promise<ProxyStore> {
  let state: unknown

  const unsubscribe = subscribeToRemoteState((newState: unknown) => {
    state = newState
  })

  const port = await createConnectionToServer()

  state = await startAndWaitForInitialRemoteState(port)

  return createProxyStore({
    dispatch: createRemoteDispatchFunction(port),
    getState: () => state,
    unsubscribe,
  })
}

export function createAliasMiddleware(
  allAliases: Record<string, (action: never) => unknown>
): Middleware {
  return () => (next) => (action) => {
    const alias = allAliases[action.type]

    if (alias) {
      return next(
        /* Working around unknown typing here. Typing must be checked elsewhere. */
        alias(action as never) as never
      )
    }

    return next(action)
  }
}
