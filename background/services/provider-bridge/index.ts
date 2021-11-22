import browser from "webextension-polyfill"
import {
  ChainService,
  ServiceCreatorFunction,
  ServiceLifecycleEvents,
} from ".."
import logger from "../../lib/logger"
import BaseService from "../base"

type Events = ServiceLifecycleEvents & {
  // connect
  // disconnet
  // account change
  // networkchange
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
  static create: ServiceCreatorFunction<
    ServiceLifecycleEvents,
    ProviderBridgeService,
    [Promise<ChainService>]
  > = async (chainService) => {
    return new this(await chainService)
  }

  private constructor(private chainService: ChainService) {
    super()

    browser.runtime.onConnect.addListener(async (port) => {
      port.onMessage.addListener(async (event) => {
        logger.log(
          `background: request payload: ${JSON.stringify(event.payload)}`
        )
        const response = {
          id: event.id,
          payload: await this.router(
            event.payload.method,
            event.payload.params
          ),
        }
        logger.log("background response:", response)

        port.postMessage(response)
      })
    })
  }

  async router(method: string, params?: Array<unknown>): Promise<unknown> {
    switch (method) {
      case "---------------------------- important + mocked methods ----":
      case "eth_accounts": // !-eth_accounts
      case "eth_requestAccounts": // !eth_requestAccounts
        return this.chainService.getAccountsToTrack().then(([account]) => {
          return { result: [account.address] }
        })
      case "net_version": // !+net_version,
      case "eth_chainId": // !eth_chainId
        return Promise.resolve({ result: "0x1" })
      case "eth_getBalance": // !eth_getBalance
        return Promise.resolve({ result: "0x8ef30df72da000" })
      case "eth_call":
        return Promise.resolve({
          result:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
        })
      case "eth_blockNumber":
        return Promise.resolve({ result: "0xcf5fef" })

      case "---------------------------- important MM and eip1193-bridge methods ---":
      case "!eth_getTransactionByHash":
      case "!eth_getTransactionCount":
      case "!eth_getTransactionReceipt":
      case "!eth_sendTransaction":
      case "---------------------------- important MM only methods ---":
      case "!+eth_estimateGas,":
      case "!+metamask_getProviderState, ":
      case "!+metamask_sendDomainMetadata":
      case "!+wallet_switchEthereumChain ":
      case "!+metamask_accountsChanged":
      case "!+wallet_requestPermissions":
      case "---------------------------- MM and eip1193-bridge common methods ---":
      case "eth_gasPrice":
      case "eth_getBlockByHash":
      case "eth_getBlockByNumber":
      case "eth_getBlockTransactionCountByHash":
      case "eth_getBlockTransactionCountByNumber":
      case "eth_getCode":
      case "eth_getFilterChanges":
      case "eth_getFilterLogs":
      case "eth_getLogs":
      case "eth_getStorageAt":
      case "eth_getTransactionByBlockHashAndIndex":
      case "eth_getTransactionByBlockNumberAndIndex":
      case "eth_getUncleByBlockHashAndIndex":
      case "eth_getUncleByBlockNumberAndIndex":
      case "eth_getUncleCountByBlockHash":
      case "eth_getUncleCountByBlockNumber":
      case "eth_newBlockFilter":
      case "eth_newFilter":
      case "eth_newPendingTransactionFilter":
      case "eth_sendRawTransaction":
      case "eth_sign":
      case "eth_uninstallFilter":
      case "---------------------------- eip1193-bridge only methods ---":
      case "-estimateGas":
      case "---------------------------- mm only methods ---":
      case "+eth_coinbase":
      case "+eth_decrypt":
      case "+eth_feeHistory":
      case "+eth_getEncryptionPublicKey":
      case "+eth_getProof":
      case "+eth_getWork":
      case "+eth_hashrate":
      case "+eth_mining":
      case "+eth_protocolVersion":
      case "+eth_signTypedData":
      case "+eth_signTypedData_v1":
      case "+eth_signTypedData_v3":
      case "+eth_signTypedData_v4":
      case "+eth_submitHashrate":
      case "+eth_submitWork":
      case "+eth_syncing":
      case "+metamask_watchAsset":
      case "+net_listening":
      case "+net_peerCount":
      case "+personal_ecRecover":
      case "+personal_sign":
      case "+wallet_watchAsset":
      case "+web3_clientVersion":
      case "+web3_sha3":
      case "+metamask_build_type":
      case "+metamask_chainchanged":
      case "+metamask_controller_events":
      case "+metamask_debug":
      case "+metamask_env":
      case "+metamask_environment":
      case "+metamask_fee":
      case "+metamask_io":
      case "+metamask_logweb3shimusage":
      case "+metamask_notifier":
      case "+metamask_state":
      case "+metamask_stream_failure":
      case "+metamask_tab_ids":
      case "+metamask_unlockstatechanged":
      case "+metamask_version":
      case "+metamask_watchasset":
      case "+wallet__actions":
      case "+wallet__details":
      case "+wallet__highlighted":
      case "+wallet__list":
      case "+wallet_addethereumchain":
      case "+wallet_default_hd_path":
      case "+wallet_getpermissions":
      case "+wallet_registeronboarding":
      case "+wallet_route":
      case "+wallet_type":
      case "---------------------------- mm docs only methods https://metamask.github.io/api-playground/api-documentation/ ---":
      case "+?eth_getRawTransactionByHash":
      case "+?eth_getRawTransactionByBlockHashAndIndex":
      case "+?eth_getRawTransactionByBlockNumberAndIndex":
      case "+?eth_pendingTransactions":
      default:
        break
    }

    const e = new Error(`unsupported method: ${method}`)
    e.name = "UNSUPPORTED_OPERATION"
    e.stack = JSON.stringify({ method, params }, null, 2)
    throw e
  }
}
