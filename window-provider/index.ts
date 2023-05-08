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
import monitorForWalletConnectionPrompts from "./wallet-connection-handlers"

// TODO: we don't want to impersonate MetaMask everywhere to not break existing integrations,
//       so let's do this only on the websites that need this feature
const impersonateMetamaskWhitelist = [
  "traderjoexyz.com",
  "transferto.xyz",
  "opensea.io",
  "polygon.technology",
  "gmx.io",
  "app.lyra.finance",
  "matcha.xyz",
  "bridge.umbria.network",
  "galaxy.eco",
  "galxe.com",
  "dydx.exchange",
  "app.euler.finance",
  "kwenta.io",
  "stargate.finance",
  "etherscan.io",
  "swapr.eth.link",
  "apex.exchange",
  "app.yieldprotocol.com",
  "tofunft.com",
  "aboard.exchange",
  "portal.zksync.io",
  "blur.io",
  "app.benqi.fi",
  "snowtrace.io",
  "core.app",
  "cbridge.celer.network",
  "stargate.finance",
  "app.multchain.cn",
  "app.venus.io",
  "app.alpacafinance.org",
  "pancakeswap.finance",
  "liquidifty.io",
  "ankr.com",
  "mint.xencrypto.io",
  "bscscan.com",
  "alchemy.com",
  "cow.fi",
  "tally.xyz",
  "kyberswap.com",
  "space.id",
]

const METAMASK_STATE_MOCK = {
  accounts: null,
  isConnected: false,
  isUnlocked: false,
  initialized: false,
  isPermanentlyDisconnected: false,
}

export default class TallyWindowProvider extends EventEmitter {
  // TODO: This should come from the background with onConnect when any interaction is initiated by the dApp.
  // onboard.js relies on this, or uses a deprecated api. It seemed to be a reasonable workaround for now.
  chainId = "0x1"

  selectedAddress: string | undefined

  connected = false

  isTally = true

  isMetaMask = false

  tallySetAsDefault = false

  isWeb3 = true

  requestResolvers = new Map<
    string,
    {
      resolve: (value: unknown) => void
      reject: (value: unknown) => void
      sendData: {
        id: string
        target: string
        request: Required<RequestArgument>
      }
    }
  >()

  _state?: typeof METAMASK_STATE_MOCK

  providerInfo = {
    label: "Taho",
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
        const currentHost = window.location.host
        if (
          impersonateMetamaskWhitelist.some((host) =>
            currentHost.includes(host)
          )
        ) {
          this.isMetaMask = result.defaultWallet

          if (
            this.isMetaMask &&
            // This is internal to MetaMask but accessed by this dApp
            // TODO: Improve MetaMask provider impersonation
            currentHost.includes("core.app")
          ) {
            // eslint-disable-next-line no-underscore-dangle
            this._state = METAMASK_STATE_MOCK
          }

          this.tallySetAsDefault = result.defaultWallet
        }
        if (result.chainId && result.chainId !== this.chainId) {
          this.handleChainIdChange(result.chainId)
        }
      } else if (isTallyAccountPayload(result)) {
        this.handleAddressChange(result.address)
      }
    }

    /**
     * Some dApps may have a problem with preserving a reference to a provider object.
     * This is the result of incorrect assignment.
     * In such a case, the object this is undefined
     * which results in an error in the execution of the request.
     * The request function should always have a provider object set.
     */
    this.request = this.request.bind(this)
    monitorForWalletConnectionPrompts()
    this.transport.addEventListener(internalListener)
    this.transport.addEventListener(this.internalBridgeListener.bind(this))
  }

  private internalBridgeListener(event: unknown): void {
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

    const requestResolver = this.requestResolvers.get(id)

    if (!requestResolver) return

    const { sendData, reject, resolve } = requestResolver

    this.requestResolvers.delete(sendData.id)

    const { method: sentMethod } = sendData.request

    if (isEIP1193Error(result)) {
      reject(result)
    }

    // let's emit connected on the first successful response from background
    if (!this.connected) {
      this.connected = true
      this.emit("connect", { chainId: this.chainId })
    }

    switch (sentMethod) {
      case "wallet_switchEthereumChain":
      case "wallet_addEthereumChain":
        // null result indicates successful chain change https://eips.ethereum.org/EIPS/eip-3326#specification
        if (result === null) {
          this.handleChainIdChange(
            (sendData.request.params[0] as { chainId: string }).chainId
          )
        }
        break

      case "eth_chainId":
      case "net_version":
        if (
          typeof result === "string" &&
          Number(this.chainId) !== Number(result)
        ) {
          this.handleChainIdChange(result)
        }
        break

      case "eth_accounts":
      case "eth_requestAccounts":
        if (Array.isArray(result) && result.length !== 0) {
          this.handleAddressChange(result)
        }
        break

      default:
        break
    }

    resolve(result)
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

    return new Promise<unknown>((resolve, reject) => {
      this.requestResolvers.set(sendData.id, {
        resolve,
        reject,
        sendData,
      })
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
