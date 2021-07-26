import { platform } from '@tallyho/tally-api/lib/platform'
import { UI_METHODS, STATE_KEY } from '@tallyho/tally-api/constants'
import { getPersistedState, persistState } from '@tallyho/tally-api/lib/db'
import { migrate } from '@tallyho/tally-api/migrations'
import Main from  '@tallyho/tally-api'
// const persistedState = load state from idb

// instantiate main api for background process
async function constructApi () {
  const rawState = await getPersistedState(STATE_KEY)
  const newVersionState = await migrate(rawState)
  persistState(STATE_KEY, newVersionState)
  const main = new Main(newVersionState.state)
  return { main }
}

const ready = constructApi()

const state = getPersistedState()


// add listener to extension api
platform.runtime.onConnect.addListener(async (port) => {
  ++connectionCount
  const { main } = await ready
  const subscriptions = []
  port.onMessage.addListener(async (msg) => {
    // wait for main api to be ready ie determine network connectivity
    const { type, id, route, method, params = {} } = msg
    let response
    try {
      // check port name if content-script forward msg to inpage provider
      // otherwise it goes to frontend api
      if (port.name === 'content-script') response = await main.inpageProvider.request(msg)
      else if (port.name === 'ui') {
        let strippedRoute, address
        if (route.includes('0x')) {
          const split = route.split('/')
          address = split.pop()
          if (split.length) split.push('')
          strippedRoute = split.join('/')
        }
        if (type === 'subscription') {
          const args = {
            route: strippedRoute || route,
            params,
            id,
          }
          // register the subscription id
          // and subscribe
          subscriptions.push(args)
          // temp disabled
          // await main.registerSubscription(args)
          main.getApi()[strippedRoute || route].subscribe((data) => port.postMessage({
            id,
            type,
            response: data,
          }))
        }
          // sloppy
        response = await main.getApi()[strippedRoute || route][method]({ address, ...params})
      }
      port.postMessage({
        type,
        id,
        response,
      })
    } catch (error) {
      console.error(error)
      port.postMessage({
        type,
        id,
        error: error.message,
      })

    }
  })

  port.onDisconnect.addListener(() => {
    --connectionCount
    if (!connectionCount) main.disconnect()
    subscriptions.forEach((info) => main.getApi()[info.route].unsubscribe(id))
  })

})