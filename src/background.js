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
  const main = new Main({ state: newVersionState.state })
  main.state.on('update', (state) => {
    persistState(state)
  })
  return { main }
}


const ready = constructApi()
let connectionCount = 0


// add listener to extension api
platform.runtime.onConnect.addListener(async (port) => {
  ++connectionCount
  const { main } = await ready
  port.onMessage.addListener(async (msg) => {
    // wait for main api to be ready ie determine network connectivity
    const { id, route, method, params = {} } = msg
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
        // sloppy
        response = await main.getApi(params)[strippedRoute || route][method]({ address, ...params[0]})
      }
      port.postMessage({
        id,
        response,
      })
    } catch (error) {
      port.postMessage({
        id,
        error: error.message,
      })

    }
  })

  port.onDisconnect(() => {
    --connectionCount
    if (!connectionCount) main.disconnect
  })
})