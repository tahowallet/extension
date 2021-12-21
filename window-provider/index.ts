import {
  PROVIDER_BRIDGE_TARGET,
  WINDOW_PROVIDER_TARGET,
  ProviderTransport,
  isObject,
  isWindowResponseEvent,
  isPortResponseEvent,
  RequestArgument,
  EthersSendCallback,
  isTallyConfigPayload,
  TallyConfigPayload,
  isEIP1193Error,
  isTallyInternalCommunication,
  TallyAccountPayload,
  isTallyAccountPayload,
} from "@tallyho/provider-bridge-shared"
import { EventEmitter } from "events"

export default class TallyWindowProvider extends EventEmitter {
  // TODO: This should come from the background with onConnect when any interaction is initiated by the dApp.
  // onboard.js relies on this, or uses a deprecated api. It seemed to be a reasonable workaround for now.
  chainId = "0x1"

  selectedAddress: string | undefined

  isConnected = false

  isTally = true

  bridgeListeners = new Map()

  constructor(public transport: ProviderTransport) {
    super()

    const internalListener = (event: unknown) => {
      let result: TallyConfigPayload | TallyAccountPayload
      if (
        isWindowResponseEvent(event) &&
        isTallyInternalCommunication(event.data)
      ) {
        if (
          event.origin !== this.transport.origin || // filter to messages claiming to be from the provider-bridge script
          event.source !== window || // we want to recieve messages only from the provider-bridge script
          event.data.target !== WINDOW_PROVIDER_TARGET
        ) {
          return
        }

        ;({ result } = event.data)
      } else if (
        isPortResponseEvent(event) &&
        isTallyInternalCommunication(event)
      ) {
        ;({ result } = event)
      } else {
        return
      }

      if (isTallyConfigPayload(result)) {
        if (result.defaultWallet) {
          // let's set Tally as a default wallet
          // and bkp any object that maybe using window.ethereum
          if (window.ethereum) {
            window.oldEthereum = window.ethereum
          }

          window.ethereum = window.tally
        } else if (window.oldEthereum) {
          // let's remove tally as a default wallet
          // and put back whatever it was there before us
          window.ethereum = window.oldEthereum
        } else if (window.ethereum?.isTally) {
          // we were told not to be a default wallet anymore
          // so in case if we have `window.ethereum` just remove ourselves
          window.ethereum = undefined
        }
      } else if (isTallyAccountPayload(result)) {
        this.handleAddressChange.bind(this)(result.address)
      }
    }

    this.transport.addEventListener(internalListener)
  }

  // deprecated EIP-1193 method
  async enable() {
    return this.request({ method: "eth_requestAccounts" })
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

  // Provider-wide counter for requests.
  private requestID = 0n

  request(arg: RequestArgument): Promise<unknown> {
    const { method, params = [] } = arg
    if (typeof method !== "string") {
      return Promise.reject(new Error(`unsupported method type: ${method}`))
    }
    const sendData = {
      id: this.requestID.toString(),
      target: PROVIDER_BRIDGE_TARGET,
      request: {
        method,
        params,
      },
    }

    this.requestID += 1n

    this.transport.postMessage(sendData)

    return new Promise((resolve, reject) => {
      // TODO: refactor the listener function out of the Promise
      const listener = (event: unknown) => {
        let id
        let result: unknown

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

        // TODO: refactor these into their own function handler
        // https://github.com/tallycash/tally-extension/pull/440#discussion_r753504700

        if (isEIP1193Error(result)) {
          reject(result)
        }

        // let's emmit connected on the first successful response from background
        if (!this.isConnected) {
          this.isConnected = true
          this.emit("connect", { chainId: this.chainId })
        }

        if (sentMethod === "eth_chainId" || sentMethod === "net_version") {
          if (
            typeof result === "string" &&
            Number(this.chainId) !== Number(result)
          ) {
            this.chainId = `0x${Number(result).toString(16)}`
            this.emit("chainChanged", this.chainId)
            this.emit("networkChanged", Number(this.chainId).toString())
          }
        }

        if (
          (sentMethod === "eth_accounts" ||
            sentMethod === "eth_requestAccounts") &&
          Array.isArray(result) &&
          result.length !== 0
        ) {
          this.handleAddressChange.bind(this)(result)
        }

        resolve(result)
      }

      this.bridgeListeners.set(sendData.id, listener)
      // TODO: refactor this to have a single `unsafeAddEventListener` call in the constructor
      // https://github.com/tallycash/tally-extension/pull/440#discussion_r753509947

      this.transport.addEventListener(this.bridgeListeners.get(sendData.id))
    })
  }

  handleAddressChange(address: Array<string>) {
    if (this.selectedAddress !== address[0]) {
      // eslint-disable-next-line prefer-destructuring
      this.selectedAddress = address[0]
      this.emit("accountsChanged", address)
    }
  }
}
