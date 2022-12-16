import { parseUri } from "@walletconnect/utils"
import { SignClientTypes, SessionTypes } from "@walletconnect/types"
import SignClient from "@walletconnect/sign-client"
import { isEIP1193Error } from "@tallyho/provider-bridge-shared"

import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"

import BaseService from "../base"
import PreferenceService from "../preferences"
import ProviderBridgeService from "../provider-bridge"
import InternalEthereumProviderService from "../internal-ethereum-provider"
import {
  approveEIP155Request,
  processRequestParams,
  rejectEIP155Request,
} from "./eip155-request-utils"

import createSignClient from "./sign-client-helper"
import {
  acknowledgeLegacyProposal,
  createLegacySignClient,
  LegacyEventData,
  postLegacyApprovalResponse,
  postLegacyRejectionResponse,
  processLegacyRequestParams,
} from "./legacy-sign-client-helper"
import { getMetaPort } from "./utils"
import { TranslatedRequestParams } from "./types"

interface Events extends ServiceLifecycleEvents {
  placeHolderEventForTypingPurposes: string
}

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

  senderUrl = ""

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

    this.signClient = await createSignClient()
    this.defineEventHandlers()

    this.providerBridgeService.emitter.on(
      "walletConnectInit",
      async (wcUri: string) => {
        this.performConnection(wcUri)
      }
    )
  }

  protected override async internalStopService(): Promise<void> {
    // TODO: add this back, when we introduce a db to this service.
    // this.db.close()

    await super.internalStopService()
  }

  private defineEventHandlers(): void {
    this.signClient?.on("session_proposal", (proposal) =>
      this.sessionProposalListener(false, proposal)
    )

    this.signClient?.on("session_request", (event) =>
      this.sessionRequestListener(false, event)
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
        WalletConnectService.tempFeatureLog("legacy pairing", parseUri(uri))
        createLegacySignClient(
          uri,
          (payload) => this.sessionProposalListener(true, payload),
          (payload) => this.sessionRequestListener(true, undefined, payload)
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

    WalletConnectService.tempFeatureLog("proposal", proposal)
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
    event: TranslatedRequestParams,
    payload: any
  ) {
    const { topic } = event
    const response = approveEIP155Request(event, payload)
    await this.signClient?.respond({
      topic,
      response,
    })
  }

  private async postRejectionResponse(event: TranslatedRequestParams) {
    const { topic } = event
    const response = rejectEIP155Request(event)
    await this.signClient?.respond({
      topic,
      response,
    })
  }

  async sessionRequestListener(
    isLegacy: boolean, // TODO: this along with @legacyEvent should be removed when we fully migrate to v2, @event should become non optional
    event?: SignClientTypes.EventArguments["session_request"],
    legacyEvent?: LegacyEventData
  ): Promise<void> {
    WalletConnectService.tempFeatureLog("in sessionRequestListener", event)

    let request: TranslatedRequestParams | undefined
    if (isLegacy && legacyEvent) {
      request = processLegacyRequestParams(legacyEvent)
    } else if (event) {
      request = processRequestParams(event)
    }

    const port = getMetaPort(
      "sessionRequestListenerPort",
      this.senderUrl,
      async (message) => {
        WalletConnectService.tempFeatureLog(
          "sessionRequestListenerPort message:",
          message
        )

        if (!request) {
          return
        }

        if (isEIP1193Error(message.result)) {
          if (isLegacy) {
            postLegacyRejectionResponse(request)
          } else {
            await this.postRejectionResponse(request)
          }
        } else if (isLegacy) {
          postLegacyApprovalResponse(request, message.result)
        } else {
          await this.postApprovalResponse(request, message.result)
        }
      }
    )

    if (!request) {
      return
    }

    await this.providerBridgeService.onMessageListener(port, {
      id: "1400",
      request,
    })
  }

  async sessionProposalListener(
    isLegacy: boolean,
    proposal: SignClientTypes.EventArguments["session_proposal"]
  ): Promise<void> {
    WalletConnectService.tempFeatureLog("in sessionProposalListener", proposal)

    const { params } = proposal

    if (isLegacy && Array.isArray(params) && params.length > 0) {
      this.senderUrl = params[0].peerMeta?.url || ""
    } else if (params) {
      this.senderUrl = params.proposer.metadata.url // we can also extract information such as icons and description
    }

    if (!this.senderUrl) {
      return
    }

    const port = getMetaPort(
      "sessionProposalListenerPort",
      this.senderUrl,
      async (message) => {
        if (Array.isArray(message.result) && message.result.length > 0) {
          if (isLegacy) {
            acknowledgeLegacyProposal(message.result)
          } else if (proposal) {
            await this.acknowledgeProposal(proposal, message.result[0])
          }
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

  /* eslint-disable */
  private static tempFeatureLog(message?: any, ...optionalParams: any[]): void {
    console.log(`[WalletConnect Demo] - ${message || ""}`, ...optionalParams)
  }
  /* eslint-enable */
}
