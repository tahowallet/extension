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

// TODO: we don't want to impersonate MetaMask everywhere to not break existing integrations,
//       so let's do this only on the websites that need this feature
const impersonateMetamaskWhitelist = [
  "opensea.io",
  "bridge.umbria.network",
  "galaxy.eco",
]

export default class TallyWindowProvider extends EventEmitter {
  // TODO: This should come from the background with onConnect when any interaction is initiated by the dApp.
  // onboard.js relies on this, or uses a deprecated api. It seemed to be a reasonable workaround for now.
  chainId = "0x1"

  selectedAddress: string | undefined

  connected = false

  isTally = true

  isMetaMask = false

  isWeb3 = true

  bridgeListeners = new Map()

  providerInfo = {
    label: "Tally Ho!",
    injectedNamespace: "tally",
    iconURL: "TODO",
    identityFlag: "isTally",
    checkIdentity: (provider: WalletProvider) =>
      !!provider && !!provider.isTally,
  } as const

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
        window.walletRouter?.shouldSetTallyForCurrentProvider(
          result.defaultWallet,
          result.shouldReload
        )
        if (
          impersonateMetamaskWhitelist.some((host) =>
            window.location.host.includes(host)
          )
        ) {
          this.isMetaMask = result.defaultWallet
        }
        if (result.chainId && result.chainId !== this.chainId) {
          this.handleChainIdChange.bind(this)(result.chainId)
        }
      } else if (isTallyAccountPayload(result)) {
        this.handleAddressChange.bind(this)(result.address)
      }
    }

    this.transport.addEventListener(internalListener)
  }

  // deprecated EIP-1193 method
  async enable(): Promise<unknown> {
    return this.request({ method: "eth_requestAccounts" })
  }

  isConnected(): boolean {
    return this.connected
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
      return this.sendAsync(methodOrRequest, paramsOrCallback)
    }

    return Promise.reject(new Error("Unsupported function parameters"))
  }

  // deprecated EIP-1193 method
  // added as some dapps are still using it
  sendAsync(
    request: RequestArgument & { id?: number; jsonrpc?: string },
    callback: (error: unknown, response: unknown) => void
  ): Promise<unknown> | void {
    return this.request(request).then(
      (response) =>
        callback(null, {
          result: response,
          id: request.id,
          jsonrpc: request.jsonrpc,
        }),
      (error) => callback(error, null)
    )
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
        if (!this.connected) {
          this.connected = true
          this.emit("connect", { chainId: this.chainId })
        }

        if (
          sentMethod === "wallet_switchEthereumChain" ||
          sentMethod === "wallet_addEthereumChain"
        ) {
          // null result indicates successful chain change https://eips.ethereum.org/EIPS/eip-3326#specification
          if (result === null) {
            this.handleChainIdChange.bind(this)(
              (sendData.request.params[0] as { chainId: string }).chainId
            )
          }
        } else if (
          sentMethod === "eth_chainId" ||
          sentMethod === "net_version"
        ) {
          if (
            typeof result === "string" &&
            Number(this.chainId) !== Number(result)
          ) {
            this.handleChainIdChange.bind(this)(result)
          }
        } else if (
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

  handleChainIdChange(chainId: string): void {
    this.chainId = chainId
    this.emit("chainChanged", chainId)
    this.emit("networkChanged", Number(chainId).toString())
  }

  handleAddressChange(address: Array<string>): void {
    if (this.selectedAddress !== address[0]) {
      // eslint-disable-next-line prefer-destructuring
      this.selectedAddress = address[0]
      this.emit("accountsChanged", address)
    }
  }
}
