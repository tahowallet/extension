import {
  ChainService,
  ServiceCreatorFunction,
  ServiceLifecycleEvents,
} from ".."
import { ETHEREUM } from "../../constants"
import BaseService from "../base"
import { getOrCreateDB, InternalEthereumProviderDatabase } from "./db"

type Events = ServiceLifecycleEvents & {
  accountAccessRequestedByDAppID: string
}

export default class InternalEthereumProviderService extends BaseService<Events> {
  /**
   * Tracks pending account requests by id and the function that can be used to
   * respond to them when a response is provided via
   * `respondToPendingAccountRequest`.
   */
  #pendingAccountRequests: {
    [dAppID: string]: (grantedAccounts: string[]) => void
  } = {}

  static create: ServiceCreatorFunction<
    ServiceLifecycleEvents,
    InternalEthereumProviderService,
    [Promise<ChainService>]
  > = async (chainService) => {
    return new this(await getOrCreateDB(), await chainService)
  }

  private constructor(
    private db: InternalEthereumProviderDatabase,
    private chainService: ChainService
  ) {
    super()
  }

  async send(
    dAppID: string,
    method: string,
    params: unknown[]
  ): Promise<unknown> {
    switch (method) {
      case "eth_requestAccounts":
        return this.requestAccountAccess(dAppID)
      case "eth_accounts":
        return {
          result: {},
        }
      default:
        return this.chainService.sendEthereumProvider(method, params)
    }
  }

  async requestAccountAccess(dAppID: string): Promise<string[]> {
    const existingPermissions = await this.db.getDAppPermissions(dAppID)

    if (typeof existingPermissions !== "undefined") {
      return Promise.resolve(existingPermissions.allowedAccounts)
    }

    const requestPromise = new Promise<string[]>((resolve, reject) => {
      this.#pendingAccountRequests[dAppID] = (result) => {
        this.db.setDAppPermissions(dAppID, {
          allowedAccounts: result,
        }).then(() => resolve(result)).catch(reject)
      }
    })

    this.emitter.emit("accountAccessRequestedByDAppID", dAppID)
    return requestPromise
  }
