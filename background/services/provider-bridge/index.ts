import browser, { Runtime } from "webextension-polyfill"
import {
  EXTERNAL_PORT_NAME,
  PermissionRequest,
  AllowedQueryParamPage,
  PortRequestEvent,
  PortResponseEvent,
  EIP1193Error,
  RPCRequest,
  EIP1193_ERROR_CODES,
  isTallyConfigPayload,
} from "@tallyho/provider-bridge-shared"
import { TransactionRequest as EthersTransactionRequest } from "@ethersproject/abstract-provider"
import BaseService from "../base"
import InternalEthereumProviderService from "../internal-ethereum-provider"
import { getOrCreateDB, ProviderBridgeServiceDatabase } from "./db"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import PreferenceService from "../preferences"
import logger from "../../lib/logger"
import {
  checkPermissionSignTypedData,
  checkPermissionSign,
  checkPermissionSignTransaction,
} from "./authorization"
import showExtensionPopup from "./show-popup"
import { HexString } from "../../types"
import { WEBSITE_ORIGIN } from "../../constants/website"
import { PermissionMap } from "./utils"
import { toHexChainID } from "../../networks"

type Events = ServiceLifecycleEvents & {
  requestPermission: PermissionRequest
  initializeAllowedPages: PermissionMap
  setClaimReferrer: string
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
 * The responsibility of this service is 2 fold.
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

        // we need to send this info ASAP so it arrives before the webpage is initializing
        // so we can set our provider into the correct state, BEFORE the page has a chance to
        // to cache it, store it etc.
        port.postMessage({
          id: "tallyHo",
          jsonrpc: "2.0",
          result: {
            method: "tally_getConfig",
            defaultWallet: await this.preferenceService.getDefaultWallet(),
          },
        })
      }
      // TODO: on internal provider handlers connect, disconnect, account change, network change
    })
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

    const response: PortResponseEvent = {
      id: event.id,
      jsonrpc: "2.0",
      result: [],
    }

    const { chainID } =
      await this.internalEthereumProviderService.getActiveOrDefaultNetwork(
        origin
      )

    const originPermission = await this.checkPermission(origin, chainID)
    if (isTallyConfigPayload(event.request)) {
      // let's start with the internal communication
      response.id = "tallyHo"
      response.result = {
        method: event.request.method,
        defaultWallet: await this.preferenceService.getDefaultWallet(),
        chainId: toHexChainID(chainID),
      }
    } else if (event.request.method === "tally_setClaimReferrer") {
      const referrer = event.request.params[0]
      if (origin !== WEBSITE_ORIGIN || typeof referrer !== "string") {
        logger.warn(`invalid 'setClaimReferrer' request`)
        return
      }

      this.emitter.emit("setClaimReferrer", String(referrer))

      response.result = null
    } else if (event.request.method === "eth_chainId") {
      // we need to send back the chainId independent of dApp permission if we want to be compliant with MM and web3-react
      // We are calling the `internalEthereumProviderService.routeSafeRPCRequest` directly here, because the point
      // of this exception is to provide the proper chainId for the dApp, independent from the permissions.
      response.result =
        await this.internalEthereumProviderService.routeSafeRPCRequest(
          event.request.method,
          event.request.params,
          origin
        )
    } else if (typeof originPermission !== "undefined") {
      // if it's not internal but dapp has permission to communicate we proxy the request
      // TODO: here comes format validation
      response.result = await this.routeContentScriptRPCRequest(
        originPermission,
        event.request.method,
        event.request.params,
        origin
      )
    } else if (event.request.method === "wallet_addEthereumChain") {
      response.result =
        await this.internalEthereumProviderService.routeSafeRPCRequest(
          event.request.method,
          event.request.params,
          origin
        )
    } else if (event.request.method === "eth_requestAccounts") {
      // if it's external communication AND the dApp does not have permission BUT asks for it
      // then let's ask the user what he/she thinks

      const selectedAccount = await this.preferenceService.getSelectedAccount()

      const { address: accountAddress } = selectedAccount

      // @TODO 7/12/21 Figure out underlying cause here
      const dAppChainID = Number(
        (await this.internalEthereumProviderService.routeSafeRPCRequest(
          "eth_chainId",
          [],
          origin
        )) as string
      ).toString()

      const permissionRequest: PermissionRequest = {
        key: `${origin}_${accountAddress}_${dAppChainID}`,
        origin,
        chainID: dAppChainID,
        faviconUrl,
        title,
        state: "request",
        accountAddress,
      }

      const blockUntilUserAction = await this.requestPermission(
        permissionRequest
      )

      await blockUntilUserAction

      const persistedPermission = await this.checkPermission(
        origin,
        dAppChainID
      )
      if (typeof persistedPermission !== "undefined") {
        // if agrees then let's return the account data

        response.result = await this.routeContentScriptRPCRequest(
          persistedPermission,
          "eth_accounts",
          event.request.params,
          origin
        )
      } else {
        // if user does NOT agree, then reject

        response.result = new EIP1193Error(
          EIP1193_ERROR_CODES.userRejectedRequest
        ).toJSON()
      }
    } else {
      // sorry dear dApp, there is no love for you here
      response.result = new EIP1193Error(
        EIP1193_ERROR_CODES.unauthorized
      ).toJSON()
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
          shouldReload: true,
        },
      })
    })
  }

  notifyContentScriptsAboutAddressChange(newAddress?: string): void {
    this.openPorts.forEach(async (port) => {
      // we know that url exists because it was required to store the port
      const { origin } = new URL(port.sender?.url as string)
      const { chainID } =
        await this.internalEthereumProviderService.getActiveOrDefaultNetwork(
          origin
        )
      if (await this.checkPermission(origin, chainID)) {
        port.postMessage({
          id: "tallyHo",
          result: {
            method: "tally_accountChanged",
            address: [newAddress],
          },
        })
      } else {
        port.postMessage({
          id: "tallyHo",
          result: {
            method: "tally_accountChanged",
            address: [],
          },
        })
      }
    })
  }

  async requestPermission(
    permissionRequest: PermissionRequest
  ): Promise<unknown> {
    this.emitter.emit("requestPermission", permissionRequest)
    await showExtensionPopup(AllowedQueryParamPage.dappPermission)

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
    if (permission.state !== "deny" || !permission.accountAddress) {
      return
    }

    const { address } = await this.preferenceService.getSelectedAccount()

    // TODO make this multi-network friendly
    await this.db.deletePermission(
      permission.origin,
      address,
      permission.chainID
    )

    if (this.#pendingPermissionsRequests[permission.origin]) {
      this.#pendingPermissionsRequests[permission.origin]("Time to move on")
      delete this.#pendingPermissionsRequests[permission.origin]
    }

    this.notifyContentScriptsAboutAddressChange()
  }

  async checkPermission(
    origin: string,
    chainID: string
  ): Promise<PermissionRequest | undefined> {
    const { address: selectedAddress } =
      await this.preferenceService.getSelectedAccount()
    const currentAddress = selectedAddress
    // TODO make this multi-network friendly
    return this.db.checkPermission(origin, currentAddress, chainID)
  }

  async routeSafeRequest(
    method: string,
    params: unknown[],
    origin: string,
    popupPromise: Promise<browser.Windows.Window>
  ): Promise<unknown> {
    const response = await this.internalEthereumProviderService
      .routeSafeRPCRequest(method, params, origin)
      .finally(async () => {
        // Close the popup once we're done submitting.
        const popup = await popupPromise
        if (typeof popup.id !== "undefined") {
          browser.windows.remove(popup.id)
        }
      })
    return response
  }

  async routeContentScriptRPCRequest(
    enablingPermission: PermissionRequest,
    method: string,
    params: RPCRequest["params"],
    origin: string
  ): Promise<unknown> {
    try {
      switch (method) {
        case "eth_requestAccounts":
        case "eth_accounts":
          return [enablingPermission.accountAddress]
        case "eth_signTypedData":
        case "eth_signTypedData_v1":
        case "eth_signTypedData_v3":
        case "eth_signTypedData_v4":
          checkPermissionSignTypedData(
            params[0] as HexString,
            enablingPermission
          )

          return await this.routeSafeRequest(
            method,
            params,
            origin,
            showExtensionPopup(AllowedQueryParamPage.signData)
          )
        case "eth_sign":
          checkPermissionSign(params[0] as HexString, enablingPermission)

          return await this.routeSafeRequest(
            method,
            params,
            origin,
            showExtensionPopup(AllowedQueryParamPage.personalSignData)
          )
        case "personal_sign":
          checkPermissionSign(params[1] as HexString, enablingPermission)

          return await this.routeSafeRequest(
            method,
            params,
            origin,
            showExtensionPopup(AllowedQueryParamPage.personalSignData)
          )
        case "eth_signTransaction":
        case "eth_sendTransaction":
          checkPermissionSignTransaction(
            params[0] as EthersTransactionRequest,
            enablingPermission
          )

          return await this.routeSafeRequest(
            method,
            params,
            origin,
            showExtensionPopup(AllowedQueryParamPage.signTransaction)
          )

        default: {
          return await this.internalEthereumProviderService.routeSafeRPCRequest(
            method,
            params,
            origin
          )
        }
      }
    } catch (error) {
      logger.log("error processing request", error)
      return new EIP1193Error(EIP1193_ERROR_CODES.userRejectedRequest).toJSON()
    }
  }
}
