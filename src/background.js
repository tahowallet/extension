import { createPortProxy } from '@tallyho/tally-api/lib/port-proxy'
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
  console.log('heeeeeeeere')
  return { main }
}

const ready = constructApi()

const state = getPersistedState()


// add listener to extension api
platform.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (msg) => {
    // wait for main api to be ready ie determine network connectivity
    const { main } = await ready

    const { type, id, route, method, params = {} } = msg
    try {
      let response
      // check port name if content-script forward msg to inpage provider
      // otherwise it goes to frontend api
      if (port.name === 'content-script') response = await main.inpageProvider.request(msg)
      else if (port.name === 'ui') {
        let strippedRoute, address
        if (route.includes('0x')) {
          const split = route.split('/')
          address = split.pop()
          strippedRoute = split.join('/')
        }
        if (type === 'subscription') {
          const args = {
            route,
            params,
            id
          }
          // register the subscription id
          // and subscribe
          response = await main.registerSubscription(args)
          main.getApi()[strippedRoute || route][method]({ address, ...params[0]})
        } else {
          // sloppy
          response = await main.getApi()[strippedRoute || route][method]({ address, ...params[0]})
        }
      }
      port.postMessage({
        type,
        id,
        response,
      })
    } catch (error) {
      port.postMessage({
        type,
        id,
        error: error.message,
      })

    }
  })
})