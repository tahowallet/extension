import startApi, { browser } from '@tallyho/tally-api'

const ready = startApi()

// add listener to extension api
browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (msg) => {
    // wait for main api to be ready ie determine network connectivity
    const { main } = await ready

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
})
