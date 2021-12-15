import browser, { Runtime } from "webextension-polyfill"
import {
  EXTERNAL_PORT_NAME,
  PermissionRequest,
  AllowedQueryParamPage,
  AllowedQueryParamPageType,
  PortRequestEvent,
  PortResponseEvent,
  EIP1193Error,
  RPCRequest,
  EIP1193_ERROR,
  isTallyInternalCommunication,
} from "@tallyho/provider-bridge-shared"
import {
  PreferenceService,
  ServiceCreatorFunction,
  ServiceLifecycleEvents,
} from ".."
import BaseService from "../base"
import InternalEthereumProviderService from "../internal-ethereum-provider"
import { getOrCreateDB, ProviderBridgeServiceDatabase } from "./db"

type Events = ServiceLifecycleEvents & {
  requestPermission: PermissionRequest
  initializeAllowedPages: Record<string, PermissionRequest>
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
  #pendingPermissionsRequests: {
    [origin: string]: (value: unknown) => void
  } = {}

  openPorts: Array<Runtime.Port> = []

  static create: ServiceCreatorFunction<
    Events,
    ProviderBridgeService,
    [Promise<InternalEthereumProviderService>, Promise<PreferenceService>]
  > = async (internalEthereumProviderService, preferenceService) => {
    return new this(
      await getOrCreateDB(),
      await internalEthereumProviderService,
      await preferenceService
    )
  }

  private constructor(
    private db: ProviderBridgeServiceDatabase,
    private internalEthereumProviderService: InternalEthereumProviderService,
    private preferenceService: PreferenceService
  ) {
    super()

    browser.runtime.onConnect.addListener(async (port) => {
      if (port.name === EXTERNAL_PORT_NAME && port.sender?.url) {
        port.onMessage.addListener((event) => {
          this.onMessageListener(port as Required<browser.Runtime.Port>, event)
        })
        port.onDisconnect.addListener(() => {
          this.openPorts = this.openPorts.filter(
            (openPort) => openPort !== port
          )
        })
        this.openPorts.push(port)
      }
    })

    // TODO: on internal provider handlers connect, disconnect, account change, network change
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService() // Not needed, but better to stick to the patterns

    this.emitter.emit(
      "initializeAllowedPages",
      await this.db.getAllPermission()
    )
  }

  async onMessageListener(
    port: Required<browser.Runtime.Port>,
    event: PortRequestEvent
  ): Promise<void> {
    const { url, tab } = port.sender
    if (typeof url === "undefined") {
      return
    }

    const { origin } = new URL(url)
    const completeTab =
      typeof tab !== "undefined" && typeof tab.id !== "undefined"
        ? {
            ...tab,
            // Firefox sometimes requires an extra query to get favicons,
            // unclear why but may be related to
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1417721 .
            ...(await browser.tabs.get(tab.id)),
          }
        : tab
    const faviconUrl = completeTab?.favIconUrl ?? ""
    const title = completeTab?.title ?? ""

    const response: PortResponseEvent = { id: event.id, result: [] }

    if (isTallyInternalCommunication(event.request)) {
      // let's start with the internal communication
      response.id = "tallyHo"
      response.result = {
        method: event.request.method,
        defaultWallet: await this.preferenceService.getDefaultWallet(),
      }
    } else if (await this.checkPermission(origin)) {
      // if it's not internal but dapp has permission to communicate we proxy the request
      // TODO: here comes format validation
      response.result = await this.routeContentScriptRPCRequest(
        event.request.method,
        event.request.params
      )
    } else if (event.request.method === "eth_requestAccounts") {
      // if it's external communication AND the dApp does not have permission BUT asks for it
      // then let's ask the user what he/she thinks

      const permissionRequest: PermissionRequest = {
        origin,
        faviconUrl,
        title,
        state: "request",
        accountAddress: "",
      }

      const blockUntilUserAction = await this.requestPermission(
        permissionRequest
      )

      await blockUntilUserAction

      if (await this.checkPermission(origin)) {
        // if agrees then let's return the account data

        response.result = await this.routeContentScriptRPCRequest(
          "eth_accounts",
          event.request.params
        )
      } else {
        // if user does NOT agree, then reject

        response.result = new EIP1193Error(EIP1193_ERROR.userRejectedRequest)
      }
    } else {
      // sorry dear dApp, there is no love for you here
      response.result = new EIP1193Error(EIP1193_ERROR.unauthorized)
    }

    port.postMessage(response)
  }

  notifyContentScriptAboutConfigChange(newDefaultWalletValue: boolean): void {
    this.openPorts.forEach((p) => {
      p.postMessage({
        id: "tallyHo",
        result: {
          method: "tally_getConfig",
          defaultWallet: newDefaultWalletValue,
        },
      })
    })
  }

  async requestPermission(
    permissionRequest: PermissionRequest
  ): Promise<unknown> {
    this.emitter.emit("requestPermission", permissionRequest)
    await ProviderBridgeService.showExtensionPopup(
      AllowedQueryParamPage.dappPermission
    )

    return new Promise((resolve) => {
      this.#pendingPermissionsRequests[permissionRequest.origin] = resolve
    })
  }

  async grantPermission(permission: PermissionRequest): Promise<void> {
    // FIXME proper error handling if this happens - should not tho
    if (permission.state !== "allow" || !permission.accountAddress) return

    await this.db.setPermission(permission)

    if (this.#pendingPermissionsRequests[permission.origin]) {
      this.#pendingPermissionsRequests[permission.origin](permission)
      delete this.#pendingPermissionsRequests[permission.origin]
    }
  }

  async denyOrRevokePermission(permission: PermissionRequest): Promise<void> {
    // FIXME proper error handling if this happens - should not tho
    if (permission.state !== "deny" || !permission.accountAddress) return

    await this.db.deletePermission(permission.origin)

    if (this.#pendingPermissionsRequests[permission.origin]) {
      this.#pendingPermissionsRequests[permission.origin]("Time to move on")
      delete this.#pendingPermissionsRequests[permission.origin]
    }
  }

  async checkPermission(origin: string): Promise<boolean> {
    return this.db.checkPermission(origin).then((r) => !!r)
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
      case "eth_signTransaction":
      case "eth_sendTransaction":
        // We are monsters.
        // eslint-disable-next-line no-case-declarations
        const popupPromise = ProviderBridgeService.showExtensionPopup(
          AllowedQueryParamPage.signTransaction
        )
        return this.internalEthereumProviderService
          .routeSafeRPCRequest(method, params)
          .finally(async () => {
            // Close the popup once we're done submitting.
            const popup = await popupPromise
            if (typeof popup.id !== "undefined") {
              browser.windows.remove(popup.id)
            }
          })
      // Above, show the connect window, then continue on to regular handling.
      // eslint-disable-next-line no-fallthrough
      default: {
        return this.internalEthereumProviderService.routeSafeRPCRequest(
          method,
          params
        )
      }
    }
  }

  private static async showExtensionPopup(
    url: AllowedQueryParamPageType
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
