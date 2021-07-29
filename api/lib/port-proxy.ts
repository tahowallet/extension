import { Runtime } from "webextension-polyfill-ts"

/*

port proxy makes it easier to conssue

send({
  // 'controller/method'
  route: '/transactions'
  method: 'GET'/'POST'/'DEL'
  params: {}
})


route list:

'/transactions'
'GET' full history

'/transactions/#id'
'GET' singular

"/transactions"
"POST"
params: {id:number, ...edits}

*/

// Disable default export while we reconsider how this might get consumed.
// eslint-disable-next-line import/prefer-default-export
export function createPortProxy(port: Runtime.Port) {
  const responseRegister = {}

  let idBase = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)

  port.onMessage.addListener((msg) => {
    if (responseRegister[msg.id]) {
      if (responseRegister[msg.id].type === "subscription") {
        if (msg.response) {
          if (msg.response.subscriptionTerminated) {
            delete responseRegister[msg.id]
          }
          responseRegister[msg.id].handler(msg.response)
        }
      } else {
        if (msg.error) {
          responseRegister[msg.id].reject(new Error(msg.error))
        } else {
          responseRegister[msg.id].resolve(msg.response)
        }
        delete responseRegister[msg.id]
      }
    }
  })

  function post(
    type: string,
    proxyDetails: {
      route?: string
      method: string
      params?: Record<string, unknown>
    },
    handler?
  ) {
    const { route, method, params } = proxyDetails
    const id = idBase
    idBase += 1

    if (type === "subscription") {
      port.postMessage({
        type,
        id,
        route,
        method,
        params,
      })
      responseRegister[id] = {
        type,
        handler,
      }

      return (id) =>
        post("subscription", { method: "TERMINATE", params: { id } })
    }

    return new Promise((resolve, reject) => {
      responseRegister[id] = {
        resolve,
        reject,
        type,
      }
      port.postMessage({
        id,
        route,
        method,
        params,
      })
    })
  }

  return new Proxy<any>(port, {
    get: (_, key) => {
      if (key === "send" || key === "subscriber") {
        return post.bind(undefined, key)
      }

      if (key === "unsubscribe") {
        return (id) =>
          post("subscription", { method: "TERMINATE", params: { id } })
      }

      return port[key]
    },
    set: () => {
      throw new Error("Read Only")
    },
  })
}
