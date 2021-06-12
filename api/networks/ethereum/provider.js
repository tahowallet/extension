import fetch from 'node-fetch'
import NETWORK_ERRORS from '../../constatnts'
import { idGenerator } from '../lib/utils'
const getId = idGenerator()

export default class Provider {
  constructor ({ endpoint, jsonrpc = 2 }) {
    this.endpoint = endpoint
    this.jsonrpc = jsonrpc
  }

  async request (request) {
    const defaults = { id: getId().value, jsonrpc: this.jsonrpc}
    const formatedRequest = formatRequestForFetch({defaults, ...request})
    const {error, result} = await performFetch(formatedRequest)
    if  (error) thrown new Error(error)
    return result
  }




  async performFetch (formatedRequest) {
    const response = await fetch(this.endpoint, formatedRequest)
    const rawData = await response.text()
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
    if (req.method === 'eth_getBlockByNumber' && rawData === 'Not Found') {
      res.result = null
      return
    }

    // parse JSON
    const { error, result } = JSON.parse(rawData)

    // finally return result

    return { error, result }
  }
}


function formatRequestForFetch ({ request, extraHeaders }) {
  // make sure their are no extra keys on the request
  const { id, jsonrpc, method, params } = request
  const headers = {
    ...extraHeaders
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }

  return {
    fetchParams: {
      method: 'POST',
      headers,
      body: JSON.stringify({id, jsonrpc, method, params}),
    },
  }
}
