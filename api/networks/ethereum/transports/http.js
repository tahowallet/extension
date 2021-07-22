import fetch from 'node-fetch'

import { TRANSPORT_TYPES } from '../../../constants'


export default class HttpProvider {
  constructor (endpoint) {
    this.type = TRANSPORT_TYPES.http
    if (!endpoint.includes('https://') || !endpoint.includes('http://')) {
      throw new Error('Not a http endpoint')
    }
  }

  async performSend (request, { method }) {

    const formatedRequest = formatRequestForFetch({request: {...defaults, ...request}})

    const response = await fetch(this.endpoint, formatedRequest)
    // special case for now
    if (method === 'eth_getBlockByNumber' && reseponse.data === 'Not Found') {
      return { result: null }
    }

    // parse JSON
    const { error, result } = await response.json()

    if (error) throw new Error(error.message)

    // finally return result
    return result
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
