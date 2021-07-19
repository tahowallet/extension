import { TRANSPORT_TYPES } from '../../../constants'


export default class WebSocketProvider {
  constructor (endpoint) {
    this.type = TRANSPORT_TYPES.ws
    this.ready = new Promise((resolve, reject) => {
      this.isReady = resolve
      this.failedInConnection = reject
    })
    this.closed = new Promise((resolve, reject) => {
      this.isClosed = resolve
      this.failedInClose = reject
    })

    this._register = {}
    if (!endpoint.includes('wss://') || !endpoint.includes('ws://')) {
      throw new Error('Not a ws endpoint')
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
      this.socket = new WebSocket(
        this.endpoint
      )
    }


    this._addListeners()
    await this.ready
    return this.socket
  }

  async close () {
    const register = Object.values(this._register)
    if (register.length) await Promise.allSettled(register)
    this.socket.close()
  }

  // PRIVATE METHODS

  _addListeners () {
    this.socket.addEventListener('message', this._onRpcStyleMessage.bind(this))
    this.socket.addEventListener('open', this._onOpen.bind(this))
    this.socket.addEventListener('error', this._onError.bind(this))
    this.socket.addEventListener('close', this._onClose.bind(this))
  }

   _removeListeners () {
    this.socket.removeEventListener('message', this._onRpcStyleMessage.bind(this))
    this.socket.removeEventListener('open', this._onOpen.bind(this))
    this.socket.removeEventListener('error', this._onError.bind(this))
    this.socket.removeEventListener('close', this._onClose.bind(this))
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

  _onRpcStyleMessage (message) {
    const response = JSON.parse(message.data)
    if (!response) return
    const { error, result, id } = response
    if (!id) return
    if (error) this._register[id].reject(error)
    else this._register[id].resolve(result)
    delete this._register.id
  }

  _registerRequest (id) {
    return new Promise((resolve, reject) => {
      this._register[id] = { resolve, reject }
    })
  }

  async _performSend (request) {
    if (!this.socket) {
      await this.connect()
    }
    await this.ready
    const result = this._registerRequest(request.id)
    const socket = this.socket
    const { readyState, CLOSING, CLOSED } = socket
    if (readyState === CLOSING || readyState === CLOSED ) throw new Error(NETWORK_ERRORS.SOCKET_CLOSED)
    socket.send(JSON.stringify(request))
    return result
  }
}