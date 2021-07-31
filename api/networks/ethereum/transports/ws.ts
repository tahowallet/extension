import { TRANSPORT_TYPES } from "../../../constants"
import { NETWORK_ERRORS } from "../../../constants/errors"

export default class WebSocketProvider {
  logger: Console

  endpoint: string

  type: string

  ready: Promise<void>

  isReady: () => void

  failedInConnection: () => void

  closed: Promise<void>

  isClosed: () => void

  failedInClose: () => void

  private register: any

  socket?: WebSocket

  constructor(endpoint: string) {
    this.logger = console
    this.type = TRANSPORT_TYPES.ws
    this.ready = new Promise((resolve, reject) => {
      this.isReady = resolve
      this.failedInConnection = reject
    })
    this.closed = new Promise((resolve, reject) => {
      this.isClosed = resolve
      this.failedInClose = reject
    })

    this.register = {}
    if (!endpoint.match(/^wss?:\/\//)) {
      throw new Error("Not a ws endpoint")
    }
  }

  async connect() {
    if (this.socket) {
      const { readyState, CLOSING, OPEN } = this.socket
      if (readyState === OPEN) {
        return this.socket
      }
      if (readyState === CLOSING) {
        await this.closed
      }
    } else {
      this.socket = new WebSocket(this.endpoint)
    }

    this.addListeners()
    await this.ready
    return this.socket
  }

  async close() {
    if (!this.socket) return
    const register = Object.values(this.register)
    if (register.length) await Promise.allSettled(register)
    this.socket.close()
  }

  // PRIVATE METHODS

  private addListeners() {
    this.socket.addEventListener("message", this.onRpcStyleMessage.bind(this))
    this.socket.addEventListener("open", this.onOpen.bind(this))
    this.socket.addEventListener("error", this.onError.bind(this))
    this.socket.addEventListener("close", this.onClose.bind(this))
  }

  private removeListeners() {
    this.socket.removeEventListener(
      "message",
      this.onRpcStyleMessage.bind(this)
    )
    this.socket.removeEventListener("open", this.onOpen.bind(this))
    this.socket.removeEventListener("error", this.onError.bind(this))
    this.socket.removeEventListener("close", this.onClose.bind(this))
  }

  private onOpen() {
    this.isReady()
    this.closed = new Promise((resolve, reject) => {
      this.isClosed = resolve
      this.failedInClose = reject
    })
  }

  private onError(error) {
    this.logger.error(error)
  }

  private onClose() {
    // TODO delete this.subcriptions
    this.ready = new Promise((resolve, reject) => {
      this.isReady = resolve
      this.failedInConnection = reject
    })
    this.isClosed()
  }

  private onRpcStyleMessage(message) {
    const response = JSON.parse(message.data)
    if (!response) return
    const { error, result, id } = response
    if (!id) return
    if (error) this.register[id].reject(error)
    else this.register[id].resolve(result)
    delete this.register.id
  }

  private registerRequest(id) {
    return new Promise((resolve, reject) => {
      this.register[id] = { resolve, reject }
    })
  }

  private async performSend(request) {
    if (!this.socket) {
      await this.connect()
    }
    await this.ready
    const result = this.registerRequest(request.id)
    const { socket } = this
    const { readyState, CLOSING, CLOSED } = socket
    if (readyState === CLOSING || readyState === CLOSED)
      throw new Error(NETWORK_ERRORS.SOCKET_CLOSED)
    socket.send(JSON.stringify(request))
    return result
  }
}
