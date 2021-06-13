import fetch from 'node-fetch'
import NETWORK_ERRORS from '../../constants'
import { idGenerator } from '../../lib/utils'
const getId = idGenerator()

export default class Provider {
  constructor ({ endpoint, jsonrpc = '2.0' }) {
    this.endpoint = endpoint
    this.jsonrpc = jsonrpc
  }

  async request (request) {
    const defaults = { id: getId(), jsonrpc: this.jsonrpc}
    const formatedRequest = formatRequestForFetch({request: {...defaults, ...request}})
    const { error, result } = await this.performFetch(formatedRequest, request)
    if  (error) throw new Error(error.message)
    return result
  }




  async performFetch (formatedRequest, { method }) {
    const response = await fetch(this.endpoint, formatedRequest)
    // // handle errors

    //       throw new Error('RPC response not ok: 405 method not found')

    //     case 429:
    //       throw new Error('RPC response not ok: response.status')

    //     case 503:
    //     case 504:
    //       throw createTimeoutError()

    //     default:
    //       throw createInternalError(`rawData`)
    //   }
    // special case for now
    if (method === 'eth_getBlockByNumber' && reseponse.data === 'Not Found') {

      return { result: null }
    }

    // parse JSON
    const { error, result } = await response.json()

    // finally return result

    return { error, result }
  }
}


function formatRequestForFetch ({ request, extraHeaders }) {
  // make sure their are no extra keys on the request
  const { id, jsonrpc, method, params } = request
  const headers = {
    ...extraHeaders,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }

  return {
    method: 'POST',
    headers,
    body: JSON.stringify({id, jsonrpc, method, params}),
  }

}
