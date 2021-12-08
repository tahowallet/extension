import browser from "webextension-polyfill"
import {
  EXTERNAL_PORT_NAME,
  PortRequestEvent,
  PortResponseEvent,
} from "@tallyho/provider-bridge-shared"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from ".."
import logger from "../../lib/logger"
import BaseService from "../base"
import InternalEthereumProviderService from "../internal-ethereum-provider"
import { getOrCreateDB, ProviderBridgeServiceDatabase } from "./db"
import { PermissionRequest } from "../../redux-slices/provider-bridge"

type Events = ServiceLifecycleEvents & {
  permissionRequest: PermissionRequest
}

/**
 * The ProviderBridgeService is responsible for the communication with the
 * provider-bridge (content-script).
 *
 * The main purpose for this service/layer is to provide a transition
 * between the untrusted communication from the window-provider - which runs
 * in shared dapp space and can be modified by other extensions - and our
 * internal service layer.
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

  allowedPages: {
    [url: string]: PermissionRequest
  } = {}

  pendingPermissions: {
    [url: string]: (value: unknown) => void
  } = {}

  static create: ServiceCreatorFunction<
    Events,
    ProviderBridgeService,
    [Promise<InternalEthereumProviderService>]
  > = async (internalEthereumProviderService) => {
    return new this(
      await getOrCreateDB(),
      await internalEthereumProviderService
    )
  }

  private constructor(
    private db: ProviderBridgeServiceDatabase,
    private internalEthereumProviderService: InternalEthereumProviderService
  ) {
    super()

    browser.runtime.onConnect.addListener(async (port) => {
      if (port.name === EXTERNAL_PORT_NAME && port.sender?.url) {
        const listener = this.onMessageListener(
          port as Required<browser.Runtime.Port>
        )
        port.onMessage.addListener(listener)
        // TODO: store port with listener to handle cleanup
      }
    })

    // TODO: on internal provider handlers connect, disconnect, account change, network change
  }

  onMessageListener(
    port: Required<browser.Runtime.Port>
  ): (event: PortRequestEvent) => Promise<void> {
    const url = port.sender.url as string
    const favIconUrl = port.sender.tab?.favIconUrl ?? ""

    return async (event: PortRequestEvent) => {
      // a port: browser.Runtime.Port is passed into this function as a 2nd argument by the port.onMessage.addEventListener.
      // This contradicts the MDN documentation so better not to rely on it.
      logger.log(
        `background: request payload: ${JSON.stringify(event.request)}`
      )

      if (event.request.method === "eth_requestAccounts") {
        const permissionRequest: PermissionRequest = {
          url,
          favIconUrl,
          state: "request",
        }
        let blockResolve: (value: unknown) => void
        const blockUntilUserAction = new Promise((resolve) => {
          blockResolve = resolve
        })

        this.emitter.emit("permissionRequest", permissionRequest)
        await ProviderBridgeService.showDappConnectWindow()

        // @ts-expect-error unblockResolve is assigned value in the Promise but don't know how to convince ts about this (assigning default value did not feel right)
        this.pendingPermissions[permissionRequest.url] = blockResolve
        await blockUntilUserAction
      }

      // TBD @Antonio:
      // I copied the way MM works here — I return `result: []` when the url does not have permission
      // According to EIP-1193 it should return a `4100` ProviderRPCError but felt that dApps probably does not expect this.
      const response: PortResponseEvent = { id: event.id, result: [] }
      if (await this.checkPermission(url)) {
        response.result = await this.routeContentScriptRPCRequest(
          event.request.method,
          event.request.params
        )
      }
      logger.log("background response:", response)

      port.postMessage(response)
    }
  }

  async permissionGrant(permission: PermissionRequest): Promise<void> {
    if (this.pendingPermissions[permission.url]) {
      this.allowedPages[permission.url] = permission
      this.pendingPermissions[permission.url]("Time to move on")
      delete this.pendingPermissions[permission.url]
    }
  }

  async permissionDenyOrRevoke(permission: PermissionRequest): Promise<void> {
    if (this.pendingPermissions[permission.url]) {
      delete this.allowedPages[permission.url]
      this.pendingPermissions[permission.url]("Time to move on")
      delete this.pendingPermissions[permission.url]
    }
  }

  async checkPermission(url: string): Promise<boolean> {
    if (this.allowedPages[url]?.state === "allow") return Promise.resolve(true)
    return Promise.resolve(false)
  }

  async routeContentScriptRPCRequest(
    method: string,
    params: unknown[]
  ): Promise<unknown> {
    switch (method) {
      case "eth_requestAccounts":
        return this.internalEthereumProviderService.routeSafeRPCRequest(
          "eth_accounts",
          params
        )
      default: {
        return this.internalEthereumProviderService.routeSafeRPCRequest(
          method,
          params
        )
      }
    }
  }

  static async showDappConnectWindow(): Promise<browser.Windows.Window> {
    const { left = 0, top, width = 1920 } = await browser.windows.getCurrent()
    const popupWidth = 400
    const popupHeight = 600
    const internalPageName = "permission"
    return browser.windows.create({
      url: `${browser.runtime.getURL("popup.html")}?page=${internalPageName}`,
      type: "popup",
      left: left + width - popupWidth,
      top,
      width: popupWidth,
      height: popupHeight,
      focused: true,
    })
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
