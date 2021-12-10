import browser from "webextension-polyfill"
import {
  EXTERNAL_PORT_NAME,
  PermissionRequest,
  PopupWindowEntryPage,
  PortRequestEvent,
  PortResponseEvent,
  EIP1193Error,
  RPCRequest,
  EIP1193_ERROR,
} from "@tallyho/provider-bridge-shared"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from ".."
import logger from "../../lib/logger"
import BaseService from "../base"
import InternalEthereumProviderService from "../internal-ethereum-provider"
import { getOrCreateDB, ProviderBridgeServiceDatabase } from "./db"

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
  allowedPages: {
    [url: string]: PermissionRequest
  } = {}

  #pendingPermissionsRequests: {
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

      const response: PortResponseEvent = { id: event.id, result: [] }

      if (
        event.request.method === "eth_requestAccounts" &&
        !(await this.checkPermission(url))
      ) {
        const permissionRequest: PermissionRequest = {
          url,
          favIconUrl,
          state: "request",
        }

        const blockUntilUserAction = await this.requestPermission(
          permissionRequest
        )
        await blockUntilUserAction

        if (await this.checkPermission(url)) {
          response.result = new EIP1193Error(EIP1193_ERROR.userRejectedRequest)
        }
      } else {
        if (await this.checkPermission(url)) {
          response.result = await this.routeContentScriptRPCRequest(
            event.request.method,
            event.request.params
          )
        } else {
          response.result = new EIP1193Error(EIP1193_ERROR.unauthorized)
        }
      }
      logger.log("background response:", response)

      port.postMessage(response)
    }
  }

  async requestPermission(permissionRequest: PermissionRequest) {
    let blockResolve: (value: unknown) => void | undefined
    const blockUntilUserAction = new Promise((resolve) => {
      blockResolve = resolve
    })

    this.emitter.emit("permissionRequest", permissionRequest)
    await ProviderBridgeService.showDappConnectWindow("/permission")

    // ts compiler does not know that we assign value to blockResolve so we need to tell him
    this.#pendingPermissionsRequests[permissionRequest.url] = blockResolve!
    return blockUntilUserAction
  }

  async grandPermission(permission: PermissionRequest): Promise<void> {
    if (this.#pendingPermissionsRequests[permission.url]) {
      this.allowedPages[permission.url] = permission
      this.#pendingPermissionsRequests[permission.url]("Time to move on")
      delete this.#pendingPermissionsRequests[permission.url]
    }
  }

  async denyOrRevokePermission(permission: PermissionRequest): Promise<void> {
    if (this.#pendingPermissionsRequests[permission.url]) {
      delete this.allowedPages[permission.url]
      this.#pendingPermissionsRequests[permission.url]("Time to move on")
      delete this.#pendingPermissionsRequests[permission.url]
    }
  }

  async checkPermission(url: string): Promise<boolean> {
    if (this.allowedPages[url]?.state === "allow") return Promise.resolve(true)
    return Promise.resolve(false)
  }

  async routeContentScriptRPCRequest(
    method: string,
    params: RPCRequest["params"]
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

  static async showDappConnectWindow(
    url: PopupWindowEntryPage
  ): Promise<browser.Windows.Window> {
    const { left = 0, top, width = 1920 } = await browser.windows.getCurrent()
    const popupWidth = 384
    const popupHeight = 558
    return browser.windows.create({
      url: `${browser.runtime.getURL("popup.html")}?page=${url}`,
      type: "popup",
      left: left + width - popupWidth,
      top,
      width: popupWidth,
      height: popupHeight,
      focused: true,
    })
  }
}
