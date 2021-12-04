import {
  WindowResponseEvent,
  PROVIDER_BRIDGE_TARGET,
  WINDOW_PROVIDER_TARGET,
  PortResponseEvent,
  ProviderTransport,
  WindowTransport,
} from "@tallyho/provider-bridge-shared"
import { EventEmitter } from "events"

export default class TallyWindowProvider extends EventEmitter {
  // TODO: This should come from the background with onConnect when any interaction is initiated by the dApp.
  // onboard.js relies on this, or uses a deprecated api. It seemed to be a reasonable workaround for now.
  chainId: number | undefined = 1

  selectedAddress: string | undefined

  isConnected = false

  isTally = true

  bridgeListeners = new Map()

  constructor(public transport: ProviderTransport) {
    super()
  }

  request(request: {
    method: string
    params?: Array<unknown>
  }): Promise<unknown> {
    return this.send(request.method, request.params)
  }

  send(method: string, params: Array<unknown> = []): Promise<unknown> {
    if (typeof method !== "string") {
      return Promise.reject(new Error(`unsupported method type: ${method}`)) // TODO: check why web3-react falls through all the calls in the getChain() method
    }
    const sendData = {
      id: Date.now().toString(),
      target: PROVIDER_BRIDGE_TARGET,
      request: {
        method,
        params,
      },
    }

    this.transport.postMessage(sendData)

    const isWindowTransport = (t: ProviderTransport): t is WindowTransport => {
      return !t.origin.startsWith("chrome-extension://")
    }

    return new Promise((resolve) => {
      // TODO: refactor the listener function out of the Promise
      const listener = (event: WindowResponseEvent & PortResponseEvent) => {
        let id
        let result
        if (isWindowTransport(this.transport)) {
          if (
            event.origin !== this.transport.origin || // filter to messages claiming to be from the provider-bridge script
            event.source !== window || // we want to recieve messages only from the provider-bridge script
            event.data.target !== WINDOW_PROVIDER_TARGET
          ) {
            return
          }
          ;({ id, result } = event.data)

          if (sendData.id !== id) return

          this.transport.removeEventListener(
            "message",
            this.bridgeListeners.get(sendData.id),
            false
          )
          this.bridgeListeners.delete(sendData.id)
        } else {
          ;({ id, result } = event)
          if (sendData.id !== id) return

          this.transport.removeEventListener(
            this.bridgeListeners.get(sendData.id)
          )
          this.bridgeListeners.delete(sendData.id)
        }

        const { method: sentMethod } = sendData.request

        // TODOO: refactor these into their own function handler
        // https://github.com/tallycash/tally-extension/pull/440#discussion_r753504700
        if (sentMethod === "eth_chainId" || sentMethod === "net_version") {
          if (!this.isConnected) {
            this.isConnected = true
            this.emit("connect", { chainId: result })
          }

          if (this.chainId !== result) {
            this.chainId = Number(result)
            this.emit("chainChanged", result)
            this.emit("networkChanged", result)
          }
        }

        if (
          sentMethod === "eth_accounts" &&
          Array.isArray(result) &&
          result.length !== 0
        ) {
          const [address] = result
          if (this.selectedAddress !== address) {
            this.selectedAddress = address
            this.emit("accountsChanged", [this.selectedAddress])
          }
        }

        resolve(result)
      }

      this.bridgeListeners.set(sendData.id, listener)
      // TODO: refactor this to have a single `unsafeAddEventListener` call in the constructor
      // https://github.com/tallycash/tally-extension/pull/440#discussion_r753509947

      if (isWindowTransport(this.transport)) {
        this.transport.addEventListener(
          "message",
          this.bridgeListeners.get(sendData.id)
        )
      } else {
        this.transport.addEventListener(this.bridgeListeners.get(sendData.id))
      }
    })
  }
}
