import SignClient from "@walletconnect/sign-client"
import { parseUri } from "@walletconnect/utils"
import { SignClientTypes, SessionTypes } from "@walletconnect/types"

import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"

import BaseService from "../base"
import PreferenceService from "../preferences"
import ProviderBridgeService from "../provider-bridge"
import InternalEthereumProviderService from "../internal-ethereum-provider"

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
    const wcUri = "wc:710fc886274cd9d759e1b8cda6f0e36b056c04edcda1f711536ddb90c027f36a@2?relay-protocol=irn&symKey=4f6775a3d5a1b2f7f5c0ee150fc1c8d11cb187b03f6cd5875de6ea9fc14ebdb4"
    await this.performConnection(wcUri)
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
    const address = "0xcd6b1f2080bde01d56023c9b50cd91ff09fefd73" // TODO: remove this, replace with real address

    this.signClient?.on(
      "session_proposal",
      async (proposal: SignClientTypes.EventArguments["session_proposal"]) => {
        // TODO: in case of a new connection, this callback should perform request processing AFTER wallet selection/confirmation dialog
        const { id, params } = proposal
        const { requiredNamespaces, relays } = params

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
          console.log("[WalletConnect Demo] - connection acknowledged")
        } else {
          // TODO: how to handle this case?
        }
      }
    )

    this.signClient?.on(
      "session_request",
      (event: SignClientTypes.EventArguments["session_request"]) => {
        console.log("[WalletConnect Demo] - got session_request event", event)
      }
    )
  }

  async performConnection(uri: string): Promise<void> {
    if (this.signClient === undefined) {
      console.log("[WalletConnect Demo] - signClient undefined")
      return
    }

    try {
      const { version } = parseUri(uri)

      // Route the provided URI to the v1 SignClient if URI version indicates it, else use v2.
      if (version === 1) {
        // createLegacySignClient({ uri })
        console.log("[WalletConnect Demo] - TODO: unsupported legacy")
      } else if (version === 2) {
        await this.signClient.pair({ uri })
        console.log("[WalletConnect Demo] - pairing request sent")
      } else {
        // TODO: decide how to handle this
        console.log("[WalletConnect Demo] - unhandled uri", uri)
      }
    } catch (err: unknown) {
      console.log("[WalletConnect Demo] - TODO: handle error", err)
    }
  }
}
