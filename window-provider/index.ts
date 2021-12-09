import {
  WindowResponseEvent,
  PROVIDER_BRIDGE_TARGET,
  WINDOW_PROVIDER_TARGET,
  PortResponseEvent,
  ProviderTransport,
  isObject,
  isWindowResponseEvent,
  isPortResponseEvent,
  RequestArgument,
  EthersSendCallback,
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

  // deprecated EIP1193 send for web3-react injected provider Send type:
  // https://github.com/NoahZinsmeister/web3-react/blob/d0b038c748a42ec85641a307e6c588546d86afc2/packages/injected-connector/src/types.ts#L4
  send(method: string, params: Array<unknown>): Promise<unknown>
  // deprecated EIP1193 send for ethers.js Web3Provider > ExternalProvider:
  // https://github.com/ethers-io/ethers.js/blob/73a46efea32c3f9a4833ed77896a216e3d3752a0/packages/providers/src.ts/web3-provider.ts#L19
  send(
    request: RequestArgument,
    callback: (error: unknown, response: unknown) => void
  ): void
  send(
    methodOrRequest: string | RequestArgument,
    paramsOrCallback: Array<unknown> | EthersSendCallback
  ): Promise<unknown> | void {
    if (
      typeof methodOrRequest === "string" &&
      typeof paramsOrCallback !== "function"
    ) {
      return this.request({ method: methodOrRequest, params: paramsOrCallback })
    }

    if (isObject(methodOrRequest) && typeof paramsOrCallback === "function") {
      return this.request(methodOrRequest).then(
        (response) => paramsOrCallback(null, response),
        (error) => paramsOrCallback(error, null)
      )
    }

    return Promise.reject(new Error("Unsupported function parameters"))
  }

  request(arg: RequestArgument): Promise<unknown> {
    const { method, params = [] } = arg
    if (typeof method !== "string") {
      return Promise.reject(new Error(`unsupported method type: ${method}`))
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

    return new Promise((resolve) => {
      // TODO: refactor the listener function out of the Promise
      const listener = (event: unknown) => {
        let id
        let result
        if (isWindowResponseEvent(event)) {
          if (
            event.origin !== this.transport.origin || // filter to messages claiming to be from the provider-bridge script
            event.source !== window || // we want to recieve messages only from the provider-bridge script
            event.data.target !== WINDOW_PROVIDER_TARGET
          ) {
            return
          }

          ;({ id, result } = event.data)
        } else if (isPortResponseEvent(event)) {
          ;({ id, result } = event)
        } else {
          return
        }

        if (sendData.id !== id) return

        this.transport.removeEventListener(
          this.bridgeListeners.get(sendData.id)
        )
        this.bridgeListeners.delete(sendData.id)

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

      this.transport.addEventListener(this.bridgeListeners.get(sendData.id))
    })
  }
}
