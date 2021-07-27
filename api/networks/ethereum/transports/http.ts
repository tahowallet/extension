import fetch from 'node-fetch'

import { TRANSPORT_TYPES } from '../../../constants'

export default class HttpProvider {
  type : string // TODO move to a proper enum
  endpoint : string

  constructor (endpoint : string) {
    this.type = TRANSPORT_TYPES.http
    if (!endpoint.includes('https://') || !endpoint.includes('http://')) {
      throw new Error('Not a http endpoint')
    }
    this.endpoint = endpoint
  }

  async performSend (request : any, { method } : { method : string, [index : string] : any } ) {

    const formattedRequest = formatRequestForFetch(request) // TODO add defaults

    const response = await fetch(this.endpoint, formattedRequest)
    // special case for now
    if (method === 'eth_getBlockByNumber' && response.data === 'Not Found') {
      return { result: null }
    }

    // parse JSON
    const { error, result } = await response.json()

    if (error) throw new Error(error.message)

    // finally return result
    return result
  }

}

function formatRequestForFetch (request : any, extraHeaders : { [index : string] : any} = {}) {
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
