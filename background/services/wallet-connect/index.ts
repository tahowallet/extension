import { parseUri, getSdkError } from "@walletconnect/utils"
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
  LegacyProposal,
  postLegacyApprovalResponse,
  postLegacyRejectionResponse,
  processLegacyRequestParams,
  rejectLegacyProposal,
} from "./legacy-sign-client-helper"
import { getMetaPort } from "./utils"
import { TranslatedRequestParams } from "./types"
import ChainService from "../chain"

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
  #signClientv2: SignClient | undefined

  private get signClientv2(): SignClient {
    if (!this.#signClientv2) {
      throw new Error("WalletConnect: SignClient v2 has not initialized")
    }
    return this.#signClientv2
  }

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
      Promise<PreferenceService>,
      Promise<ChainService>
    ]
  > = async (
    providerBridgeService,
    internalEthereumProviderService,
    preferenceService,
    chainService
  ) =>
    new this(
      await providerBridgeService,
      await internalEthereumProviderService,
      await preferenceService,
      await chainService
    )

  private constructor(
    private providerBridgeService: ProviderBridgeService,
    private internalEthereumProviderService: InternalEthereumProviderService,
    private preferenceService: PreferenceService,
    private chainService: ChainService
  ) {
    super()
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()

    this.#signClientv2 = await createSignClient()
    this.defineEventHandlers()

    this.providerBridgeService.emitter.on("walletConnectInit", async (wcUri) =>
      this.performConnection(wcUri)
    )
  }

  protected override async internalStopService(): Promise<void> {
    // TODO: add this back, when we introduce a db to this service.
    // this.db.close()

    await super.internalStopService()
  }

  private defineEventHandlers(): void {
    this.signClientv2.on("session_proposal", (proposal) =>
      this.sessionProposalListener(false, proposal)
    )

    this.signClientv2.on("session_request", (event) =>
      this.sessionRequestListener(false, event)
    )
  }

  async performConnection(uri: string): Promise<void> {
    try {
      const { version } = parseUri(uri)

      switch (true) {
        // Route the provided URI to the v1 SignClient if URI version indicates it.
        case version === 1:
          WalletConnectService.tempFeatureLog("legacy pairing", parseUri(uri))

          createLegacySignClient(
            uri,
            (payload) => this.sessionProposalListener(true, undefined, payload),
            (payload) => this.sessionRequestListener(true, undefined, payload)
          )
          break

        case version === 2:
          await this.signClientv2.pair({ uri })
          WalletConnectService.tempFeatureLog("pairing request sent")
          break

        default:
          // TODO: decide how to handle this
          WalletConnectService.tempFeatureLog(
            "unhandled uri version: ",
            version
          )
          break
      }
    } catch (err: unknown) {
      WalletConnectService.tempFeatureLog(
        "TODO: Error while establishing session",
        err
      )
    }
  }

  private async acknowledgeProposal(
    proposal: SignClientTypes.EventArguments["session_proposal"],
    selectedAccounts: [string]
  ) {
    // TODO: in case of a new connection, this callback should perform request processing AFTER wallet selection/confirmation dialog
    const { id, params } = proposal
    const { requiredNamespaces, relays } = params

    WalletConnectService.tempFeatureLog("proposal", proposal)
    WalletConnectService.tempFeatureLog(
      "requiredNamespaces",
      requiredNamespaces
    )

    const ethNamespaceKey = "eip155"
    const ethNamespace = requiredNamespaces[ethNamespaceKey]
    if (!ethNamespace) {
      await this.rejectProposal(id)
      return
    }

    const namespaces: SessionTypes.Namespaces = {}
    const accounts = (ethNamespace.chains ?? []).flatMap((chain) =>
      selectedAccounts.map((selectedAccount) => `${chain}:${selectedAccount}`)
    )
    namespaces[ethNamespaceKey] = {
      accounts,
      methods: requiredNamespaces[ethNamespaceKey].methods,
      events: requiredNamespaces[ethNamespaceKey].events,
    }

    if (relays.length > 0) {
      const { acknowledged } = await this.signClientv2.approve({
        id,
        relayProtocol: relays[0].protocol,
        namespaces,
      })

      await acknowledged()
      WalletConnectService.tempFeatureLog("connection acknowledged", namespaces)
    } else {
      // TODO: how to handle this case?
      await this.rejectProposal(id)
    }
  }

  private async rejectProposal(id: number) {
    await this.signClientv2.reject({
      id,
      reason: getSdkError("USER_REJECTED_METHODS"),
    })
  }

  private async postApprovalResponse(
    event: TranslatedRequestParams,
    payload: string
  ) {
    const { topic } = event
    const response = approveEIP155Request(event, payload)
    await this.signClientv2.respond({
      topic,
      response,
    })
  }

  private async postRejectionResponse(event: TranslatedRequestParams) {
    const { topic } = event
    const response = rejectEIP155Request(event)
    await this.signClientv2.respond({
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

    if (!request) {
      return
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

    await this.providerBridgeService.onMessageListener(port, {
      id: "1400",
      request,
    })
  }

  async sessionProposalListener(
    isLegacy: boolean,
    proposal?: SignClientTypes.EventArguments["session_proposal"],
    legacyProposal?: LegacyProposal
  ): Promise<void> {
    WalletConnectService.tempFeatureLog(
      "in sessionProposalListener",
      proposal ?? legacyProposal
    )

    let favicon = ""
    let dAppName = ""

    if (isLegacy && legacyProposal) {
      const { params } = legacyProposal
      if (Array.isArray(params) && params.length > 0) {
        this.senderUrl = params[0].peerMeta?.url || ""
        favicon = params[0].peerMeta.icons?.[0] ?? ""
        dAppName = params[0].peerMeta.name ?? ""
      }
    } else if (proposal) {
      const { params } = proposal
      this.senderUrl = params.proposer.metadata.url // we can also extract information such as icons and description
      favicon = params.proposer.metadata.icons?.[0] ?? ""
      dAppName = params.proposer.metadata.name ?? ""
    }

    if (!this.senderUrl) {
      return
    }

    const port = getMetaPort(
      "sessionProposalListenerPort",
      this.senderUrl,
      async (message) => {
        if (Array.isArray(message.result) && message.result.length > 0) {
          if (isLegacy && legacyProposal) {
            acknowledgeLegacyProposal(legacyProposal, message.result)
          } else if (proposal) {
            await this.acknowledgeProposal(proposal, message.result)
          }
          WalletConnectService.tempFeatureLog("pairing request acknowledged")
        } else if (isEIP1193Error(message.result)) {
          if (isLegacy) {
            rejectLegacyProposal()
          } else if (proposal) {
            await this.rejectProposal(proposal?.id)
          }
        }
      }
    )

    await this.providerBridgeService.onMessageListener(port, {
      id: "1300",
      request: {
        method: "eth_requestAccounts",
        params: [dAppName, favicon],
      },
    })
  }

  /* eslint-disable */
  private static tempFeatureLog(message?: any, ...optionalParams: any[]): void {
    console.log(`[WalletConnect Demo] - ${message || ""}`, ...optionalParams)
  }
  /* eslint-enable */
}
