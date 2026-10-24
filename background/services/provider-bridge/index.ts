import browser, { Runtime } from "webextension-polyfill"
import {
  EXTERNAL_PORT_NAME,
  PermissionRequest,
  DeniedPermission,
  AllowedQueryParamPage,
  PortRequestEvent,
  PortResponseEvent,
  EIP1193Error,
  RPCRequest,
  EIP1193_ERROR_CODES,
  isTahoConfigPayload,
} from "@tallyho/provider-bridge-shared"
import { TransactionRequest as EthersTransactionRequest } from "@ethersproject/abstract-provider"
import BaseService from "../base"
import InternalEthereumProviderService, {
  AddEthereumChainParameter,
} from "../internal-ethereum-provider"
import { getOrCreateDB, ProviderBridgeServiceDatabase } from "./db"
import type { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import PreferenceService from "../preferences"
import logger from "../../lib/logger"
import {
  checkPermissionSignTypedData,
  checkPermissionSign,
  checkPermissionSignTransaction,
} from "./authorization"
import showExtensionPopup from "./show-popup"
import type { HexString } from "../../types"
import { WEBSITE_ORIGIN } from "../../constants/website"
import {
  handleRPCErrorResponse,
  PermissionMap,
  validateAddEthereumChainParameter,
  ValidatedAddEthereumChainParameter,
  parseRPCRequestParams,
} from "./utils"
import { EVMNetwork, toHexChainID } from "../../networks"
import { TAHO_INTERNAL_ORIGIN } from "../internal-ethereum-provider/constants"
import { DAPP_BASE_URL as MEZO_DAPP_BASE_URL } from "../campaign/matsnet-nft"
import { sameEVMAddress } from "../../lib/utils"

type Events = ServiceLifecycleEvents & {
  requestPermission: PermissionRequest
  initializeAllowedPages: PermissionMap
  setClaimReferrer: string
  /**
   * Contains the Wallet Connect URI required to pair/connect
   */
  walletConnectInit: string
  /**
   * Contains claimer id
   */
  mezoClaimData: string
  getMezoClaimData: void
  revokePermissionsForOrigin: string
}

type ProviderBridgeRPCHandler = (
  origin: string,
  enablingPermission: PermissionRequest,
) => Promise<unknown>

type PermittedRPCHandler = (
  params: RPCRequest["params"],
  origin: string,
  enablingPermission: PermissionRequest,
) => Promise<unknown>

const accountsPermissionFor: ProviderBridgeRPCHandler = async (
  _,
  enablingPermission,
) => [
  {
    parentCapability: "eth_accounts",
    caveats: [
      {
        type: "restrictReturnedAccounts",
        value: [enablingPermission.accountAddress],
      },
    ],
    date: Date.now(),
  },
]

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
    [origin: string]: (_: unknown) => void
  } = {}

  #pendingAddNetworkRequests: {
    [id: string]: {
      resolve: () => void
      reject: () => void
      data: AddChainRequestData
    }
  } = {}

  /**
   * Tracks pending signing requests by hash to detect duplicate requests from
   * dapps. When a duplicate is detected, it subscribes to the same outcome as
   * the original request rather than creating a new signing flow.
   */
  #pendingSigningRequests: Map<
    string,
    {
      timestamp: number
      promise: Promise<unknown>
    }
  > = new Map()

  private addNetworkRequestId = 0

  /**
   * RPC methods the provider bridge answers itself rather than routing to the
   * internal provider.
   */
  private readonly ownRPCHandlers = {
    eth_requestAccounts: async (_, enablingPermission) => [
      enablingPermission.accountAddress,
    ],
    wallet_requestPermissions: accountsPermissionFor,
    wallet_getPermissions: accountsPermissionFor,
    wallet_revokePermissions: async (origin: string) => {
      await this.revokePermissionsForOrigin(origin)
      return null
    },
  } satisfies Record<string, ProviderBridgeRPCHandler>

  private readonly signTypedDataHandler =
    (method: string): PermittedRPCHandler =>
    async (params, origin, enablingPermission) => {
      checkPermissionSignTypedData(params[0] as HexString, enablingPermission)

      return this.routeSafeRequest(
        method,
        params,
        origin,
        showExtensionPopup(AllowedQueryParamPage.signData),
      )
    }

  private readonly signTransactionHandler =
    (method: string): PermittedRPCHandler =>
    async (params, origin, enablingPermission) => {
      checkPermissionSignTransaction(
        {
          // A dApp can't know what should be the next nonce because it can't
          // access the information about how many tx are in the signing
          // process inside the wallet. Nonce should be assigned only by the
          // wallet.
          ...(params[0] as EthersTransactionRequest),
          nonce: undefined,
        },
        enablingPermission,
      )

      return this.routeSafeRequest(
        method,
        params,
        origin,
        showExtensionPopup(AllowedQueryParamPage.signTransaction),
      )
    }

  /**
   * RPC methods that need the origin's permission and that the provider
   * bridge handles before or instead of the internal provider.
   */
  private readonly permittedRPCHandlers = {
    eth_accounts: async (_, __, enablingPermission) => [
      enablingPermission.accountAddress,
    ],
    eth_signTypedData: this.signTypedDataHandler("eth_signTypedData"),
    eth_signTypedData_v1: this.signTypedDataHandler("eth_signTypedData_v1"),
    eth_signTypedData_v3: this.signTypedDataHandler("eth_signTypedData_v3"),
    eth_signTypedData_v4: this.signTypedDataHandler("eth_signTypedData_v4"),
    eth_sign: async (params, origin, enablingPermission) => {
      checkPermissionSign(params[0] as HexString, enablingPermission)

      return this.routeSafeRequest(
        "eth_sign",
        params,
        origin,
        showExtensionPopup(AllowedQueryParamPage.personalSignData),
      )
    },
    personal_sign: async (params, origin, enablingPermission) => {
      checkPermissionSign(params[1] as HexString, enablingPermission)

      return this.routeSafeRequest(
        "personal_sign",
        params,
        origin,
        showExtensionPopup(AllowedQueryParamPage.personalSignData),
      )
    },
    eth_signTransaction: this.signTransactionHandler("eth_signTransaction"),
    eth_sendTransaction: this.signTransactionHandler("eth_sendTransaction"),
    wallet_switchEthereumChain: async (params, origin) => {
      const [switchParameter]: unknown[] = params

      const targetNetwork =
        typeof switchParameter === "object" &&
        switchParameter !== null &&
        "chainId" in switchParameter &&
        typeof switchParameter.chainId === "string"
          ? await this.internalEthereumProviderService.getTrackedNetworkByChainId(
              switchParameter.chainId,
            )
          : undefined

      // Unknown chains are left to the internal provider, which reports
      // them as unrecognized so the dapp can offer to add them.
      if (targetNetwork !== undefined) {
        await this.assertPermittedOnNetwork(origin, targetNetwork)
      }

      return this.internalEthereumProviderService.routeSafeRPCRequest(
        "wallet_switchEthereumChain",
        params,
        origin,
      )
    },
    wallet_addEthereumChain: async (params, origin, enablingPermission) => {
      const id = this.addNetworkRequestId.toString()

      this.addNetworkRequestId += 1

      const [rawChainData, address, siteTitle, favicon] = params
      const validatedData = validateAddEthereumChainParameter(
        rawChainData as AddEthereumChainParameter,
      )

      const supportedNetwork =
        await this.internalEthereumProviderService.getTrackedNetworkByChainId(
          validatedData.chainId,
        )

      if (supportedNetwork) {
        // If the network is already added - just switch to it, as long as
        // the dapp is allowed on it.
        await this.assertPermittedOnNetwork(origin, supportedNetwork)

        return this.internalEthereumProviderService.routeSafeRPCRequest(
          "wallet_addEthereumChain",
          params,
          origin,
        )
      }

      const window = await showExtensionPopup(
        AllowedQueryParamPage.addNewChain,
        { requestId: id.toString() },
      )

      browser.windows.onRemoved.addListener((removed) => {
        if (removed === window.id) {
          this.handleAddNetworkRequest(id, false)
        }
      })

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

      const account = await this.preferenceService.getSelectedAccount()

      await this.grantPermission({
        ...enablingPermission,
        key: `${origin}_${account.address}_${validatedData.chainId}`,
        chainID: validatedData.chainId,
      })

      return this.internalEthereumProviderService.routeSafeRPCRequest(
        "wallet_addEthereumChain",
        [validatedData, address],
        origin,
      )
    },
  } satisfies Record<string, PermittedRPCHandler>

  openPorts: Array<Runtime.Port> = []

  static create: ServiceCreatorFunction<
    Events,
    ProviderBridgeService,
    [Promise<InternalEthereumProviderService>, Promise<PreferenceService>]
  > = async (internalEthereumProviderService, preferenceService) =>
    new this(
      await getOrCreateDB(),
      await internalEthereumProviderService,
      await preferenceService,
    )

  private constructor(
    private db: ProviderBridgeServiceDatabase,
    private internalEthereumProviderService: InternalEthereumProviderService,
    private preferenceService: PreferenceService,
  ) {
    super()
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService() // Not needed, but better to stick to the patterns

    this.emitter.emit(
      "initializeAllowedPages",
      await this.db.getAllPermission(),
    )
  }

  async onMessageListener(
    port: Required<browser.Runtime.Port>,
    event: PortRequestEvent,
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
        origin,
      )

    const originPermission = await this.checkPermission(origin, network.chainID)
    if (origin === TAHO_INTERNAL_ORIGIN) {
      // Explicitly disallow anyone who has managed to pretend to be the
      // internal provider.
      response.result = new EIP1193Error(
        EIP1193_ERROR_CODES.unauthorized,
      ).toJSON()
    } else if (isTahoConfigPayload(event.request)) {
      // let's start with the internal communication
      response.id = "tallyHo"
      response.result = {
        method: event.request.method,
        defaultWallet: await this.preferenceService.getDefaultWallet(),
        chainId: toHexChainID(network.chainID),
      }
    } else if (event.request.method.startsWith("tally_")) {
      response.result = null

      switch (event.request.method) {
        case "tally_setClaimReferrer":
          if (origin !== WEBSITE_ORIGIN) {
            logger.warn(
              `invalid WEBSITE_ORIGIN ${WEBSITE_ORIGIN} when using a custom 'tally_...' method`,
            )
            return
          }

          if (typeof event.request.params[0] !== "string") {
            logger.warn("invalid 'tally_setClaimReferrer' request")
            return
          }

          this.emitter.emit("setClaimReferrer", String(event.request.params[0]))
          break
        case "tally_walletConnectInit": {
          const [wcUri] = event.request.params
          if (typeof wcUri === "string") {
            await this.emitter.emit("walletConnectInit", wcUri)
          } else {
            logger.warn("invalid 'tally_walletConnectInit' request")
          }

          break
        }
        case "tally_getMezoClaimData":
          if (origin === new URL(MEZO_DAPP_BASE_URL).origin) {
            // This is a hack, but we have no other way of accessing this data
            // though it should probably be set post install on the Preference
            // service
            const installId = this.emitter.once("mezoClaimData")

            this.emitter.emit("getMezoClaimData", undefined)
            response.result = [await installId]
          }
          break
        default:
          logger.debug(
            `Unknown method ${event.request.method} in 'ProviderBridgeService'`,
          )
      }
    } else if (!this.isSupportedRPCMethod(event.request.method)) {
      // Methods Taho doesn't implement are reported as unsupported whether or
      // not the dapp is connected. Answering 4100 to an unconnected dapp
      // suggests that connecting would make the method work, and dapps probing
      // for optional features (wallet_getCapabilities, for example) treat 4200
      // as "not available" and move on.
      response.result = new EIP1193Error(
        EIP1193_ERROR_CODES.unsupportedMethod,
      ).toJSON()
    } else if (event.request.method === "wallet_revokePermissions") {
      // wallet_revokePermissions is handled before the permission check
      // because it should succeed regardless of whether the dapp currently
      // has permissions (revoking when already disconnected is a no-op).
      response.result =
        await this.ownRPCHandlers.wallet_revokePermissions(origin)
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
          origin,
        )
    } else if (typeof originPermission !== "undefined") {
      // if it's not internal but dapp has permission to communicate we proxy the request
      // TODO: here comes format validation
      response.result = await this.routeContentScriptRPCRequest(
        originPermission,
        event.request.method,
        event.request.params,
        origin,
      )
    } else if (
      event.request.method === "eth_requestAccounts" ||
      // We implement a partial wallet_requestPermissions implementation that
      // only ever allows access to eth_accounts.
      event.request.method === "wallet_requestPermissions"
    ) {
      // if it's external communication AND the dApp does not have permission BUT asks for it
      // then let's ask the user what he/she thinks

      const selectedAccount = await this.preferenceService.getSelectedAccount()

      const { address: accountAddress } = selectedAccount

      // @TODO 7/12/21 Figure out underlying cause here
      const dAppChainID = Number(
        (await this.internalEthereumProviderService.routeSafeRPCRequest(
          "eth_chainId",
          [],
          origin,
        )) as string,
      ).toString()

      // these params are taken directly from the dapp website and injected by
      // /provider-bridge/index.ts . The last two parameters are guaranteed
      // to be this, and no parameters that might be passed before these should
      // be read as injected (which can happen in certain invocations of these
      // methods).
      const [title, faviconUrl] = event.request.params.slice(-2) as string[]

      const existingPermission = await this.checkPermission(origin, dAppChainID)
      if (
        // If there's an existing permission record and it's not an explicit
        // allow, immediately return a rejection.
        (existingPermission !== undefined &&
          existingPermission.state !== "allow") ||
        // If there's an unresolved request for the domain, likewise return a
        // rejection. We only allow one in-flight permissions request for a
        // given domain at a time.
        this.#pendingPermissionsRequests[origin] !== undefined
      ) {
        response.result = new EIP1193Error(
          EIP1193_ERROR_CODES.userRejectedRequest,
        ).toJSON()
      } else {
        const permissionRequest: PermissionRequest = {
          key: `${origin}_${accountAddress}_${dAppChainID}`,
          origin,
          chainID: dAppChainID,
          faviconUrl: faviconUrl || tab?.favIconUrl || "", // if favicon was not found on the website then try with browser's `tab`
          title,
          state: "request",
          accountAddress,
        }

        await this.requestPermission(permissionRequest)

        const newlyPersistedPermission = await this.checkPermission(
          origin,
          dAppChainID,
        )

        if (typeof newlyPersistedPermission !== "undefined") {
          // if agrees then let's return the account data

          if (event.request.method === "wallet_requestPermissions") {
            response.result = await this.routeContentScriptRPCRequest(
              newlyPersistedPermission,
              "wallet_getPermissions",
              event.request.params,
              origin,
            )
          } else {
            response.result = await this.routeContentScriptRPCRequest(
              newlyPersistedPermission,
              "eth_accounts",
              event.request.params,
              origin,
            )
          }

          // on dApp connection, persist the current network/origin state
          await this.internalEthereumProviderService.switchToSupportedNetwork(
            origin,
            network,
          )
        } else {
          // if user does NOT agree, then reject

          response.result = new EIP1193Error(
            EIP1193_ERROR_CODES.userRejectedRequest,
          ).toJSON()
        }
      }
    } else if (event.request.method === "eth_accounts") {
      const dAppChainID = Number(
        (await this.internalEthereumProviderService.routeSafeRPCRequest(
          "eth_chainId",
          [],
          origin,
        )) as string,
      ).toString()

      const permission = await this.checkPermission(origin, dAppChainID)

      response.result = []

      if (permission) {
        response.result = await this.routeContentScriptRPCRequest(
          permission,
          "eth_accounts",
          event.request.params,
          origin,
        )
      }
    } else {
      // sorry dear dApp, there is no love for you here
      response.result = new EIP1193Error(
        EIP1193_ERROR_CODES.unauthorized,
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

  async notifyContentScriptsAboutNetworkChange(
    origin: string,
    chainID: string,
  ): Promise<void> {
    const defaultWallet = await this.preferenceService.getDefaultWallet()
    this.openPorts.forEach((port) => {
      const portOrigin = new URL(port.sender?.url as string).origin
      if (portOrigin === origin) {
        port.postMessage({
          id: "tallyHo",
          result: {
            method: "tally_getConfig",
            defaultWallet,
            chainId: chainID,
          },
        })
      }
    })
  }

  notifyContentScriptsAboutAddressChange(): void {
    this.openPorts.forEach(async (port) => {
      // we know that url exists because it was required to store the port
      const { origin } = new URL(port.sender?.url as string)
      const { chainID } =
        await this.internalEthereumProviderService.getCurrentOrDefaultNetworkForOrigin(
          origin,
        )
      const permission = await this.checkPermission(origin, chainID)
      port.postMessage({
        id: "tallyHo",
        result: {
          method: "tally_accountChanged",
          address: permission ? [permission.accountAddress] : [],
        },
      })
    })
  }

  /**
   * Tells every connected page whether the wallet can reach the chain it is
   * connected to, so a dApp can stop showing a page's worth of zeroes as
   * though they were data.
   *
   * EIP-1193's 4901 is explicitly about the chain the page is connected to
   * rather than about the wallet as a whole, so only pages on that chain hear
   * about it.
   */
  notifyContentScriptsAboutChainReachability(
    chainID: string,
    reachable: boolean,
  ): void {
    const hexChainID = toHexChainID(chainID)

    this.openPorts.forEach(async (port) => {
      // we know that url exists because it was required to store the port
      const { origin } = new URL(port.sender?.url as string)
      const { chainID: portChainID } =
        await this.internalEthereumProviderService.getCurrentOrDefaultNetworkForOrigin(
          origin,
        )

      // Pages on some other network are told nothing rather than told about a
      // chain they are not on. Beyond being the wrong thing to say, it would
      // hand every page a view of which chains the wallet is watching and how
      // they are doing.
      if (portChainID !== chainID) {
        return
      }

      port.postMessage({
        id: "tallyHo",
        result: {
          method: "tally_chainReachabilityChanged",
          chainId: hexChainID,
          reachable,
        },
      })
    })
  }

  async requestPermission(
    permissionRequest: PermissionRequest,
  ): Promise<unknown> {
    this.emitter.emit("requestPermission", permissionRequest)

    const permissionPromise = new Promise((resolve) => {
      this.#pendingPermissionsRequests[permissionRequest.origin] = resolve

      showExtensionPopup(AllowedQueryParamPage.dappPermission, {}, () => {
        resolve("Time to move on")
      })
    })

    const result = await permissionPromise

    if (this.#pendingPermissionsRequests[permissionRequest.origin]) {
      // Just in case this is a different promise, go ahead and resolve it with
      // the same result.
      this.#pendingPermissionsRequests[permissionRequest.origin](result)
      delete this.#pendingPermissionsRequests[permissionRequest.origin]
    }

    return result
  }

  async grantPermission(permission: PermissionRequest): Promise<void> {
    // FIXME proper error handling if this happens - should not tho
    if (permission.state !== "allow" || !permission.accountAddress) return

    await this.db.setPermission(permission)

    this.#pendingPermissionsRequests[permission.origin]?.(permission)
  }

  async denyOrRevokePermission(permission: DeniedPermission): Promise<void> {
    // Delete the rows of the account the permission belongs to, which isn't
    // necessarily the selected one: connected sites can be revoked for any
    // account from settings.
    const deleted = await this.db.deletePermission(
      permission.origin,
      permission.accountAddress,
      permission.chainID,
    )

    this.#pendingPermissionsRequests[permission.origin]?.("Time to move on")

    const { address: selectedAddress } =
      await this.preferenceService.getSelectedAccount()

    // Sites only ever see the selected account, so revoking another account's
    // permission changes nothing they can observe. Leave their current
    // network and accounts alone in that case.
    if (!sameEVMAddress(permission.accountAddress, selectedAddress)) {
      return
    }

    // If the removed permission is for the origin's current network, clear
    // that state so the origin isn't stuck on a disconnected network.
    this.internalEthereumProviderService.unsetCurrentNetworkForOrigin(
      permission.origin,
      permission.chainID,
    )

    if (deleted > 0) {
      this.notifyContentScriptsAboutAddressChange()
    }
  }

  async revokePermissionsForAddress(revokeAddress: string): Promise<void> {
    await this.db.deletePermissionByAddress(revokeAddress)
    this.notifyContentScriptsAboutAddressChange()
  }

  async revokePermissionsForOrigin(origin: string): Promise<void> {
    const deleted = await this.db.deletePermissionsByOrigin(origin)
    if (deleted > 0) {
      this.notifyContentScriptsAboutAddressChange()
    }
    this.emitter.emit("revokePermissionsForOrigin", origin)
  }

  async checkPermission(
    origin: string,
    chainID: string,
  ): Promise<PermissionRequest | undefined> {
    const { address: selectedAddress } =
      await this.preferenceService.getSelectedAccount()
    const currentAddress = selectedAddress
    // TODO make this multi-network friendly
    return this.db.checkPermission(origin, currentAddress, chainID)
  }

  /**
   * Rejects with 4100 (unauthorized), without switching or granting anything,
   * when `origin` has no allowed permission for the selected account on
   * `network`. 4902 is left for chains Taho doesn't know.
   */
  private async assertPermittedOnNetwork(
    origin: string,
    network: EVMNetwork,
  ): Promise<void> {
    const permission = await this.checkPermission(origin, network.chainID)

    if (permission?.state !== "allow") {
      throw new EIP1193Error(EIP1193_ERROR_CODES.unauthorized)
    }
  }

  async revokePermissionsForChain(chainId: string): Promise<void> {
    await this.db.deletePermissionsByChain(chainId)
  }

  /**
   * Generates a hash for a signing request based on origin, method, and params.
   * Used to detect duplicate requests from dapps.
   */
  private static getSigningRequestHash(
    origin: string,
    method: string,
    params: unknown[],
  ): string {
    return `${origin}:${method}:${JSON.stringify(params)}`
  }

  /**
   * Checks if a duplicate signing request is pending. If so, returns the
   * existing promise so the duplicate can await the same outcome.
   *
   * @returns The existing promise if a duplicate is found, or undefined if this
   *          is a new request.
   */
  private getPendingSigningRequest(hash: string): Promise<unknown> | undefined {
    const existing = this.#pendingSigningRequests.get(hash)

    if (existing) {
      logger.info(
        "Duplicate signing request detected - sharing outcome with original:",
        hash.substring(0, 100),
      )
      return existing.promise
    }

    return undefined
  }

  /**
   * Registers a new signing request in the pending map.
   */
  private registerPendingSigningRequest(
    hash: string,
    promise: Promise<unknown>,
  ): void {
    this.#pendingSigningRequests.set(hash, {
      timestamp: Date.now(),
      promise,
    })
  }

  /**
   * Clears a signing request from the pending map after it completes.
   */
  private clearPendingSigningRequest(hash: string): void {
    this.#pendingSigningRequests.delete(hash)
  }

  async routeSafeRequest(
    method: string,
    params: unknown[],
    origin: string,
    popupPromise: Promise<browser.Windows.Window>,
  ): Promise<unknown> {
    const requestHash = ProviderBridgeService.getSigningRequestHash(
      origin,
      method,
      params,
    )

    // Check for an existing request with the same hash
    const existingRequest = this.getPendingSigningRequest(requestHash)
    if (existingRequest) {
      // Close the popup for the duplicate request since it will share
      // the outcome of the original
      const popup = await popupPromise
      if (typeof popup.id !== "undefined") {
        browser.windows.remove(popup.id)
      }
      // Return the same promise as the original request
      return existingRequest
    }

    // Create the signing request promise
    const signingPromise = (async () => {
      try {
        const result =
          await this.internalEthereumProviderService.routeSafeRPCRequest(
            method,
            params,
            origin,
          )
        return result
      } finally {
        this.clearPendingSigningRequest(requestHash)
        // Close the popup once we're done
        const popup = await popupPromise
        if (typeof popup.id !== "undefined") {
          browser.windows.remove(popup.id)
        }
      }
    })()

    // Register this request before awaiting so duplicates can find it
    this.registerPendingSigningRequest(requestHash, signingPromise)

    return signingPromise
  }

  async routeContentScriptRPCRequest(
    enablingPermission: PermissionRequest,
    method: string,
    rawParams: RPCRequest["params"],
    origin: string,
  ): Promise<unknown> {
    if (!this.isSupportedRPCMethod(method)) {
      return EIP1193_ERROR_CODES.unsupportedMethod
    }

    const params = parseRPCRequestParams(enablingPermission, method, rawParams)

    try {
      if (this.isOwnRPCMethod(method)) {
        return await this.ownRPCHandlers[method](origin, enablingPermission)
      }

      if (this.isPermittedRPCMethod(method)) {
        return await this.permittedRPCHandlers[method](
          params,
          origin,
          enablingPermission,
        )
      }

      return await this.internalEthereumProviderService.routeSafeRPCRequest(
        method,
        params,
        origin,
      )
    } catch (error) {
      logger.error("Error processing request", error)
      return handleRPCErrorResponse(error)
    }
  }

  private isOwnRPCMethod(
    method: string,
  ): method is keyof ProviderBridgeService["ownRPCHandlers"] {
    return Object.hasOwn(this.ownRPCHandlers, method)
  }

  private isPermittedRPCMethod(
    method: string,
  ): method is keyof ProviderBridgeService["permittedRPCHandlers"] {
    return Object.hasOwn(this.permittedRPCHandlers, method)
  }

  private isSupportedRPCMethod(method: string): boolean {
    return (
      this.isOwnRPCMethod(method) ||
      this.isPermittedRPCMethod(method) ||
      this.internalEthereumProviderService.isSupportedRPCMethod(method)
    )
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

  async connectPort(port: Runtime.Port) {
    if (port.name === EXTERNAL_PORT_NAME && port.sender?.url) {
      port.onMessage.addListener((event) => {
        if (
          !event ||
          typeof event !== "object" ||
          !("id" in event) ||
          typeof event.id !== "string" ||
          !("request" in event) ||
          typeof event.request !== "object"
        ) {
          logger.error("Unexpected event on port", event)
          return
        }

        this.onMessageListener(
          port as Required<browser.Runtime.Port>,
          event as PortRequestEvent,
        )
      })
      port.onDisconnect.addListener(() => {
        this.openPorts = this.openPorts.filter((openPort) => openPort !== port)
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
  }
}
