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

export function createPortProxy (port) {
  const responseRegister = {}
  let idBase = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
  port.onMessage.addListener((msg) => {
    if (window.LOG_MSG) console.log('msg', msg)
    if (responseRegister[msg.id]) {
      if(responseRegister[msg.id].type === 'subscription') {
        if (msg.response) {
          if (msg.response.subscriptionTerminated) delete responseRegister[msg.id]
          responseRegister[msg.id].handler(msg.response)
        }
      } else {
        if (msg.error){
          responseRegister[msg.id].reject(new Error(msg.error))
        } else {
          responseRegister[msg.id].resolve(msg.response)
        }
        delete responseRegister[msg.id]
      }
    }
  })

  function post (type, { route, method, params }, handler) {
    const id = idBase++
    if (type === 'subscription') {
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

      return (id) => post('subscription', { method: 'TERMINATE', params: {id} })
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

  return new Proxy(port, {
    get: (_, key) => {
      switch (key) {
        case 'send': return post.bind(undefined, 'send')
        case 'subscribe': return post.bind(undefined, 'subscription')
        case 'unsubscribe': return (id) => post('subscription', { method: 'TERMINATE', params: {id} })
        default: return port[key]
      }
    },
    set: () => {
      throw new Error('Read Only')
    },

  })
}




