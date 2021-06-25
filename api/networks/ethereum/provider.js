import fetch from 'node-fetch'
import { NETWORK_ERRORS } from '../../constants/errors.js'
import { idGenerator } from '../../lib/utils'
const getId = idGenerator()


export default class Provider {
  constructor ({ endpoint, jsonrpc = '2.0' }) {
    this.register = {}
    this.endpoint = endpoint
    if (endpoint.includes('wss://') || endpoint.includes('ws://')) this.type = 'ws'
    else if (endpoint.includes('https://') || endpoint.includes('http://')) this.type = 'http'
    this.jsonrpc = jsonrpc
    if (this.type === 'ws') {
      this.ready = new Promise((resolve, reject) => {
        this.isReady = resolve
        this.failedInConnection = reject
      })
      this.closed = new Promise((resolve, reject) => {
        this.isClosed = resolve
        this.failedInClose = reject
      })
    }
  }

  async request (request) {
    const defaults = { id: getId(), jsonrpc: this.jsonrpc}
    if (this.type == 'http') {
      const formatedRequest = formatRequestForFetch({request: {...defaults, ...request}})
      const { error, result } = await this._performFetch(formatedRequest, request)
      if  (error) throw new Error(error.message)
      return result
    } else if (this.type === 'ws') {
      if (!this.socket) {
        await this.connect()
      }
      const result = this._registerRequest(defaults.id)
      this._performSend({ ...defaults, ...request })
      return result
    }
  }


  async connect () {
    if (this.socket) {
      const { readyState, CLOSING, OPEN } = this.socket
      if (readyState === OPEN) {
        return this.socket
      } else if (readyState === CLOSING) {
        await this.closed
      }
    } else {
      if (this.type !== 'ws') throw new Error(NETWORK_ERRORS.CONNECT_NOT_SUPPORTED)

      this.socket = new WebSocket(
        this.endpoint
      )
    }


    this._addListeners()
    await this.ready
    return this.socket
  }

  async close () {
    const register = []
    Object.keys(this.register).forEach((id) => register.push(this.register[id]))
    if (register.length) await Promise.allSettled(register)
    this.socket.close()
  }

  _addListeners () {
    this.socket.addEventListener('message', this._onMessage.bind(this))
    this.socket.addEventListener('open', this._onOpen.bind(this))
    this.socket.addEventListener('error', this._onError.bind(this))
    this.socket.addEventListener('close', this._onClose.bind(this))
  }

   _removeListeners () {
    this.socket.removeListener('message', this._onMessage.bind(this))
    this.socket.removeListener('open', this._onOpen.bind(this))
    this.socket.removeListener('error', this._onError.bind(this))
    this.socket.removeListener('close', this._onClose.bind(this))
  }

  _onOpen () {
    this.isReady()
    this.closed = new Promise((resolve, reject) => {
      this.isClosed = resolve
      this.failedInClose = reject
    })
  }

  _onError (error) {
    console.error(error)
  }

  _onClose () {
    delete this.subcriptions
    this.ready = new Promise((resolve, reject) => {
      this.isReady = resolve
      this.failedInConnection = reject
    })
    this.isClosed()
  }

  _onMessage (message) {
    const response = JSON.parse(message.data)
    if (!response) return
    const { error, result, id } = response
    if (!id) return
    if (error) this.register[id].reject(error)
    else this.register[id].resolve(result)
    delete this.register.id
  }

  _registerRequest (id) {
    return new Promise((resolve, reject) => {
      this.register[id] = { resolve, reject }
    })
  }

  async _performSend (request) {
    await this.ready
    const socket = this.socket
    const { readyState, CLOSING, CLOSED } = socket
    if (readyState === CLOSING || readyState === CLOSED ) throw new Error(NETWORK_ERRORS.SOCKET_CLOSED)
    socket.send(JSON.stringify(request))
  }

  async _performFetch (formatedRequest, { method }) {
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
