import SignClient from "@walletconnect/sign-client"
import { parseUri } from "@walletconnect/utils"
import { SignClientTypes, SessionTypes } from "@walletconnect/types"
import {
  EIP1193Error,
  EIP1193_ERROR_CODES,
  isEIP1193Error,
  RPCRequest,
} from "@tallyho/provider-bridge-shared"

import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"

import BaseService from "../base"
import PreferenceService from "../preferences"
import ProviderBridgeService from "../provider-bridge"
import InternalEthereumProviderService from "../internal-ethereum-provider"
import { browser } from "../.."
import {
  approveEIP155Request,
  rejectEIP155Request,
} from "./eip155-request-utils"

interface Events extends ServiceLifecycleEvents {
  placeHolderEventForTypingPurposes: string
}

interface TranslatedRequestParams {
  topic?: string
  method: string
  params: RPCRequest["params"]
}

const temporaryDAppUri = "https://react-dapp-v2-with-ethers.vercel.app" // TODO: this constant should be removed and replaced with a dynamic value

/*
 * The walletconnect service is responsible for encapsulating the wallet connect
 * implementation details, maintaining the websocket connection, handling the protocol
 * requirements ant tying the communication with the rest of the extension codebase.
 *
 * NOTE: This is a boundary between a low trust and a high trust context just like the
 * provider bridge service. Extra careful coding is required here, to make sure we check
 * and sanitize the communication properly before it can reach the rest of the codebase.
 */
export default class WalletConnectService extends BaseService<Events> {
  signClient: SignClient | undefined

  /*
   * Create a new WalletConnectService. The service isn't initialized until
   * startService() is called and resolved.
   */
  static create: ServiceCreatorFunction<
    Events,
    WalletConnectService,
    [
      Promise<ProviderBridgeService>,
      Promise<InternalEthereumProviderService>,
      Promise<PreferenceService>
    ]
  > = async (
    providerBridgeService,
    internalEthereumProviderService,
    preferenceService
  ) => {
    return new this(
      await providerBridgeService,
      await internalEthereumProviderService,
      await preferenceService
    )
  }

  private constructor(
    private providerBridgeService: ProviderBridgeService,
    private internalEthereumProviderService: InternalEthereumProviderService,
    private preferenceService: PreferenceService
  ) {
    super()
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()

    await this.initializeWalletConnect()
  }

  protected override async internalStopService(): Promise<void> {
    // TODO: add this back, when we introduce a db to this service.
    // this.db.close()

    await super.internalStopService()
  }

  // eslint-disable-next-line class-methods-use-this
  private async initializeWalletConnect() {
    this.signClient = await WalletConnectService.createSignClient()
    this.defineEventHandlers()

    // TODO: remove this, inject uri
    // simulate connection attempt
    const wcUri =
      "wc:70e3ca637cd88494fd6e68d348c0f3940a73911bb272e409b28c28faaa9d89f5@2?relay-protocol=irn&symKey=8bcd2d3018dda379dd836b19a56ee4b70506ba20615f6c1b70e9b622c7fce73c"

    setTimeout(() => {
      this.performConnection(wcUri)
    }, 2000)
  }

  private static createSignClient(): Promise<SignClient> {
    return SignClient.init({
      logger: "debug", // TODO: set from .env
      projectId: "9ab2e13df08600b06ac588e1292d6512", // TODO: set from .env
      relayUrl: "wss://relay.walletconnect.com",
      metadata: {
        // TODO: customize this metadata
        name: "Tally Ho Wallet",
        description: "WalletConnect for Tally Ho wallet",
        url: "https://walletconnect.com/",
        icons: ["https://avatars.githubusercontent.com/u/37784886"],
      },
    })
  }

  private defineEventHandlers(): void {
    this.signClient?.on("session_proposal", (proposal) =>
      this.sessionProposalListener(proposal)
    )

    this.signClient?.on("session_request", (event) =>
      this.sessionRequestListener(event)
    )
  }

  async performConnection(uri: string): Promise<void> {
    if (this.signClient === undefined) {
      WalletConnectService.tempFeatureLog("signClient undefined")
      return
    }

    try {
      const { version } = parseUri(uri)

      // Route the provided URI to the v1 SignClient if URI version indicates it, else use v2.
      if (version === 1) {
        // createLegacySignClient({ uri })
        WalletConnectService.tempFeatureLog(
          "TODO: unsupported legacy",
          parseUri(uri)
        )
      } else if (version === 2) {
        await this.signClient.pair({ uri })
        WalletConnectService.tempFeatureLog("pairing request sent")
      } else {
        // TODO: decide how to handle this
        WalletConnectService.tempFeatureLog("unhandled uri")
      }
    } catch (err: unknown) {
      WalletConnectService.tempFeatureLog("TODO: handle error", err)
    }
  }

  private async acknowledgeProposal(
    proposal: SignClientTypes.EventArguments["session_proposal"],
    address: string
  ) {
    // TODO: in case of a new connection, this callback should perform request processing AFTER wallet selection/confirmation dialog
    const { id, params } = proposal
    const { requiredNamespaces, relays } = params

    WalletConnectService.tempFeatureLog(
      "requiredNamespaces",
      requiredNamespaces
    )
    // TODO: expand this section to be able to match requiredNamespaces to actual wallet
    const key = "eip155"
    const accounts = [`eip155:1:${address}`]
    const namespaces: SessionTypes.Namespaces = {}
    namespaces[key] = {
      accounts,
      methods: requiredNamespaces[key].methods,
      events: requiredNamespaces[key].events,
    }

    if (this.signClient !== undefined && relays.length > 0) {
      const { acknowledged } = await this.signClient.approve({
        id,
        relayProtocol: relays[0].protocol,
        namespaces,
      })

      await acknowledged()
      WalletConnectService.tempFeatureLog("connection acknowledged", namespaces)
    } else {
      // TODO: how to handle this case?
    }
  }

  private async postApprovalResponse(
    event: SignClientTypes.EventArguments["session_request"],
    payload: any
  ) {
    const { topic } = event
    const response = approveEIP155Request(event, payload)
    await this.signClient?.respond({
      topic,
      response,
    })
  }

  private async postRejectionResponse(
    event: SignClientTypes.EventArguments["session_request"]
  ) {
    const { topic } = event
    const response = rejectEIP155Request(event)
    await this.signClient?.respond({
      topic,
      response,
    })
  }

  private static getMetaPort(
    name: string,
    postMessage: (message: any) => void
  ): Required<browser.Runtime.Port> {
    const port: browser.Runtime.Port = browser.runtime.connect({
      name,
    })
    port.sender = {
      url: temporaryDAppUri,
    }
    port.postMessage = postMessage
    return port as unknown as Required<browser.Runtime.Port>
  }

  private static processRequestParams(
    event: SignClientTypes.EventArguments["session_request"]
  ): TranslatedRequestParams {
    // TODO: figure out if this method is needed
    const { params: eventParams } = event
    // TODO: handle chain id
    const { request } = eventParams

    switch (request.method) {
      case "eth_signTypedData":
      case "eth_signTypedData_v1":
      case "eth_signTypedData_v3":
      case "eth_signTypedData_v4":
        return {
          method: request.method,
          params: request.params,
        }
      case "eth_sign": // --- important wallet methods ---
      case "personal_sign":
      case "eth_sendTransaction":
        return {
          method: request.method,
          params: request.params,
        }
      case "eth_signTransaction":
        return {
          method: request.method,
          params: request.params,
        }
      default:
        throw new EIP1193Error(EIP1193_ERROR_CODES.unsupportedMethod)
    }
  }

  async sessionRequestListener(
    event: SignClientTypes.EventArguments["session_request"]
  ): Promise<void> {
    WalletConnectService.tempFeatureLog("in sessionRequestListener", event)
    const { method, params } = WalletConnectService.processRequestParams(event)

    const port = WalletConnectService.getMetaPort(
      "sessionRequestListenerPort",
      async (message) => {
        WalletConnectService.tempFeatureLog(
          "sessionRequestListenerPort message:",
          message
        )

        // TODO: make this check more elaborate
        if (isEIP1193Error(message.result)) {
          await this.postRejectionResponse(event)
        } else {
          await this.postApprovalResponse(event, message.result)
        }
      }
    )

    await this.providerBridgeService.onMessageListener(port, {
      id: "1400",
      request: {
        method,
        params,
      },
    })
  }

  async sessionProposalListener(
    proposal: SignClientTypes.EventArguments["session_proposal"]
  ): Promise<void> {
    WalletConnectService.tempFeatureLog("in sessionProposalListener")

    const port = WalletConnectService.getMetaPort(
      "sessionProposalListenerPort",
      async (message) => {
        if (Array.isArray(message.result) && message.result.length > 0) {
          await this.acknowledgeProposal(proposal, message.result[0])
          WalletConnectService.tempFeatureLog("pairing request acknowledged")
        }
      }
    )

    await this.providerBridgeService.onMessageListener(port, {
      id: "1300",
      request: {
        method: "eth_requestAccounts",
        params: [],
      },
    })
  }

  private static tempFeatureLog(message?: any, ...optionalParams: any[]): void {
    console.log(`[WalletConnect Demo] - ${message || ""}`, optionalParams)
  }
}
