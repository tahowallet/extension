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
  persistedState(newVersionState)
  const main = new Main(newVersionState.state)
  return { main }
}

const ready = constructMainApi()

const state = loadState()

// add listener to extension api
platform.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (msg) => {
    // wait for main api to be ready ie determine network connectivity
    const { main } = await ready

    const params = msg.params || []
    const id = msg.id
    try {
      let response
      // check port name if content-script forward msg to inpage provider
      // otherwise it goes to frontend api
      if (port.name === 'content-script') response = await main.inpageProvider.request(msg)
      else if (port.name === 'ui') {
        // parse api method from route
        const method = uiRouteToApi(msg.route, msg.method, main.getApi())
        response = await method(params)
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



// TODO: grab address from path
//
function uiRouteToApi (route, method, api) {
  const { schema } = UI_METHODS
  // extract inline params such as addresses or anything that could be
  // considered a ID
  const methodInfo = route.split('/').reduce((agg, str, index, source) => {
    if (!str) return agg
    if(str.includes('0x')) agg.inlineParam.push(str)
    else agg.path = agg.path.concat(`/${str}`)
  }, {path: '', inlineParam: []})

  // find api method
  return methodInfo.path.route.split('/').reduce((apiMethod, path, index, source) => {
    if (!path) return apiMethod
    if (index === source.length - 1) {
      const finalPath = `${UI_METHODS[method]}${path.charAt(0).toUpperCase()}${path.slice(1)}`
      if(schema[methodInfo.path] && schema[methodInfo.path].optionalPathParam) {
        const paramMap = schema[methodInfo.path].pathParamKeys.reduce((agg, key, index) => {
          agg[key] = methodInfo.inlineParam[index]
          return agg
        }, {})
        return (params) => {
          return apiMethod({ ...params, ...paramMap })
        }
      }
      return apiMethod[finalPath]
    }
    return apiMethod[path]
  }, api)
}
