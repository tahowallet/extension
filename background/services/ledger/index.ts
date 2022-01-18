// import browser, { Runtime } from "webextension-polyfill"
// import { TransactionRequest as EthersTransactionRequest } from "@ethersproject/abstract-provider"
// import {
//   EXTERNAL_PORT_NAME,
//   PermissionRequest,
//   AllowedQueryParamPage,
//   AllowedQueryParamPageType,
//   PortRequestEvent,
//   PortResponseEvent,
//   EIP1193Error,
//   RPCRequest,
//   EIP1193_ERROR_CODES,
//   isTallyConfigPayload,
// } from "@tallyho/provider-bridge-shared"
import BaseService from "../base"
// import InternalEthereumProviderService from "../internal-ethereum-provider"
// import { getOrCreateDB, ProviderBridgeServiceDatabase } from "./db"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
// import PreferenceService from "../preferences"
// import logger from "../../lib/logger"

type Events = ServiceLifecycleEvents

/**
 * The LedgerService is responsible for
 *
 * The main purpose for this service/layer is
 *
 * The responsibility of this service is 2 fold.
 * - xxx
 */
export default class LedgerService extends BaseService<Events> {
  static create: ServiceCreatorFunction<
    Events,
    LedgerService,
    [] // we don't know our final dependencies
  > = async () => {
    return new this()
  }

  private constructor() {
    super()
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService() // Not needed, but better to stick to the patterns

    // this.emitter.emit(
    //   "initializeAllowedPages",
    //   await this.db.getAllPermission()
    // )
  }
}
