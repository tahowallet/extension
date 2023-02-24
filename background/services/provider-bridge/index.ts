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
import InternalEthereumProviderService, {
  AddEthereumChainParameter,
} from "../internal-ethereum-provider"
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
import {
  handleRPCErrorResponse,
  PermissionMap,
  validateAddEthereumChainParameter,
  ValidatedAddEthereumChainParameter,
  parseRPCRequestParams,
} from "./utils"
import { toHexChainID } from "../../networks"
import { TALLY_INTERNAL_ORIGIN } from "../internal-ethereum-provider/constants"

type Events = ServiceLifecycleEvents & {
  requestPermission: PermissionRequest
  initializeAllowedPages: PermissionMap
  setClaimReferrer: string
  /**
   * Contains the Wallet Connect URI required to pair/connect
   */
  walletConnectInit: string
}

export type AddChainRequestData = ValidatedAddEthereumChainParameter & {
  favicon: string
  siteTitle: string
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

  #pendingAddNetworkRequests: {
    [id: string]: {
      resolve: () => void
      reject: () => void
      data: AddChainRequestData
    }
  } = {}

  private addNetworkRequestId = 0

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

  protected override async internalStartService(): Promise<void> {
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

    const response: PortResponseEvent = {
      id: event.id,
      jsonrpc: "2.0",
      result: [],
    }
    const network =
      await this.internalEthereumProviderService.getCurrentOrDefaultNetworkForOrigin(
        origin
      )

    const originPermission = await this.checkPermission(origin, network.chainID)
    if (origin === TALLY_INTERNAL_ORIGIN) {
      // Explicitly disallow anyone who has managed to pretend to be the
      // internal provider.
      response.result = new EIP1193Error(
        EIP1193_ERROR_CODES.unauthorized
      ).toJSON()
    } else if (isTallyConfigPayload(event.request)) {
      // let's start with the internal communication
      response.id = "tallyHo"
      response.result = {
        method: event.request.method,
        defaultWallet: await this.preferenceService.getDefaultWallet(),
        chainId: toHexChainID(network.chainID),
      }
    } else if (event.request.method.startsWith("tally_")) {
      switch (event.request.method) {
        case "tally_setClaimReferrer":
          if (origin !== WEBSITE_ORIGIN) {
            logger.warn(
              `invalid WEBSITE_ORIGIN ${WEBSITE_ORIGIN} when using a custom 'tally_...' method`
            )
            return
          }

          if (typeof event.request.params[0] !== "string") {
            logger.warn(`invalid 'tally_setClaimReferrer' request`)
            return
          }

          this.emitter.emit("setClaimReferrer", String(event.request.params[0]))
          break
        case "tally_walletConnectInit": {
          const [wcUri] = event.request.params
          if (typeof wcUri === "string") {
            await this.emitter.emit("walletConnectInit", wcUri)
          } else {
            logger.warn(`invalid 'tally_walletConnectInit' request`)
          }

          break
        }
        default:
          logger.debug(
            `Unknown method ${event.request.method} in 'ProviderBridgeService'`
          )
      }

      response.result = null
    } else if (
      event.request.method === "eth_chainId" ||
      event.request.method === "net_version"
    ) {
      // we need to send back the chainId and net_version (a deprecated
      // precursor to eth_chainId) independent of dApp permission if we want to
      // be compliant with MM and web3-react We are calling the
      // `internalEthereumProviderService.routeSafeRPCRequest` directly here,
      // because the point of this exception is to provide the proper chainId
      // for the dApp, independent from the permissions.
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

      // these params are taken directly from the dapp website
      const [title, faviconUrl] = event.request.params as string[]

      const permissionRequest: PermissionRequest = {
        key: `${origin}_${accountAddress}_${dAppChainID}`,
        origin,
        chainID: dAppChainID,
        faviconUrl: faviconUrl || tab?.favIconUrl || "", // if favicon was not found on the website then try with browser's `tab`
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
    } else if (event.request.method === "eth_accounts") {
      const dAppChainID = Number(
        (await this.internalEthereumProviderService.routeSafeRPCRequest(
          "eth_chainId",
          [],
          origin
        )) as string
      ).toString()

      const permission = await this.checkPermission(origin, dAppChainID)

      response.result = []

      if (permission) {
        response.result = await this.routeContentScriptRPCRequest(
          permission,
          "eth_accounts",
          event.request.params,
          origin
        )
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
        await this.internalEthereumProviderService.getCurrentOrDefaultNetworkForOrigin(
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

  async revokePermissionsForAddress(revokeAddress: string): Promise<void> {
    await this.db.deletePermissionByAddress(revokeAddress)
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
    rawParams: RPCRequest["params"],
    origin: string
  ): Promise<unknown> {
    const params = parseRPCRequestParams(enablingPermission, method, rawParams)

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
            {
              // A dApp can't know what should be the next nonce because it can't access
              // the information about how many tx are in the signing process inside the
              // wallet. Nonce should be assigned only by the wallet.
              ...(params[0] as EthersTransactionRequest),
              nonce: undefined,
            },
            enablingPermission
          )

          return await this.routeSafeRequest(
            method,
            params,
            origin,
            showExtensionPopup(AllowedQueryParamPage.signTransaction)
          )

        case "wallet_switchEthereumChain":
          return await this.internalEthereumProviderService.routeSafeRPCRequest(
            method,
            params,
            origin
          )

        case "wallet_addEthereumChain": {
          const id = this.addNetworkRequestId.toString()

          this.addNetworkRequestId += 1

          const window = await showExtensionPopup(
            AllowedQueryParamPage.addNewChain,
            { requestId: id.toString() }
          )

          browser.windows.onRemoved.addListener((removed) => {
            if (removed === window.id) {
              this.handleAddNetworkRequest(id, false)
            }
          })

          const [rawChainData, address, siteTitle, favicon] = params
          const validatedData = validateAddEthereumChainParameter(
            rawChainData as AddEthereumChainParameter
          )

          const userConfirmation = new Promise<void>((resolve, reject) => {
            this.#pendingAddNetworkRequests[id] = {
              resolve,
              reject,
              data: {
                ...validatedData,
                favicon: favicon as string,
                siteTitle: siteTitle as string,
              },
            }
          })

          await userConfirmation

          return await this.internalEthereumProviderService.routeSafeRPCRequest(
            method,
            [validatedData, address],
            origin
          )
        }
        default: {
          return await this.internalEthereumProviderService.routeSafeRPCRequest(
            method,
            params,
            origin
          )
        }
      }
    } catch (error) {
      logger.error("Error processing request", error)
      return handleRPCErrorResponse(error)
    }
  }

  getNewCustomRPCDetails(requestId: string): AddChainRequestData {
    return this.#pendingAddNetworkRequests[requestId].data
  }

  handleAddNetworkRequest(id: string, success: boolean): void {
    const request = this.#pendingAddNetworkRequests[id]
    if (success) {
      request.resolve()
    } else {
      request.reject()
    }
  }
}
