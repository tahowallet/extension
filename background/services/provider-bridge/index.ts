import browser from "webextension-polyfill"
import {
  ChainService,
  ServiceCreatorFunction,
  ServiceLifecycleEvents,
} from ".."
import logger from "../../lib/logger"
import BaseService from "../base"
import InternalEthereumProviderService from "../internal-ethereum-provider"
import { getOrCreateDB, ProviderBridgeServiceDatabase } from "./db"

type Events = ServiceLifecycleEvents & {
  accountAccessRequestedByDAppID: string
}

/**
 * The ProviderBridgeService is responsible for the communication with the
 * provider-bridge (content-script).
 *
 * The main purpose for this service/layer is to provide a transition
 * between the untrusted communiction from the window-provider - which runs
 * in user space and can be modifed by many attacks - and our internal service
 * layer.
 *
 * The reponsibility of this service is 2 fold.
 * - Provide connection interface - handle port communication, connect, disconnect etc
 * - Validate the incoming communication and make sure that what we receive is what we expect
 */
export default class ProviderBridgeService extends BaseService<Events> {
  // /**
  //  * Tracks pending account requests by id and the function that can be used to
  //  * respond to them when a response is provided via
  //  * `respondToPendingAccountRequest`.
  //  */
  // #pendingAccountRequests: {
  //   [dAppID: string]: (grantedAccounts: string[]) => void
  // } = {}

  static create: ServiceCreatorFunction<
    Events,
    ProviderBridgeService,
    [Promise<ChainService>, Promise<InternalEthereumProviderService>]
  > = async (chainService, internalEthereumProviderService) => {
    return new this(
      await getOrCreateDB(),
      await chainService,
      await internalEthereumProviderService
    )
  }

  private constructor(
    private db: ProviderBridgeServiceDatabase,
    private chainService: ChainService,
    private internalEthereumProviderService: InternalEthereumProviderService
  ) {
    super()

    browser.runtime.onConnect.addListener(async (port) => {
      if (port.name === "tally-external") {
        port.onMessage.addListener(async (event) => {
          logger.log(
            `background: request payload: ${JSON.stringify(event.request)}`
          )
          const response = {
            id: event.id,
            result: await this.routeContentScriptRPCRequest(
              event.request.method,
              event.request.params
            ),
          }
          logger.log("background response:", response)

          port.postMessage(response)
        })
      }
    })

    // TODO: on internal provider handlers connect, disconnect, account change, network change
  }

  routeContentScriptRPCRequest(
    method: string,
    params: unknown[]
  ): Promise<unknown> {
    switch (method) {
      case "eth_requestAccounts":
        // TODO: proper error handling
        return this.chainService
          .getAccountsToTrack()
          .then(([account]) => [account.address])
      case "eth_accounts":
        return this.chainService
          .getAccountsToTrack()
          .then(([account]) => [account.address])
      default: {
        return this.internalEthereumProviderService.routeSafetRPCRequest(
          method,
          params
        )
      }
    }
  }

  // async requestAccountAccess(dAppID: string): Promise<string[]> {
  //   const existingPermissions = await this.db.getDAppPermissions(dAppID)

  //   if (typeof existingPermissions !== "undefined") {
  //     return Promise.resolve(existingPermissions.allowedAccounts)
  //   }

  //   const requestPromise = new Promise<string[]>((resolve, reject) => {
  //     this.#pendingAccountRequests[dAppID] = (result) => {
  //       this.db
  //         .setDAppPermissions(dAppID, {
  //           allowedAccounts: result,
  //         })
  //         .then(() => resolve(result))
  //         .catch(reject)
  //     }
  //   })

  //   this.emitter.emit("accountAccessRequestedByDAppID", dAppID)
  //   return requestPromise
  // }
}
