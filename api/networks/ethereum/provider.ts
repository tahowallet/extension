import { TRANSPORT_TYPES } from "../../constants"
import { NETWORK_ERRORS } from "../../constants/errors"
import { idGenerator } from "../../lib/utils"
import WebSocketProvider from "./transports/ws"
import HttpProvider from "./transports/http"

const getId = idGenerator()

export default class Provider {
  endpoint: string

  type: string // TODO move to enum

  transport: any // TODO set up a provider hierarchy

  jsonrpc: string

  constructor(endpoint: string, jsonrpc = "2.0") {
    this.endpoint = endpoint
    if (endpoint.includes("wss://") || endpoint.includes("ws://")) {
      this.type = TRANSPORT_TYPES.ws
      this.transport = new WebSocketProvider(endpoint)
    } else if (endpoint.includes("https://") || endpoint.includes("http://")) {
      this.type = TRANSPORT_TYPES.http
      this.transport = new HttpProvider(endpoint)
    } else {
      throw new Error(NETWORK_ERRORS.UNSUPORTED_TRANSPORT)
    }
    this.jsonrpc = jsonrpc
  }

  async request(request: any) {
    const defaults = { id: getId(), jsonrpc: this.jsonrpc, params: [] }
    return this.transport.performSend({ ...defaults, ...request })
  }

  // The below is a stub for subclasses to implement.
  // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-empty-function
  async close() {}
}
